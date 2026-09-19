import axios from 'axios';
import { localStore } from './store.service';
import { KnowledgeService } from './knowledge.service';
import { BillingService } from './billing.service';
import { prisma } from '@omni/database';
import { skillRegistry } from '../skills';

export interface ChatContextMessage {
  senderType: 'AGENT' | 'CUSTOMER' | 'CONTACT';
  senderName?: string;
  content: string;
}

export class GeminiService {
  /**
   * Cleans text to feel 100% human on WhatsApp:
   * Strips markdown asterisks (**bold** -> bold), bullet asterisks, and excessive robotic tags.
   */
  public static cleanTextForHumanWhatsApp(text: string): string {
    if (!text) return '';
    let cleaned = text;

    // Remove double asterisks **word** -> word
    cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, '$1');

    // Remove single asterisks *word* -> word
    cleaned = cleaned.replace(/\*([^*]+)\*/g, '$1');

    // Remove markdown headers #, ##, ###
    cleaned = cleaned.replace(/^#{1,6}\s+/gm, '');

    // Convert markdown bullets (* or -) to clean clean dots
    cleaned = cleaned.replace(/^\s*[\*\-]\s+/gm, '• ');

    // Remove any remaining stray asterisks
    cleaned = cleaned.replace(/\*/g, '');

    // Clean multiple consecutive blank lines
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

    return cleaned.trim();
  }

  /**
   * Dedicated testing method for the Knowledge Base Sandbox (Playground).
   * Bypasses WhatsApp and executes the AI pipeline using active RAG Knowledge Base and system prompt.
   */
  public static async testSandboxChat(
    tenantId: string,
    history: ChatContextMessage[],
    systemPromptOverride?: string
  ): Promise<{ reply: string; knowledgeCount: number; latencyMs: number }> {
    const startTime = Date.now();
    const knowledgeItems = localStore.getKnowledgeItems(tenantId);
    const reply = await this.generateSmartReply(
      tenantId,
      history,
      systemPromptOverride ? `\n[تجاوز التوجيه التجريبي]: ${systemPromptOverride}` : undefined
    );
    return {
      reply: this.cleanTextForHumanWhatsApp(reply),
      knowledgeCount: knowledgeItems.length,
      latencyMs: Date.now() - startTime,
    };
  }

  /**
   * Splits a longer response into natural, human-like WhatsApp bubbles (1 to 3 messages).
   */
  public static splitIntoNaturalBubbles(text: string): string[] {
    if (!text) return [];
    const clean = this.cleanTextForHumanWhatsApp(text);

    // Split on double newlines (paragraphs)
    const paragraphs = clean
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    if (paragraphs.length <= 1) {
      // If single block is long (> 260 chars), split by sentences naturally
      if (clean.length > 260) {
        const sentences = clean.match(/[^.!?؟\n]+[.!?؟\n]*/g);
        if (sentences && sentences.length > 1) {
          const chunks: string[] = [];
          let current = '';
          for (const s of sentences) {
            if ((current + ' ' + s).trim().length > 180 && current.length > 0) {
              chunks.push(current.trim());
              current = s;
            } else {
              current = (current + ' ' + s).trim();
            }
          }
          if (current.trim().length > 0) chunks.push(current.trim());
          if (chunks.length > 1) return chunks.slice(0, 3);
        }
      }
      return [clean];
    }

    // Limit to max 3 natural bubbles so it doesn't spam the user
    return paragraphs.slice(0, 3);
  }

