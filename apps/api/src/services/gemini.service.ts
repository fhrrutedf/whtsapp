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

    // 🛡️ CRITICAL: Eradicate bracketed placeholder hallucinations (NEVER output [LINK], [اضف...], etc. to customers!)
    cleaned = cleaned.replace(/(?:تفضل\s+)?رابط\s+الدفع\s+(?:المباشر\s+)?(?:لتفعيل\s+اشتراكك\s+فوراً:?)?\s*\[\s*(?:LINK|URL|رابط|الرابط)\s*\]/gi, 'لتفعيل اشتراكك فوراً متاح التحويل عبر سيريتل كاش، شام كاش، أو الهرم. أي طريقة أنسب إلك؟');
    cleaned = cleaned.replace(/\[\s*(?:LINK|URL|رابط|الرابط|YOUR_[A-Z_]+)\s*\]/gi, '');
    cleaned = cleaned.replace(/(?:رقم الحساب\s*(?:\/|\-)?\s*المعرّف:?\s*)?\[\s*(?:اضف|أضف|ضع|ادخل|أدخل|اكتب)\s+[^\]]+\]/gi, 'سيزودك به الأستاذ نواف مباشرة للتفعيل الفوري');
    cleaned = cleaned.replace(/\[\s*(?:رقم الحساب|رقم الهاتف|اسم الحساب|المعرف|المعرّف)\s*\]/gi, '');

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
   * Universal Live Test for any AI Provider or Custom Agent API.
   * Tests connectivity, latency, and returns sample output.
   */
  public static async testAiConnection(config: {
    provider: string;
    apiKey?: string;
    baseUrl?: string;
    model?: string;
  }): Promise<{ success: boolean; latencyMs: number; reply: string; error?: string }> {
    const startTime = Date.now();
    const provider = config.provider || 'gemini';

    try {
      if (provider === 'gemini') {
        const key = config.apiKey || process.env.GEMINI_API_KEY;
        if (!key) {
          return { success: false, latencyMs: 0, reply: '', error: 'مفتاح Gemini API غير متوفر' };
        }
        const model = config.model || 'gemini-3.6-flash';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
        const res = await axios.post(
          url,
          {
            contents: [{ role: 'user', parts: [{ text: 'قل مرحباً واذكر أنك متصل بنجاح في جملة واحدة قصيرة.' }] }],
          },
          { timeout: 15000 }
        );
        const reply = res.data?.candidates?.[0]?.content?.parts?.[0]?.text || 'تم الاتصال بنجاح!';
        return { success: true, latencyMs: Date.now() - startTime, reply: this.cleanTextForHumanWhatsApp(reply) };
      }

      // OpenAI / Groq / DeepSeek / OpenRouter / Custom Agent
      let baseUrl = config.baseUrl;
      let defaultModel = 'gpt-4o-mini';

      if (provider === 'openai') {
        baseUrl = 'https://api.openai.com/v1';
        defaultModel = 'gpt-4o-mini';
      } else if (provider === 'groq') {
        baseUrl = 'https://api.groq.com/openai/v1';
        defaultModel = 'llama-3.3-70b-versatile';
      } else if (provider === 'deepseek') {
        baseUrl = 'https://api.deepseek.com/v1';
        defaultModel = 'deepseek-chat';
      } else if (provider === 'openrouter') {
        baseUrl = 'https://openrouter.ai/api/v1';
        defaultModel = 'meta-llama/llama-3.3-70b-instruct';
      } else if (provider === 'custom') {
        if (!baseUrl) {
          return { success: false, latencyMs: 0, reply: '', error: 'رابط Base URL الخاص بالوكيل أو المزود غير محدد' };
        }
        defaultModel = config.model || 'default';
      }

      const cleanBaseUrl = (baseUrl || '').replace(/\/+$/, '');
      const endpoint = cleanBaseUrl.endsWith('/chat/completions')
        ? cleanBaseUrl
        : `${cleanBaseUrl}/chat/completions`;

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (config.apiKey) {
        headers['Authorization'] = `Bearer ${config.apiKey}`;
      }
      if (provider === 'openrouter') {
        headers['HTTP-Referer'] = 'http://localhost:3000';
        headers['X-Title'] = 'WhatsApp Omni SaaS';
      }

      const res = await axios.post(
        endpoint,
        {
          model: config.model || defaultModel,
          messages: [{ role: 'user', content: 'قل مرحباً واذكر أنك متصل بنجاح في جملة واحدة قصيرة.' }],
          max_tokens: 100,
        },
        { headers, timeout: 15000 }
      );

      const reply = res.data?.choices?.[0]?.message?.content || 'تم الاتصال بالوكيل بنجاح!';
      return {
        success: true,
        latencyMs: Date.now() - startTime,
        reply: this.cleanTextForHumanWhatsApp(reply),
      };
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        err.message ||
        'فشل الاتصال';
      return {
        success: false,
        latencyMs: Date.now() - startTime,
        reply: '',
        error: `خطأ الاتصال: ${errorMsg}`,
      };
    }
  }

  /**
   * Splits a response semantically into natural, complete-thought WhatsApp bubbles (1 to 3 messages).
   * - Short/moderate texts stay as a single message.
   * - Long texts are split by complete thoughts (paragraphs or completed sentences with terminal punctuation).
   * - Message 1 always finishes a complete understandable thought (تنتهي بمفهومة).
   */
  public static splitIntoNaturalBubbles(text: string, maxBubbles: number = 3): string[] {
    if (!text) return [];
    const clean = this.cleanTextForHumanWhatsApp(text);

    // If text is short or moderate (up to 180 chars, ~2 short lines), keep it in a single bubble
    if (clean.length <= 180) {
      return [clean];
    }

    // 1. First priority: Check double newlines (paragraphs / distinct thoughts)
    const rawParagraphs = clean
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    if (rawParagraphs.length >= 2) {
      const bubbles: string[] = [];
      let current = '';

      for (const p of rawParagraphs) {
        if (!current) {
          current = p;
        } else if (current.length < 85) {
          // If previous part is too short (e.g. greeting alone), merge with next so it forms a complete thought
          current += '\n' + p;
        } else {
          bubbles.push(current);
          current = p;
        }
      }
      if (current) bubbles.push(current);
      if (bubbles.length > 1) {
        return bubbles.slice(0, maxBubbles);
      }
    }

    // 2. Second priority: If it is a single continuous long block (> 220 chars),
    // split cleanly by complete sentence endings (. or ! or ؟ or newlines)
    const sentences = clean.match(/[^.!?؟\n]+[.!?؟\n]*/g) || [clean];
    if (sentences.length <= 1) {
      return [clean];
    }

    const bubbles: string[] = [];
    let current = '';

    for (const s of sentences) {
      // If current chunk has formed a complete sentence of adequate length (> 130 chars),
      // seal it as a complete thought (تنتهي الرسالة الأولى بمفهومة)
      if ((current + ' ' + s).trim().length > 180 && current.length >= 70) {
        bubbles.push(current.trim());
        current = s.trim();
      } else {
        current = (current ? current + ' ' + s : s).trim();
      }
    }
    if (current) {
      bubbles.push(current.trim());
    }

    return bubbles.slice(0, maxBubbles);
  }

  /**
   * Universal caller for any OpenAI-compatible API endpoint:
   * Supports OpenAI, OpenRouter, Groq, DeepSeek, Together, Ollama, and Custom Agent APIs!
   */
  public static async callOpenAICompatible(options: {
    baseUrl: string;
    apiKey: string;
    model: string;
    systemPrompt: string;
    history: ChatContextMessage[];
    userInstruction?: string;
    mediaBase64?: string;
    mediaMimeType?: string;
    tenantId?: string;
    contactPhone?: string;
    providerName?: string;
  }): Promise<string> {
    const {
      baseUrl,
      apiKey,
      model,
      systemPrompt,
      history,
      userInstruction,
      mediaBase64,
      mediaMimeType,
      tenantId,
      contactPhone,
      providerName = 'Universal AI',
    } = options;

    // Normalise base URL
    let endpoint = baseUrl.trim().replace(/\/+$/, '');
    if (!endpoint.endsWith('/chat/completions')) {
      if (!endpoint.endsWith('/v1')) {
        endpoint = `${endpoint}/v1`;
      }
      endpoint = `${endpoint}/chat/completions`;
    }

    // Billing Guard for internal metering
    if (tenantId && providerName.toLowerCase().includes('openrouter')) {
      const check = await BillingService.checkTokenBalance(tenantId);
      if (!check.allowed) {
        console.warn(`[AiService:${providerName}] ⚠️ Token balance exhausted for tenant ${tenantId}.`);
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

    const tools = skillRegistry.getToolsForLLM().map((t) => ({
      type: 'function',
      function: t,
    }));

    console.log(`[AiService:${providerName}] 🚀 Dispatching to ${endpoint} with model "${model}"...`);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }
    if (providerName.toLowerCase().includes('openrouter')) {
      headers['HTTP-Referer'] = 'http://localhost:3000';
      headers['X-Title'] = 'WhatsApp Omni SaaS';
    }

    const res = await axios.post(
      endpoint,
      {
        model,
        messages,
        tools: tools.length > 0 ? tools : undefined,
        temperature: 0.7,
        max_tokens: 350,
      },
      {
        headers,
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
      console.log(`[AiService:${providerName}] ⚡ Tool call detected: "${fnName}"`, fnArgs);

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
        console.log(`[AiService:${providerName}] ✅ Skill response:`, cleanSkillMsg.slice(0, 60));
        return cleanSkillMsg;
      }
    }

    const reply = choice?.message?.content;
    const cleanReply = reply ? this.cleanTextForHumanWhatsApp(reply) : 'أهلاً وسهلاً بك، كيف فيني ساعدك؟';
    console.log(`[AiService:${providerName}] ✅ Response generated:`, cleanReply.slice(0, 60));

    // Token Deduction & Accounting for OpenRouter
    if (tenantId && providerName.toLowerCase().includes('openrouter')) {
      const usage = res.data?.usage;
      const tokensUsed = usage?.total_tokens || Math.ceil((cleanReply.length || 50) / 4) + 80;
      await BillingService.deductTokens(tenantId, tokensUsed, `${providerName} (${model})`, {
        model,
        promptTokens: usage?.prompt_tokens,
        completionTokens: usage?.completion_tokens,
      });
    }

    return cleanReply;
  }

  /**
   * Calls OpenRouter API (backward compatible helper)
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
    return this.callOpenAICompatible({
      baseUrl: 'https://openrouter.ai/api/v1',
      apiKey,
      model,
      systemPrompt,
      history,
      userInstruction,
      mediaBase64,
      mediaMimeType,
      tenantId,
      contactPhone,
      providerName: 'OpenRouter',
    });
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
      `5. تقطيع الرسائل حسب المحتوى: إذا كان الجواب طويلاً أو يحتوي على أكثر من فكرة، افصل بين الأفكار بسطر فارغ مزدوج لتظهر كرسائل متتابعة:\n` +
      `   - الرسالة الأولى: اجعلها فكرة تامة ومفهومة لوحدها وتنتهي بنقطة أو علامة ترقيم (كالترحيب والجواب الأساسي).\n` +
      `   - الرسالة الثانية: تبدأ بالتفاصيل الإضافية، الرابط، أو سؤال المتابعة.\n` +
      `   - تجنب إرسال رسائل مجتزأة أو ناقصة المعنى في الرسالة الأولى.\n` +
      `6. ⚠️ قاعدة الاسم الإلزامية: لا تنادِ العميل باسم إطلاقاً إلا إذا ذكر اسمه بنفسه في المحادثة. اسم الواتساب (Push Name) المعروض على الهاتف ليس اسمه الحقيقي وقد يكون اسم شخص آخر أو لقباً — لا تستخدمه أبداً للتحية.\n` +
      `7. ⚠️⛔ ممنوع منعاً باتاً كتابة أي نصوص افتراضية أو قوالب أو أقواس نائبة إطلاقاً، مثل: [LINK] أو [رابط] أو [اضف رقم الحساب هنا] أو [ضع...] أو [اسم الحساب] أو [URL]! العميل شخص حقيقي يدردش معك مباشرة، وليس قالباً برمجياً.\n` +
      `   - إذا كان رقم الحساب أو الرابط المعتمد موجوداً في النظام: اذكره فوراً بدقة.\n` +
      `   - إذا لم تكن تفاصيل الحساب المباشرة مدخلة بعد: تحدث كإنسان حقيقي ولبق وقل له: "ع عيني واختيار ممتاز! لتثبيت اشتراكك فوراً، اتركلي اسمك الثلاثي ومادتك التدريسية حتى حوّلك للأستاذ نواف ليزودك بالرقم مباشرة ويثبت اشتراكك بثواني."\n` +
      `8. 💳 طرق الدفع المعتمدة:\n` +
      `   - داخل سوريا: متاح سيريتل كاش، شام كاش، شبكة الهرم أو الفؤاد، وبنك بيمو.\n` +
      `   - خارج سوريا: متاح بايبال، ويسترن يونيون، بطاقة بنكية دولية.\n` +
      `   - لا تدّعِ وجود رابط دفع أونلاين على الموقع إذا لم يكن موجوداً، ولا ترسل روابط وهمية أو تضع [LINK] أبداً.\n` +
      `${dialectInstruction}\n` +
      `${toneInstruction}\n`;

    // Persistent Customer Memory across sessions
    let memoryContext = '';
    if (settings.userMemoryEnabled !== false && contactPhone) {
      const contact = localStore.getContactByPhone(tenantId, contactPhone);
      if (contact) {
        const facts = contact.memoryFacts || [];
        const notes = contact.notes;
        // Only use the name if the customer told us themselves (not auto-imported from WhatsApp)
        const realName = contact.name && contact.name !== contact.phoneNumber ? contact.name : null;

        if (facts.length > 0 || notes || realName) {
          memoryContext =
            `\n\n--- 🧠 ذاكرة العميل الدائمة عبر الجلسات (Durable Customer Memory) ---\n` +
            `هذا العميل تواصل معنا سابقاً. بياناته المحفوظة:\n` +
            (realName ? `- الاسم الذي ذكره العميل بنفسه: ${realName}\n` : '') +
            `- رقم الهاتف: ${contact.phoneNumber}\n` +
            (notes ? `- ملاحظات هامة عن العميل: ${notes}\n` : '') +
            (facts.length > 0 ? `- حقائق وتفضيلات مثبتة:\n  * ${facts.join('\n  * ')}\n` : '') +
            `\nتوجيه إلزامي حول الاسم:\n` +
            `• ${realName ? `استخدم الاسم "${realName}" بشكل طبيعي في سياق المحادثة فقط (مثل: "يا ${realName}") — لا تبدأ كل رسالة بالاسم.` : 'لا يوجد اسم مؤكد لهذا العميل. لا تناديه بأي اسم.'}\n` +
            `• ⚠️ لا تستخدم اسم الواتساب (Push Name) أبداً للتحية أو المناداة — الاسم الوحيد المعتمد هو ما ذكره العميل بنفسه في المحادثة.\n` +
            `• إذا ذكر العميل اسمه في المحادثة الحالية، احفظه واستخدمه بشكل طبيعي من تلك اللحظة.\n` +
            `توجيه الذاكرة: ${settings.userMemoryPrompt || 'خاطب العميل بتفاصيله وتفضيلاته لتشعره بالاهتمام الشخصي حتى لو عاد بعد شهور.'}\n`;
        } else {
          // Even if no facts, still warn about not using WA name
          memoryContext =
            `\n\n--- 🧠 تعليمات الاسم (Customer Name Rules) ---\n` +
            `⚠️ لا تستخدم اسم الواتساب (Push Name) للتحية أو المناداة إطلاقاً.\n` +
            `فقط إذا ذكر العميل اسمه بنفسه في المحادثة، استخدمه بشكل طبيعي وغير مبالغ فيه.\n`;
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
      `\n\n--- 🧩 المهارات الذكية المفعّلة (Agentic Skills Engine v2) ---\n` +
      `الأدوات التالية جاهزة للاستدعاء الفوري. استخدمها في السياق الصحيح:\n` +
      skillRegistry.getCombinedSystemPrompts() +
      `\n\nخريطة استدعاء الأدوات (يجب الالتزام بها):\n` +
      `• عميل يعترض على السعر او يقول "غالي" / "كثير" / "بشوف" → استدعِ objection_handler فوراً\n` +
      `• "بدي اشترك" / "بدي ادفع" / "كيف الطريقة" / "ارسلي الرابط" → استدعِ sales_closer\n` +
      `• صورة إيصال بنكي / تحويل / سيريتل كاش → استدعِ payment_receipt_detector\n` +
      `• عميل يملك الكورس ويريد منتجاً ثانياً → استدعِ upsell_cross_sell\n` +
      `• طلب صورة / بروشور / باركود دفع → استدعِ media_dispatcher\n` +
      `• عميل يريد مقارنة تقنية أو تفاصيل المنهاج → استدعِ sales_engineer\n` +
      `• عميل جديد ولا اسم له في النظام → استدعِ lead_gen_collector\n`;

    // Multimodal Vision Understanding Instructions
    const visionContext =
      `\n\n--- 👁️ قدرات فهم الصور واستقبال الوسائط (Multimodal Vision Engine) ---\n` +
      `إذا أرسل العميل صورة أو مستنداً مرئياً، انظر إليها وحللها بدقة وسرعة:\n` +
      `1. إذا كانت الصورة إيصال تحويل بنكي أو سداد (Bank Transfer Receipt): اقرأ المبلغ بالريال، اسم البنك، اسم المحول، والرقم المرجعي، وأكد استلام الحوالة فوراً بلطف وتطمين (مثال: "وصل الإيصال بمبلغ ... الله يعطيك العافية، جاري التفعيل فوراً").\n` +
      `2. إذا كانت صورة منتج أو سلعة يسأل عنها العميل: تعرف على المنتج والموديل وطابقه مع الكتالوج وقاعدة المعرفة وأخبر العميل بمواصفاته وسعره فوراً.\n` +
      `3. إذا كانت لقطة شاشة لخطأ تقني: افحص الخطأ وقدم حلاً مباشراً وسريعاً.\n` +
      `4. إذا طلب العميل رؤية بروشور الباقات أو باركود الدفع أو صور المنتجات: استدعِ أداة media_dispatcher أو أرفق رابط الصورة بالصيغة: [MEDIA:الرابط] مع النص الترحيبي.\n`;

    // 🛍️ Live Product Catalog & Visual Media
    let catalogContext = '';
    const products = settings.products || [];
    const brochureUrl = settings.brochureImageUrl;
    const paymentQrUrl = settings.paymentQrImageUrl;

    if (products.length > 0 || brochureUrl || paymentQrUrl) {
      catalogContext = `\n\n--- 🛍️ كتالوج المنتجات والوسائط المرئية المعتمدة (Live Catalog & Media) ---\n`;
      if (brochureUrl) {
        catalogContext += `- بروشور الأسعار والباقات الرسمي: ${brochureUrl}\n  (إذا طلب العميل الأسعار، العروض، أو البروشور، استدعِ media_dispatcher أو أرسل هذا الرابط بصيغة [MEDIA:${brochureUrl}] مع رسالة توضيحية).\n`;
      }
      if (paymentQrUrl) {
        catalogContext += `- باركود الحساب البنكي والدفع الفوري (Payment QR): ${paymentQrUrl}\n  (إذا رغب العميل بالدفع أو التحويل البنكي، أرسل فوراً تفاصيل الحساب وهذا الباركود بصيغة [MEDIA:${paymentQrUrl}] مع الترحيب به دون تحويله لبشري طالما بإمكانك تزويده ببيانات الدفع).\n`;
      }
      if (products.length > 0) {
        catalogContext += `المنتجات والخدمات المتوفرة في الكتالوج:\n`;
        products.forEach((p, idx) => {
          catalogContext += `  ${idx + 1}. [${p.name}] - السعر: ${p.price ? p.price + ' ريال' : 'حسب الطلب'}\n`;
          if (p.description) catalogContext += `     الوصف: ${p.description}\n`;
          if (p.imageUrl) catalogContext += `     رابط الصورة: [MEDIA:${p.imageUrl}]\n`;
        });
        catalogContext += `توجيه حاسم: عند سؤال العميل عن أي من هذه المنتجات، قدم له السعر والمواصفات بحرارة وذكاء، واعرض صورة المنتج بصيغة [MEDIA:رابط الصورة].\n`;
      }
    }

    // 🧠 Ultra Sales & Response Intelligence (v2 — Skills-Powered)
    const telegramUrl = settings.courseAccessTelegramUrl;
    const salesIntelligence =
      `\n\n--- 🧠 بروتوكول الذكاء البيعي الاحترافي (v2) ---\n` +
      `1. سرعة البديهة: افهم مقصود العميل بدقة مهما اختصر أو كتب بعامية أو أخطاء.\n` +
      `2. الجواب المباشر + Call-to-Action: ابدأ بالجواب (سعر/ميزة/خطوة)، ثم أنهِ الرد دائماً بسؤال بسيط يدفع العميل للمضي قدماً.\n` +
      `   مثال صحيح: "سعر الكورس 22$ مدى الحياة وعرض الإطلاق محدود. تحب نبعتلك رابط التسجيل الآن؟"\n` +
      `   مثال خاطئ: "سعر الكورس 22$." — (توقف بدون استدراج)\n` +
      `3. إتمام البيع الفوري: عند "بدي اشترك" / "بدي ادفع" / "كيف الطريقة" → استدعِ sales_closer مباشرة، لا تسأل أسئلة إضافية.\n` +
      `4. معالجة الاعتراضات: عند "غالي" / "كثير" / "بشوف" / "بفكر" → استدعِ objection_handler فوراً. لا تعتذر ولا تبرر السعر بنفسك.\n` +
      `5. تفعيل آلي بعد الدفع: عند استلام صورة إيصال → استدعِ payment_receipt_detector ثم أرسل رابط الكورس فوراً.\n` +
      (telegramUrl ? `   رابط الكورس على تيليجرام (يُرسل بعد تأكيد الإيصال): ${telegramUrl}\n` : '') +
      `6. لا تقل أبداً "بصفتي ذكاء اصطناعي" أو "لا أعلم" طالما الجواب في قاعدة المعرفة.\n`;

    // Payment Receipt + Telegram Auto-Delivery context
    const receiptDeliveryContext = telegramUrl
      ? `\n\n--- ✅ بروتوكول التفعيل الآلي بعد استلام إيصال الدفع ---\n` +
        `عند استلام صورة إيصال بنكي أو تحويل (سيريتل كاش / شام كاش / بايبال / بطاقة / بنكي):\n` +
        `1. قرأ المبلغ واسم البنك من الصورة عبر الرؤية البصرية.\n` +
        `2. أرسل رسالة تهنئة دافئة: "مبروك! انضمامك تأكد فوراً. الله يبارك فيك 🎉"\n` +
        `3. أرسل رابط الانضمام مباشرة بدون انتظار أحد: ${telegramUrl}\n` +
        `   (الصيغة الصحيحة: "تفضل رابط مجموعتك على تيليجرام اللي فيها جميع الدروس والمواد: ${telegramUrl} — نوّر معنا ويارب يكون بالخير والبركة! 🌟"\n`
      : '';

    // 🎁 Active Giveaway Context (injected so AI knows current gift number)
    let giveawayContext = '';
    const activeGiveaways = (settings.giveaways || []).filter((g: any) => g.isActive);
    if (activeGiveaways.length > 0) {
      giveawayContext = `\n\n--- 🎁 مسابقات الهدايا النشطة (Giveaway Intelligence) ---\n`;
      giveawayContext += `أنت على علم بالمسابقات الأسبوعية التالية ويمكنك الإشارة إليها بطبيعية:\n`;
      activeGiveaways.forEach((g: any) => {
        giveawayContext += `• [${g.name}]${g.weekLabel ? ` — ${g.weekLabel}` : ''}:\n`;
        giveawayContext += `  - الهدية الحالية: رقم ${g.currentGift} من أصل ${g.totalGifts} هدية\n`;
        giveawayContext += `  - متبقي: ${g.totalGifts - g.currentGift} هدية\n`;
        if (g.description) giveawayContext += `  - وصف: ${g.description}\n`;
      });
      giveawayContext += `توجيه: إذا سأل عميل عن المسابقة أو الهدايا، أخبره برقم الهدية الحالية بثقة.\n`;
    }

    // 💳 Official Payment Link Context (Zero-Placeholder Guaranteed)
    let paymentAccountsContext = `\n\n--- 💳 رابط وبوابة الدفع المعتمدة ---\n`;
    const paymentLink = settings.checkoutBaseUrl && !settings.checkoutBaseUrl.includes('yourdomain.com') ? settings.checkoutBaseUrl : '';
    if (paymentLink) {
      paymentAccountsContext += `رابط الدفع المباشر الشامل المعتمد:\n🔗 ${paymentLink}\n` +
        `توجيه إلزامي: عندما يطلب العميل الدفع أو الاشتراك، زوّده بهذا الرابط فوراً بترحيب ودفء (مثال: "تفضل يا غالي رابط الدفع المباشر لتفعيل اشتراكك فوراً: ${paymentLink}").\n`;
    } else {
      paymentAccountsContext += `تنبيه: لا يوجد رابط دفع مسجل في النظام حالياً. إذا طلب العميل الدفع، رحب به بلطف واطلب اسمه الثلاثي ومادته لتجهيز التفعيل المباشر وتحويله للمدرب أ. نواف. ⚠️ ممنوع منعاً باتاً كتابة [LINK] أو أي كلمات نائبة بين أقواس!\n`;
    }

    const systemPrompt =
      basePrompt +
      humanStyleRules +
      paymentAccountsContext +
      salesIntelligence +
      receiptDeliveryContext +
      safetyContext +
      errorRecoveryContext +
      escalationContext +
      memoryContext +
      knowledgeContext +
      catalogContext +
      giveawayContext +
      skillsContext +
      visionContext;

    // ─────────────────────────────────────────────────────────────
    // Universal AI Provider Dispatcher
    // Supports: OpenAI, Groq, DeepSeek, OpenRouter, Custom Agent, and Google Gemini!
    // ─────────────────────────────────────────────────────────────
    const selectedProvider = settings.aiProvider || 'gemini';

    // 1. OpenAI (Official ChatGPT API)
    if (selectedProvider === 'openai') {
      const oKey = settings.openaiApiKey || process.env.OPENAI_API_KEY;
      if (oKey) {
        try {
          return await this.callOpenAICompatible({
            baseUrl: 'https://api.openai.com/v1',
            apiKey: oKey,
            model: settings.openaiModel || 'gpt-4o-mini',
            systemPrompt,
            history,
            userInstruction,
            mediaBase64,
            mediaMimeType,
            tenantId,
            contactPhone,
            providerName: 'OpenAI',
          });
        } catch (oErr: any) {
          console.warn('[AiService] OpenAI failed, cascading to fallback...', oErr.message);
        }
      }
    }

    // 2. Groq (Ultra-Fast Llama 3.3 / DeepSeek / Mixtral)
    if (selectedProvider === 'groq') {
      const gKey = settings.groqApiKey || process.env.GROQ_API_KEY;
      if (gKey) {
        try {
          return await this.callOpenAICompatible({
            baseUrl: 'https://api.groq.com/openai/v1',
            apiKey: gKey,
            model: settings.groqModel || 'llama-3.3-70b-versatile',
            systemPrompt,
            history,
            userInstruction,
            mediaBase64,
            mediaMimeType,
            tenantId,
            contactPhone,
            providerName: 'Groq',
          });
        } catch (gErr: any) {
          console.warn('[AiService] Groq failed, cascading to fallback...', gErr.message);
        }
      }
    }

    // 3. DeepSeek API
    if (selectedProvider === 'deepseek') {
      const dKey = settings.deepseekApiKey || process.env.DEEPSEEK_API_KEY;
      if (dKey) {
        try {
          return await this.callOpenAICompatible({
            baseUrl: 'https://api.deepseek.com/v1',
            apiKey: dKey,
            model: settings.deepseekModel || 'deepseek-chat',
            systemPrompt,
            history,
            userInstruction,
            mediaBase64,
            mediaMimeType,
            tenantId,
            contactPhone,
            providerName: 'DeepSeek',
          });
        } catch (dErr: any) {
          console.warn('[AiService] DeepSeek failed, cascading to fallback...', dErr.message);
        }
      }
    }

    // 4. Custom Agent API / Any Base URL Proxy
    if (selectedProvider === 'custom' && settings.customApiBaseUrl) {
      try {
        return await this.callOpenAICompatible({
          baseUrl: settings.customApiBaseUrl,
          apiKey: settings.customApiKey || '',
          model: settings.customModel || 'default',
          systemPrompt,
          history,
          userInstruction,
          mediaBase64,
          mediaMimeType,
          tenantId,
          contactPhone,
          providerName: 'Custom Agent',
        });
      } catch (cErr: any) {
        console.warn('[AiService] Custom Agent API failed, cascading to fallback...', cErr.message);
      }
    }

    // 5. OpenRouter
    if (selectedProvider === 'openrouter' && openrouterKey) {
      try {
        const orModel = settings.openrouterModel || 'google/gemini-2.0-flash-exp:free';
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
        console.warn('[AiService] OpenRouter failed, cascading to fallback...', orErr.message);
      }
    }

    // ─────────────────────────────────────────────────────────────
    // Google Gemini Direct Execution (with Multi-Model Auto Failover)
    // ─────────────────────────────────────────────────────────────
    const contents: any[] = [];
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

    // Curated high-availability 2026 Gemini model fallback list
    const candidateModels: string[] = [
      settings.geminiModel || '',
      'gemini-3.6-flash',
      'gemini-flash-lite-latest',
      'gemini-3.5-flash',
    ].filter((m): m is string => typeof m === 'string' && m.length > 0 && !m.includes('2.0') && !m.includes('2.5-flash-lite'));

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
        maxOutputTokens: 350,
      },
    };

    for (const curModel of candidateModels) {
      if (!geminiKey) break;
      try {
        console.log(`[GeminiService] 🤖 Attempting Gemini with model: ${curModel}...`);
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${curModel}:generateContent?key=${geminiKey}`;
        const res = await axios.post(url, requestPayload, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 25000,
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
        if (reply) {
          const cleanReply = this.cleanTextForHumanWhatsApp(reply);
          console.log(`[GeminiService] ✅ Response generated via ${curModel}:`, cleanReply.slice(0, 60));
          return cleanReply;
        }
      } catch (geminiErr: any) {
        const errStatus = geminiErr.response?.status;
        const errMsg = geminiErr.response?.data?.error?.message || geminiErr.message;
        console.warn(`[GeminiService] Model ${curModel} failed (${errStatus || errMsg}). Trying next available model...`);
      }
    }

    // ─────────────────────────────────────────────────────────────
    // Zero-Failure Local RAG Engine Fallback
    // Never show an error or raw quota message to the customer!
    // ─────────────────────────────────────────────────────────────
    console.log('[AiService] 🛡️ Activating Zero-Failure Local Knowledge Base Engine...');
    const lastUserMsg = validHistory[validHistory.length - 1]?.content || '';
    return this.answerFromKnowledgeFallback(tenantId, lastUserMsg);
  }

  /**
   * Resilient Zero-Failure Knowledge Engine:
   * Answers directly from stored Knowledge Base and Catalog even if external APIs are exhausted or down!
   */
  public static answerFromKnowledgeFallback(tenantId: string, userMessage: string): string {
    const raw = (userMessage || '').toLowerCase();
    const settings = localStore.getSettings(tenantId);

    // 1. Trainer / Creator inquiry
    if (raw.includes('مدرب') || raw.includes('استاذ') || raw.includes('أستاذ') || raw.includes('نواف') || raw.includes('مين')) {
      return 'يا هلا فيك! المدرب هو أ. نواف البوسطة، مدرب ومختص في تطبيقات الذكاء الاصطناعي وتطوير المهارات التعليمية، والكورس مصمم ليساعدك خطوة بخطوة من هاتفك المحمول. تحب تستفسر عن المحتوى أو طريقة التسجيل؟';
    }

    // 2. Price / Cost inquiry
    if (raw.includes('سعر') || raw.includes('بكم') || raw.includes('تكلفة') || raw.includes('اشتراك') || raw.includes('كام')) {
      return 'أهلاً بك! سعر الكورس ضمن عرض الإطلاق الحالي مخفض جداً: 22$ فقط (بدلاً من 39$) دفعة واحدة مع وصول دائم وتحديثات ومتابعة مباشرة عبر تليجرام. حابب تثبت مقعدك بالعرض المخفض اليوم؟';
    }

    // 3. Payment inquiry
    if (raw.includes('شام كاش') || raw.includes('شامكاش')) {
      if (settings.shamCashAccount) {
        return `ع عيني، اختيار ممتاز وسريع! 🌸\nهاد حساب شام كاش المعتمد لتحويل مبلغ 22$ (أو ما يعادله بالمحلي):\nاسم الحساب: ${settings.shamCashName || 'نواف البوسطة'}\nرقم الحساب / المعرّف: ${settings.shamCashAccount}\n\nبعد ما تحول، ابعتلنا صورة الإشعار هون بالدردشة وثواني وبتكون معنا على تليجرام لتستلم الكورس وكل الهدايا! 😊✨`;
      }
      return `ع عيني، اختيار ممتاز وسريع! 🌸\nلتثبيت اشتراكك فوراً وتحويل 22$ عبر شام كاش، اتركلي اسمك الثلاثي ومادتك ورح حوّلك فوراً للأستاذ نواف ليزودك برقم الحساب مباشرة للتفعيل الفوري. 😊✨`;
    }

    if (raw.includes('سيريتل كاش') || raw.includes('سيرياتيل')) {
      if (settings.syriatelCashAccount) {
        return `تكرم عينك! هاد حساب سيريتل كاش المعتمد لتحويل 22$:\nالرقم / الكود: ${settings.syriatelCashAccount}\nباسم: ${settings.shamCashName || 'نواف البوسطة'}\n\nابعتلنا الإشعار بعد التحويل لتفعيل حسابك مباشرة! ✨`;
      }
      return `تكرم عينك يا غالي! للتحويل عبر سيريتل كاش، اتركلي اسمك ومادتك حتى حوّلك فوراً للأستاذ نواف ليزودك بالرقم المعتمد للتفعيل بثواني. ✨`;
    }

    if (raw.includes('دفع') || raw.includes('ادفع') || raw.includes('طريقة الدفع') || raw.includes('اشترك') || raw.includes('سداد') || raw.includes('هرم') || raw.includes('فؤاد') || raw.includes('بايبال')) {
      const qrMedia = settings.paymentQrImageUrl ? `[MEDIA:${settings.paymentQrImageUrl}] ` : '';
      return `${qrMedia}تكرم عينك! للتحويل داخل سوريا متاح (سيريتل كاش، شام كاش، الهرم، الفؤاد، أو بنك بيمو) بتفعيل فوري ومباشر. وللتحويل من خارج سوريا متاح (بايبال، ويسترن يونيون، أو بطاقة بنكية). أي طريقة أنسب إلك لأرسلك بياناتها فوراً؟`;
    }

    // 4. Laptop / Hardware inquiry
    if (raw.includes('لابتوب') || raw.includes('كمبيوتر') || raw.includes('جوال') || raw.includes('موبايل') || raw.includes('هاتف')) {
      return 'أبداً ما بتحتاج لابتوب! الكورس مصمم 100% لتطبق كل الشروحات وتنتج الامتحانات والإنفوجرافيك والفيديوهات مباشرة من هاتفك المحمول وبكل سهولة.';
    }

    // 5. Product Catalog Match
    const products = settings.products || [];
    for (const prod of products) {
      if (raw.includes(prod.name.toLowerCase())) {
        const media = prod.imageUrl ? `[MEDIA:${prod.imageUrl}] ` : '';
        return `${media}يا هلا! ${prod.name} متوفر وجاهز، وسعره ${prod.price || 'مخفض'} ريال. ${prod.description ? prod.description + '. ' : ''}تحب نعتمد لك الطلب؟`;
      }
    }

    // 6. Natural warm fallback
    return 'أهلاً وسهلاً بحضرتك! نحن بخدمتك للرد على كافة استفساراتك حول الكورس والخدمات والأسعار. تفضل كيف فينا نساعدك اليوم؟';
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