  /**
   * Calls OpenRouter API (https://openrouter.ai/api/v1/chat/completions)
   */
  public static async callOpenRouter(
    apiKey: string,
    model: string,
    systemPrompt: string,
    history: ChatContextMessage[],
    userInstruction?: string,
    mediaBase64?: string,
    mediaMimeType?: string,
    tenantId?: string,
    contactPhone?: string
  ): Promise<string> {
    // Billing Guard: Check token balance before calling OpenRouter
    if (tenantId) {
      const check = await BillingService.checkTokenBalance(tenantId);
      if (!check.allowed) {
        console.warn(`[AiService:OpenRouter] ⚠️ Token balance exhausted for tenant ${tenantId}. Balance: ${check.balance}`);
        return 'AI services paused. Please contact support.';
      }
    }

    const messages: any[] = [{ role: 'system', content: systemPrompt }];

    const validHistory = history
      .filter((m) => m.content && !m.content.startsWith('تنبيه:') && !m.content.startsWith('تعذر'))
      .slice(-8);

    for (let i = 0; i < validHistory.length; i++) {
      const msg = validHistory[i];
      const role = msg.senderType === 'CUSTOMER' || msg.senderType === 'CONTACT' ? 'user' : 'assistant';

      if ((msg as any).mediaUrl) {
        messages.push({
          role,
          content: [
            { type: 'text', text: msg.content || 'مرفق وسائط من العميل' },
            { type: 'image_url', image_url: { url: (msg as any).mediaUrl } },
          ],
        });
      } else if (i === validHistory.length - 1 && role === 'user' && mediaBase64 && mediaMimeType) {
        messages.push({
          role,
          content: [
            { type: 'text', text: msg.content || 'يرجى مراجعة هذا المرفق والرد عليه' },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mediaMimeType};base64,${mediaBase64}`,
              },
            },
          ],
        });
      } else {
        messages.push({ role, content: msg.content });
      }
    }

    if (userInstruction) {
      messages.push({
        role: 'user',
        content: `تعليمات إضافية للرد: ${userInstruction}`,
      });
    } else if (messages.length === 1 || messages[messages.length - 1].role !== 'user') {
      messages.push({
        role: 'user',
        content: 'اقترح رداً مناسباً ومختصراً ومرحباً بالعميل',
      });
    }

    const targetModel = model || 'google/gemini-2.5-flash';
    const tools = skillRegistry.getToolsForLLM().map((t) => ({
      type: 'function',
      function: t,
    }));

    const res = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: targetModel,
        messages,
        tools: tools.length > 0 ? tools : undefined,
        temperature: 0.7,
        max_tokens: 300,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'HTTP-Referer': 'http://localhost:3000',
          'X-Title': 'WhatsApp Omni SaaS',
          'Content-Type': 'application/json',
        },
        timeout: 25000,
      }
    );

    const choice = res.data?.choices?.[0];
    const toolCall = choice?.message?.tool_calls?.[0];

    if (toolCall?.function) {
      const fnName = toolCall.function.name;
      let fnArgs = {};
      try {
        fnArgs = JSON.parse(toolCall.function.arguments || '{}');
      } catch {}
      console.log(`[AiService:OpenRouter] ⚡ Tool call detected: "${fnName}"`, fnArgs);

      const contact = tenantId && contactPhone ? localStore.getContactByPhone(tenantId, contactPhone) : undefined;
      const skillRes = await skillRegistry.execute(
        fnName,
        {
          tenantId: tenantId || 'demo-tenant-1',
          conversationId: (history[0] as any)?.conversationId || `conv_${(contactPhone || '').replace(/\D/g, '')}`,
          contactPhone: contactPhone || 'unknown',
          customerName: contact?.name,
          customerPhone: contact?.phoneNumber || contactPhone,
        },
        fnArgs
      );

      if (skillRes.suggestedMessage) {
        const cleanSkillMsg = this.cleanTextForHumanWhatsApp(skillRes.suggestedMessage);
        console.log(`[AiService:OpenRouter] ✅ Skill response:`, cleanSkillMsg.slice(0, 60));
        return cleanSkillMsg;
      }
    }

    const reply = choice?.message?.content;
    const cleanReply = reply ? this.cleanTextForHumanWhatsApp(reply) : 'أهلاً وسهلاً بك، كيف فيني ساعدك؟';
    console.log(`[AiService:OpenRouter] ✅ OpenRouter response:`, cleanReply.slice(0, 60));

    // Token Deduction & Accounting
    if (tenantId) {
      const usage = res.data?.usage;
      const tokensUsed = usage?.total_tokens || Math.ceil((cleanReply.length || 50) / 4) + 80;
      await BillingService.deductTokens(tenantId, tokensUsed, `OpenRouter (${targetModel})`, {
        model: targetModel,
        promptTokens: usage?.prompt_tokens,
        completionTokens: usage?.completion_tokens,
      });
    }

    return cleanReply;
  }

  /**
   * Generates a smart contextual reply suggestion using Google Gemini or OpenRouter.
   * Supports Multimodal audio voice notes and photos directly!
   */
  public static async generateSmartReply(
    tenantId: string,
    history: ChatContextMessage[],
    userInstruction?: string,
    mediaBase64?: string,
    mediaMimeType?: string,
    contactPhone?: string
  ): Promise<string> {
    const settings = localStore.getSettings(tenantId);
    const geminiKey = settings.geminiApiKey || process.env.GEMINI_API_KEY;
    const openrouterKey = settings.openrouterApiKey || process.env.OPENROUTER_API_KEY;

    if (!geminiKey && !openrouterKey) {
      console.warn('[AiService] Neither Gemini nor OpenRouter API key provided');
      return 'تنبيه: يرجى إضافة مفتاح API (Google Gemini أو OpenRouter) في تبويب الإعدادات لتفعيل الذكاء الاصطناعي.';
    }

    const basePrompt =
      settings.geminiSystemPrompt ||
      'أنت موظف خدمة عملاء ودود وبشري للرد على استفسارات العملاء عبر الواتساب.';

    // Dialect Mapping
    const dialectMap: Record<string, string> = {
      modern_standard: 'اللهجة: تحدث باللغة العربية الفصحى المعاصرة، الواضحة والأنيقة وسهلة الفهم.',
      syrian: 'اللهجة: تحدث باللهجة السورية / الشامية اللطيفة والعفوية (مثل: أهلاً وسهلاً، تكرم عينك، ع راسي، شو الأخبار، من عيوني، تفضل..).',
      saudi: 'اللهجة: تحدث باللهجة السعودية / الخليجية الأصيلة والمرحبة (مثل: يا هلا والله، حياك الله، أبشر، سم، من عيوني، طال عمرك، وش تحب نخدمك فيه..).',
      egyptian: 'اللهجة: تحدث باللهجة المصرية الودودة والبسيطة (مثل: أهلاً بيك يا فندم، منور، تحت أمرك، أي خدمة، تمام قوي..).',
      iraqi: 'اللهجة: تحدث باللهجة العراقية الودية المحببة (مثل: هلا بيك، تدلل، ع راسي، شكو ماكو، أمرك..).',
      custom: settings.customDialectPrompt
        ? `اللهجة المخصصة: ${settings.customDialectPrompt}`
        : 'اللهجة: لهجة عربية بيضاء طبيعية ومفهومة للجميع.',
    };

    // Tone Mapping
    const toneMap: Record<string, string> = {
      friendly: 'النبرة والشعور: ودود جداً، دافئ، بشوش، ترحيبي ولطيف لأقصى درجة، مع استخدام إيموجي لطيف باعتدال (😊، ✨، 🌸).',
      formal: 'النبرة والشعور: رسمي، مهني وجاد، دقيق ومحترم دون استخدام إيموجي مفرط.',
      sales: 'النبرة والشعور: حماسي ومقنع، يبرز مميزات المنتجات والخدمات بلباقة ويشجع العميل بلطف على اتخاذ القرار.',
      concise: 'النبرة والشعور: مختصر جداً ومباشر، يجيب بدقة ونقاط محددة دون مقدمات طويلة.',
      empathetic: 'النبرة والشعور: صبور ومتعاطف لأقصى حد، يستمع لمشاكل العميل برحابة صدر، ويعتذر بلطف عن أي تقصير.',
    };

    const dialectInstruction = dialectMap[settings.dialect || 'syrian'] || dialectMap.syrian;
    const toneInstruction = toneMap[settings.tone || 'friendly'] || toneMap.friendly;

    // Strict Human Chat Rules
    const humanStyleRules =
      `\n\n--- قواعد الرد البشري والمحادثة على الواتساب (إلزامية جداً) ---\n` +
      `1. تحدث كإنسان حقيقي يدردش على الواتساب، وليس كروبوت أو نموذج ذكاء اصطناعي.\n` +
      `2. ممنوع منعاً باتاً وضع علامات النجوم (**) أو (*) في النص إطلاقاً! اكتب الكلمات عادية بدون أي نجوم حتى تبدو طبيعية تماماً.\n` +
      `3. اجعل رسائلك قصيرة ومريحة للقراءة (من 1 إلى 3 جُمل فقط). تجنب المقالات والفقرات الطويلة المملة.\n` +
      `4. لا تضع أي مقدمات آلية مثل (بناءً على طلبك، عزيزي العميل، بصفتي مساعد ذكي..).\n` +
      `5. إذا احتوت الإجابة على أكثر من فكرة، افصل بينها بسطر فارغ لتظهر كرسائل متتابعة.\n` +
      `${dialectInstruction}\n` +
      `${toneInstruction}\n`;

    // Persistent Customer Memory across sessions
    let memoryContext = '';
    if (settings.userMemoryEnabled !== false && contactPhone) {
      const contact = localStore.getContactByPhone(tenantId, contactPhone);
      if (contact) {
        const facts = contact.memoryFacts || [];
        const notes = contact.notes;
        const hasCustomName = contact.name && contact.name !== contact.phoneNumber;
        if (facts.length > 0 || notes || hasCustomName) {
          memoryContext =
            `\n\n--- 🧠 ذاكرة العميل الدائمة عبر الجلسات (Durable Customer Memory) ---\n` +
            `هذا العميل تواصل معنا سابقاً؛ وتفاصيله المثبتة في قاعدة بياناتنا هي:\n` +
            (hasCustomName ? `- الاسم المفضل للعميل: ${contact.name}\n` : '') +
            `- رقم الهاتف: ${contact.phoneNumber}\n` +
            (notes ? `- ملاحظات هامة عن العميل: ${notes}\n` : '') +
            (facts.length > 0 ? `- حقائق وتفضيلات مثبتة عن هذا العميل:\n  * ${facts.join('\n  * ')}\n` : '') +
            `توجيه الذاكرة: ${settings.userMemoryPrompt || 'خاطب العميل بتفاصيله وتفضيلاته لتشعر العميل بالاهتمام الشخصي والاستمرارية حتى لو عاد بعد شهور طويلة.'}\n`;
        }
      }
    }

    // Safety Guardrails (حواجز الأمان وقواعد عدم المخالفة الصارمة)
    let safetyContext = '';
    if (settings.safetyGuardrails) {
      safetyContext =
        `\n\n--- 🛡️ حواجز الأمان وقواعد عدم المخالفة الصارمة (Strict Safety Guardrails) ---\n` +
        `قواعد صارمة لا يجوز لك مخالفتها أبداً:\n` +
        `${settings.safetyGuardrails}\n`;
    }

    // Error Recovery (استعادة الأخطاء والتعامل مع الصعوبات التقنية)
    let errorRecoveryContext = '';
    if (settings.errorRecovery) {
      errorRecoveryContext =
        `\n\n--- ⚠️ بروتوكول التعامل مع الأخطاء والصعوبات التقنية (Error Recovery) ---\n` +
        `${settings.errorRecovery}\n`;
    }

    // Escalation Rules (قواعد وشروط التصعيد للدعم البشري / المدرب)
    let escalationContext = '';
    if (settings.escalationEnabled !== false && settings.escalationRules) {
      escalationContext =
        `\n\n--- 🚨 قواعد وشروط التصعيد للدعم البشري / المدرب (Escalation Protocol) ---\n` +
        `${settings.escalationRules}\n` +
        (settings.escalationPreActions ? `الإجراءات والخطوات قبل التسليم: ${settings.escalationPreActions}\n` : '') +
        `توجيه هام: إذا انطبقت أي من حالات التصعيد أعلاه (طلب شخص بشري، الرغبة في الدفع أو طلب تفاصيل الدفع، مواضيع حساسة أو استرجاع، تعثر الحل مرتين، أو تكرار الشكوى)، اعرض بلطف تحويل المحادثة للمدرب مع تلخيص واضح لسؤال المستخدم وسياق المحادثة.\n`;
    }

    const knowledgeContext = KnowledgeService.getKnowledgeContext(tenantId);
    const skillsContext =
      `\n\n--- 🧩 المهارات والأدوات الذكية المتاحة (Active Agentic Skills) ---\n` +
      skillRegistry.getCombinedSystemPrompts() +
      `\nتوجيه حاسم: إذا أبدى العميل نية دفع أو اعتراض على السعر أو رغبة باجتماع أو غضب أو رغبة بشراء، استخدم الأداة المناسبة فوراً.\n`;

    // Multimodal Vision Understanding Instructions
    const visionContext =
      `\n\n--- 👁️ قدرات فهم الصور واستقبال الوسائط (Multimodal Vision Engine) ---\n` +
      `إذا أرسل العميل صورة أو مستنداً مرئياً، انظر إليها وحللها بدقة:\n` +
      `1. إذا كانت الصورة إيصال تحويل بنكي أو سداد (Bank Transfer Receipt): اقرأ المبلغ بالريال، اسم البنك، اسم المحول، والرقم المرجعي، وأكد استلام الحوالة فوراً بلطف وتطمين.\n` +
      `2. إذا كانت صورة منتج أو سلعة يسأل عنها العميل: تعرف على المنتج والموديل وطابقه مع قاعدة المعرفة وأخبر العميل بمواصفاته وتوفره وسعره.\n` +
      `3. إذا كانت لقطة شاشة لخطأ تقني أو استفسار: افحص محتوى الشاشة وقدم حلاً مباشراً وواضحاً.\n` +
      `4. إذا طلب العميل رؤية بروشور الباقات أو باركود الدفع أو صور المنتجات: استدعِ أداة media_dispatcher أو أرفق رابط الصورة بالصيغة: [MEDIA:الرابط] مع النص الترحيبي.\n`;

    const systemPrompt =
      basePrompt +
      humanStyleRules +
      safetyContext +
      errorRecoveryContext +
      escalationContext +
      memoryContext +
      knowledgeContext +
      skillsContext +
      visionContext;

    // Route to OpenRouter if selected as primary provider
    if (settings.aiProvider === 'openrouter' && openrouterKey) {
      try {
        const orModel = settings.openrouterModel || 'google/gemini-2.5-flash';
        return await this.callOpenRouter(
          openrouterKey,
          orModel,
          systemPrompt,
          history,
          userInstruction,
          mediaBase64,
          mediaMimeType,
          tenantId,
          contactPhone
        );
      } catch (orErr: any) {
        console.warn('[AiService] OpenRouter failed, attempting fallback to Gemini direct if key exists...', orErr.message);
        if (!geminiKey) {
          throw new Error(`خطأ OpenRouter: ${orErr.response?.data?.error?.message || orErr.message}`);
        }
      }
    }

    // Format conversation turns for Gemini
    const contents: any[] = [];

    // Filter out internal notification or placeholder texts
    const validHistory = history
      .filter((m) => m.content && !m.content.startsWith('تنبيه:') && !m.content.startsWith('تعذر'))
      .slice(-8);

    for (let i = 0; i < validHistory.length; i++) {
      const msg = validHistory[i];
      const role = msg.senderType === 'CUSTOMER' || msg.senderType === 'CONTACT' ? 'user' : 'model';
      let textContent = msg.content;
      if (i === validHistory.length - 1 && role === 'user' && mediaBase64 && mediaMimeType) {
        if (!textContent || textContent.includes('📷 صورة')) {
          textContent = 'انظر لهذه الصورة التي أرسلتها لك بعناية فائقة وافحص محتواها (إيصال تحويل بنكي، صورة منتج، لقطة شاشة، إلخ) وأجبني بدقة واحترافية وبنفس اللهجة كإنسان ودود.';
        }
      }
      const parts: any[] = [{ text: textContent }];

      // If this is the last turn and we have multimodal media
      if (i === validHistory.length - 1 && role === 'user' && mediaBase64 && mediaMimeType) {
        parts.unshift({
          inlineData: {
            mimeType: mediaMimeType,
            data: mediaBase64,
          },
        });
      }

      contents.push({ role, parts });
    }

    // Handle single multimodal message without history
    if (contents.length === 0 && mediaBase64 && mediaMimeType) {
      const promptText = mediaMimeType.startsWith('audio/')
        ? 'استمع لهذا التسجيل الصوتي الذي أرسله العميل بعناية وافهمه، ثم أجب عليه بدقة وبنفس اللهجة وبشكل مختصر وطبيعي كإنسان.'
        : 'انظر لهذه الصورة التي أرسلها العميل بعناية، ثم أجب على استفساره بدقة وبنفس اللهجة كإنسان.';

      contents.push({
        role: 'user',
        parts: [
          {
            inlineData: {
              mimeType: mediaMimeType,
              data: mediaBase64,
            },
          },
          { text: promptText },
        ],
      });
    }

    if (userInstruction) {
      contents.push({
        role: 'user',
        parts: [{ text: `تعليمات إضافية للرد: ${userInstruction}` }],
      });
    } else if (contents.length === 0 || contents[contents.length - 1].role !== 'user') {
      contents.push({
        role: 'user',
        parts: [{ text: 'اقترح رداً مناسباً ومختصراً ومرحباً بالعميل' }],
      });
    }

    let model = settings.geminiModel || 'gemini-2.5-flash';
    if (model.includes('2.0')) {
      model = 'gemini-2.5-flash';
    }

    const geminiTools = [
      {
        functionDeclarations: skillRegistry.getToolsForLLM(),
      },
    ];

    const requestPayload: any = {
      contents,
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
      tools: geminiTools,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 250,
      },
    };

    console.log(`[GeminiService] 🤖 Calling Gemini model: ${model} with ${contents.length} turns (Multimodal: ${!!mediaBase64})...`);

    try {
      if (!geminiKey) throw new Error('No Gemini API key available');
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;
      const res = await axios.post(url, requestPayload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 20000,
      });

      const candidate = res.data?.candidates?.[0];
      const functionCallPart = candidate?.content?.parts?.find((p: any) => p.functionCall);

      if (functionCallPart?.functionCall) {
        const fnName = functionCallPart.functionCall.name;
        const fnArgs = functionCallPart.functionCall.args || {};
        console.log(`[GeminiService] ⚡ Model invoked Skill Tool: "${fnName}" with args:`, fnArgs);

        const contact = localStore.getContactByPhone(tenantId, contactPhone || '');
        const skillResult = await skillRegistry.execute(
          fnName,
          {
            tenantId,
            conversationId: (history[0] as any)?.conversationId || `conv_${(contactPhone || '').replace(/\D/g, '')}`,
            contactPhone: contactPhone || 'unknown',
            customerName: contact?.name,
            customerPhone: contact?.phoneNumber || contactPhone,
          },
          fnArgs
        );

        if (skillResult.suggestedMessage) {
          const cleanSkillMsg = this.cleanTextForHumanWhatsApp(skillResult.suggestedMessage);
          console.log(`[GeminiService] ✅ Skill generated response:`, cleanSkillMsg.slice(0, 60));
          return cleanSkillMsg;
        }
      }

      const reply = candidate?.content?.parts?.find((p: any) => p.text)?.text;
      const cleanReply = reply ? this.cleanTextForHumanWhatsApp(reply) : 'أهلاً وسهلاً بك، كيف فيني ساعدك اليوم؟';
      console.log(`[GeminiService] ✅ Gemini response generated:`, cleanReply.slice(0, 60));
      return cleanReply;
    } catch (err: any) {
      console.warn(`[GeminiService] Primary model ${model} error (${err.response?.status || err.message})...`);

      // 1. Try OpenRouter if key is available
      if (openrouterKey) {
        console.log(`[GeminiService] 🔄 Falling back to OpenRouter (${settings.openrouterModel || 'google/gemini-2.5-flash'})...`);
        try {
          return await this.callOpenRouter(
            openrouterKey,
            settings.openrouterModel || 'google/gemini-2.5-flash',
            systemPrompt,
            history,
            userInstruction,
            mediaBase64,
            mediaMimeType,
            tenantId,
            contactPhone
          );
        } catch (orFallbackErr: any) {
          console.warn('[GeminiService] OpenRouter fallback also failed:', orFallbackErr.message);
        }
      }

      // 2. Try Gemini fallback to gemini-2.5-flash
      if (geminiKey) {
        try {
          const fallbackUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`;
          const fallbackRes = await axios.post(fallbackUrl, requestPayload, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 20000,
          });

          const fbCandidate = fallbackRes.data?.candidates?.[0];
          const fbFnPart = fbCandidate?.content?.parts?.find((p: any) => p.functionCall);
          if (fbFnPart?.functionCall) {
            const fnName = fbFnPart.functionCall.name;
            const fnArgs = fbFnPart.functionCall.args || {};
            const contact = localStore.getContactByPhone(tenantId, contactPhone || '');
            const skillResult = await skillRegistry.execute(
              fnName,
              {
                tenantId,
                conversationId: (history[0] as any)?.conversationId || `conv_${(contactPhone || '').replace(/\D/g, '')}`,
                contactPhone: contactPhone || 'unknown',
                customerName: contact?.name,
                customerPhone: contact?.phoneNumber || contactPhone,
              },
              fnArgs
            );
            if (skillResult.suggestedMessage) {
              const cleanSkillMsg = this.cleanTextForHumanWhatsApp(skillResult.suggestedMessage);
              console.log(`[GeminiService] ✅ Fallback skill response:`, cleanSkillMsg.slice(0, 60));
              return cleanSkillMsg;
            }
          }

          const reply = fbCandidate?.content?.parts?.find((p: any) => p.text)?.text;
          const cleanReply = reply ? this.cleanTextForHumanWhatsApp(reply) : 'أهلاً وسهلاً فيك! تكرم عينك.';
          console.log(`[GeminiService] ✅ Gemini fallback response:`, cleanReply.slice(0, 60));
          return cleanReply;
        } catch (fallbackErr: any) {
          const msg = fallbackErr.response?.data?.error?.message || fallbackErr.message;
          console.error('[GeminiService] Gemini fallback error:', msg);
          return `تعذر الاتصال بمزود الذكاء الاصطناعي: ${msg}`;
        }
      }

      return 'تعذر الاتصال بمزود الذكاء الاصطناعي.';
    }
  }

  /**
   * Background Memory Learner: Extracts durable facts from customer messages
   * and saves them permanently in the database so the user is remembered even after 3-4 months.
   */
  public static async extractAndSaveMemoryFacts(
    tenantId: string,
    contactPhone: string,
    history: ChatContextMessage[]
  ): Promise<void> {
    try {
      const settings = localStore.getSettings(tenantId);
      if (settings.userMemoryEnabled === false) return;

      const customerMessages = history
        .filter((m) => m.senderType === 'CUSTOMER' || m.senderType === 'CONTACT')
        .slice(-6);

      if (customerMessages.length === 0) return;

      const lastCustomerText = customerMessages.map((m) => m.content).join('\n');
      if (lastCustomerText.length < 4) return;

      const contact = localStore.getContactByPhone(tenantId, contactPhone);
      const existingFacts = contact?.memoryFacts || [];

      const prompt = `أنت محرك استخراج وحفظ ذاكرة العميل. مهمتك استخراج أي حقائق أو معلومات دائمة ذكرها العميل عن نفسه في رسائله الأخيرة لمساعدتنا على تذكره وتخصيص الخدمة له في المستقبل، حتى لو غاب لعدة أشهر.

قواعد التذكر المطلوبة من الإدارة:
"""
${settings.userMemoryPrompt || 'Remember durable, useful facts about this user: name, location, preferences, communication style, recurring needs. Do not save passwords or sensitive data.'}
"""

الحقائق المحفوظة مسبقاً لهذا العميل:
${existingFacts.length > 0 ? existingFacts.map((f) => `- ${f}`).join('\n') : 'لا يوجد حقائق سابقة'}

رسائل العميل الأخيرة:
"""
${lastCustomerText}
"""

التعليمات:
1. إذا ذكر العميل اسمه (مثلاً: أنا اسمي فلان، معك رامي، ناديني أبو أحمد)، استخرج بنداً يبدأ بـ: - الاسم: [الاسم]
2. إذا ذكر مدينته، تفضيلاته، نوع عمله، أسلوب الشحن أو المنتجات المفضلة التي يكررها، استخرج بنداً يبدأ بـ: - [الحقيقة]
3. لا تكرر أي حقيقة موجودة مسبقاً في القائمة أعلاه.
4. إذا لم يذكر أي حقيقة دائمة جديدة ومفيدة، اكتب حصراً: لا يوجد`;

      const geminiKey = settings.geminiApiKey || process.env.GEMINI_API_KEY;
      const openrouterKey = settings.openrouterApiKey || process.env.OPENROUTER_API_KEY;
      if (!geminiKey && !openrouterKey) return;

      let responseText = '';
      if (settings.aiProvider === 'openrouter' && openrouterKey) {
        try {
          responseText = await this.callOpenRouter(
            openrouterKey,
            'google/gemini-2.5-flash',
            'أنت محلل استخراج ذاكرة دقيق ومختصر.',
            [{ senderType: 'CUSTOMER', content: prompt }],
            undefined,
            undefined,
            undefined,
            tenantId
          );
        } catch {
          // fallback to Gemini direct if exists
        }
      }

      if (!responseText && geminiKey) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`;
          const res = await axios.post(
            url,
            {
              contents: [{ role: 'user', parts: [{ text: prompt }] }],
            },
            {
              headers: { 'Content-Type': 'application/json' },
              timeout: 15000,
            }
          );
          responseText = res.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        } catch {}
      }

      if (responseText && !responseText.includes('لا يوجد') && responseText.includes('-')) {
        const lines = responseText
          .split('\n')
          .map((l) => l.replace(/^[-•*]\s*/, '').trim())
          .filter((l) => l.length > 2 && !l.toLowerCase().includes('لا يوجد'));

        for (const line of lines) {
          if (line.startsWith('الاسم:')) {
            const detectedName = line.replace('الاسم:', '').trim();
            if (detectedName && detectedName.length > 1 && detectedName.length < 45) {
              localStore.updateContactMemory(tenantId, contactPhone, { name: detectedName });
            }
          }
          localStore.addContactMemoryFact(tenantId, contactPhone, line);
          console.log(`[MemoryEngine:${tenantId}] 🧠 Learned and stored new durable fact for ${contactPhone}: "${line}"`);
        }

        // Sync learned durable memory to Prisma (Supabase)
        try {
          const c = localStore.getContactByPhone(tenantId, contactPhone);
          if (c) {
            await prisma.contact.upsert({
              where: { tenantId_phoneNumber: { tenantId, phoneNumber: contactPhone } },
              create: {
                tenantId,
                phoneNumber: contactPhone,
                name: c.name || contactPhone,
                notes: c.notes || null,
                memoryFacts: c.memoryFacts || [],
              },
              update: {
                name: c.name || undefined,
                memoryFacts: c.memoryFacts || [],
              },
            });
            console.log(`[MemoryEngine:${tenantId}] 🚀 Synced learned memory facts to Prisma/Supabase for ${contactPhone}`);
          }
        } catch (dbErr: any) {
          console.warn('[MemoryEngine] Prisma memory sync note:', dbErr.message);
        }
      }
    } catch (memErr: any) {
      console.warn('[MemoryEngine] Memory extraction notice:', memErr.message);
    }
  }
}

