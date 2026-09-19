import fs from 'fs';
import path from 'path';

export interface StoredContact {
  id: string;
  tenantId: string;
  phoneNumber: string;
  name: string;
  lastSeenAt: string;
  notes?: string;
  memoryFacts?: string[];
  isOptedOut?: boolean;
  customAttributes?: Record<string, any>;
}

export interface StoredConversation {
  id: string;
  tenantId: string;
  contactId: string;
  contactName: string;
  contactPhone: string;
  channel: string;
  lastMessageSnippet: string;
  unreadCount: number;
  lastActivityAt: string;
  createdAt: string;
}

export interface StoredMessage {
  id: string;
  tenantId: string;
  conversationId: string;
  senderType: 'AGENT' | 'CUSTOMER' | 'CONTACT';
  senderId: string;
  senderName: string;
  content: string;
  mediaUrl?: string | null;
  mediaType?: 'image' | 'audio' | 'video' | 'document' | null;
  deliveryStatus: 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
  createdAt: string;
}

export interface StoredSettings {
  geminiApiKey?: string;
  geminiModel?: string;
  geminiSystemPrompt?: string;
  geminiAutoReplyEnabled?: boolean;
  // AI Provider & Keys
  aiProvider?: 'gemini' | 'openrouter';
  openrouterApiKey?: string;
  openrouterModel?: string;
  // 1. Dialect & Tone
  dialect?: 'modern_standard' | 'syrian' | 'saudi' | 'egyptian' | 'iraqi' | 'custom';
  tone?: 'friendly' | 'formal' | 'sales' | 'concise' | 'empathetic';
  customDialectPrompt?: string;
  // 2. Blacklist / Excluded Numbers (لا ترد عليها)
  excludedPhoneNumbers?: string[];
  // 3. Delay in seconds (تأخير الرد: 30 إلى 60 ثانية)
  autoReplyDelaySeconds?: number;
  // الفارق الزمني بين الرسائل المتتالية والفقاعات بالثواني (الافتراضي 15 ثانية)
  interMessageDelaySeconds?: number;
  // 4. Human Handoff Rules (متى يوقف الرد وقواعد التحويل لبشري)
  handoffKeywords?: string[];
  handoffTeamRouting?: { keyword: string; teamId: string; teamName?: string }[];
  handoffMaxTurns?: number; // 0 for unlimited
  handoffStopNotification?: string;
  pausedConversations?: string[];
  // 5. User Long-Term Memory (ذاكرة المستخدم المستدامة عبر الجلسات)
  userMemoryEnabled?: boolean;
  userMemoryPrompt?: string;
  // 6. WhatsApp Read Receipts (الصحين الزرق)
  sendReadReceipts?: boolean;
  // 7. Safety Guardrails & Error Recovery (حواجز الأمان واستعادة الأخطاء - Botpress)
  safetyGuardrails?: string;
  errorRecovery?: string;
  // 8. Advanced Escalation Rules (قواعد التصعيد والتسليم لبشري)
  escalationEnabled?: boolean;
  escalationRules?: string;
  escalationPreActions?: string;
  // 9. Business Hours & Out of Office
  outOfOfficeMessage?: string;
  // 10. Agentic Skills & Growth Configuration
  enabledSkills?: string[];
  checkoutBaseUrl?: string;
  meetingSchedulerUrl?: string;
  defaultDiscountPercentage?: number;
  // 11. Visual Media Assets & Catalogs
  brochureImageUrl?: string;
  paymentQrImageUrl?: string;
  catalogImageUrl?: string;
}

export interface KnowledgeItem {
  id: string;
  tenantId: string;
  title: string;
  type: 'text' | 'url' | 'file';
  content: string;
  source?: string;
  charCount: number;
  createdAt: string;
}

interface LocalDatabase {
  contacts: Record<string, StoredContact>; // key: `${tenantId}:${phoneNumber}`
  conversations: Record<string, StoredConversation>; // key: id
  messages: Record<string, StoredMessage[]>; // key: conversationId
  settings: Record<string, StoredSettings>; // key: tenantId
  knowledge: Record<string, KnowledgeItem[]>; // key: tenantId
}

class LocalStoreManager {
  private filePath: string;
  private data: LocalDatabase = {
    contacts: {},
    conversations: {},
    messages: {},
    settings: {},
    knowledge: {},
  };

  constructor() {
    const dataDir = path.resolve(__dirname, '../../data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    this.filePath = path.join(dataDir, 'store.json');
    this.load();
  }

  private load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        this.data = JSON.parse(raw);
        if (!this.data.contacts) this.data.contacts = {};
        if (!this.data.conversations) this.data.conversations = {};
        if (!this.data.messages) this.data.messages = {};
        if (!this.data.settings) this.data.settings = {};
        if (!this.data.knowledge) this.data.knowledge = {};
      }
    } catch (err: any) {
      console.warn('[LocalStoreManager] Load notice:', err.message);
    }
  }

  private save() {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err: any) {
      console.error('[LocalStoreManager] Save error:', err.message);
    }
  }

  // --- Contacts ---
  public upsertContact(tenantId: string, phoneNumber: string, name?: string): StoredContact {
    const key = `${tenantId}:${phoneNumber}`;
    const now = new Date().toISOString();
    const existing = this.data.contacts[key];

    const contact: StoredContact = {
      id: existing ? existing.id : `cnt_${phoneNumber.replace(/\D/g, '')}`,
      tenantId,
      phoneNumber,
      name: name || existing?.name || phoneNumber,
      lastSeenAt: now,
      notes: existing?.notes,
      memoryFacts: existing?.memoryFacts || [],
      customAttributes: existing?.customAttributes || {},
    };

    this.data.contacts[key] = contact;
    this.save();
    return contact;
  }

  public getContacts(tenantId: string): StoredContact[] {
    return Object.values(this.data.contacts).filter((c) => c.tenantId === tenantId);
  }

  public getContactByPhone(tenantId: string, phoneNumber: string): StoredContact | null {
    const clean = phoneNumber.replace(/\D/g, '');
    return (
      this.data.contacts[`${tenantId}:${phoneNumber}`] ||
      this.data.contacts[`${tenantId}:+${clean}`] ||
      this.data.contacts[`${tenantId}:${clean}`] ||
      null
    );
  }

  public updateContactMemory(
    tenantId: string,
    phoneNumber: string,
    updates: { name?: string; notes?: string; memoryFacts?: string[]; customAttributes?: Record<string, any> }
  ): StoredContact | null {
    const contact = this.getContactByPhone(tenantId, phoneNumber);
    if (!contact) return null;

    const key = `${tenantId}:${contact.phoneNumber}`;
    if (updates.name) contact.name = updates.name;
    if (updates.notes !== undefined) contact.notes = updates.notes;
    if (updates.memoryFacts !== undefined) contact.memoryFacts = updates.memoryFacts;
    if (updates.customAttributes !== undefined) {
      contact.customAttributes = { ...(contact.customAttributes || {}), ...updates.customAttributes };
    }

    this.data.contacts[key] = contact;
    this.save();
    return contact;
  }

  public addContactMemoryFact(tenantId: string, phoneNumber: string, fact: string): StoredContact | null {
    const contact = this.getContactByPhone(tenantId, phoneNumber);
    if (!contact) return null;

    const key = `${tenantId}:${contact.phoneNumber}`;
    if (!contact.memoryFacts) contact.memoryFacts = [];
    const cleanFact = fact.trim();
    if (cleanFact && !contact.memoryFacts.includes(cleanFact)) {
      contact.memoryFacts.push(cleanFact);
      this.data.contacts[key] = contact;
      this.save();
    }
    return contact;
  }

  // --- Conversations ---
  public upsertConversation(
    convId: string,
    tenantId: string,
    contact: StoredContact,
    snippet: string,
    incrementUnread: boolean = false
  ): StoredConversation {
    const existing = this.data.conversations[convId];
    const now = new Date().toISOString();

    const conversation: StoredConversation = {
      id: convId,
      tenantId,
      contactId: contact.id,
      contactName: contact.name,
      contactPhone: contact.phoneNumber,
      channel: 'WHATSAPP',
      lastMessageSnippet: snippet,
      unreadCount: existing
        ? incrementUnread
          ? (existing.unreadCount || 0) + 1
          : 0
        : incrementUnread
        ? 1
        : 0,
      lastActivityAt: now,
      createdAt: existing ? existing.createdAt : now,
    };

    this.data.conversations[convId] = conversation;
    this.save();
    return conversation;
  }

  public getConversations(tenantId: string): StoredConversation[] {
    return Object.values(this.data.conversations)
      .filter((c) => c.tenantId === tenantId)
      .sort((a, b) => new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime());
  }

  // --- Messages ---
  public saveMessage(msg: StoredMessage) {
    if (!this.data.messages[msg.conversationId]) {
      this.data.messages[msg.conversationId] = [];
    }

    const list = this.data.messages[msg.conversationId];
    if (!list.some((m) => m.id === msg.id)) {
      list.push(msg);
      this.save();
    }
  }

  public getMessages(conversationId: string): StoredMessage[] {
    return this.data.messages[conversationId] || [];
  }

  // --- Settings (Gemini, Persona, Delay, Handoff) ---
  public getSettings(tenantId: string): StoredSettings {
    const s = this.data.settings[tenantId];
    const key = s?.geminiApiKey || process.env.GEMINI_API_KEY || '';
    const rawModel = s?.geminiModel;
    const model = (!rawModel || rawModel === 'gemini-2.0-flash') ? 'gemini-2.5-flash' : rawModel;

    return {
      geminiApiKey: key,
      geminiModel: model,
      geminiSystemPrompt:
        s?.geminiSystemPrompt ||
        'أنت مساعد خدمة عملاء محترف للرد على استفسارات العملاء بدقة وإيجاز واحترافية عالية عبر الواتساب.',
      geminiAutoReplyEnabled: s?.geminiAutoReplyEnabled !== undefined ? s.geminiAutoReplyEnabled : true,
      aiProvider: s?.aiProvider || 'gemini',
      openrouterApiKey: s?.openrouterApiKey || process.env.OPENROUTER_API_KEY || '',
      openrouterModel: s?.openrouterModel || 'google/gemini-2.5-flash',
      dialect: s?.dialect || 'syrian',
      tone: s?.tone || 'friendly',
      customDialectPrompt: s?.customDialectPrompt || '',
      excludedPhoneNumbers: s?.excludedPhoneNumbers || [],
      autoReplyDelaySeconds: s?.autoReplyDelaySeconds !== undefined ? s.autoReplyDelaySeconds : 30,
      interMessageDelaySeconds: s?.interMessageDelaySeconds !== undefined ? s.interMessageDelaySeconds : 15,
      handoffKeywords: s?.handoffKeywords || ['موظف', 'بشري', 'شكوى', 'مدير', 'اتصال', 'تحويل', 'إلغاء'],
      handoffMaxTurns: s?.handoffMaxTurns !== undefined ? s.handoffMaxTurns : 5,
      handoffStopNotification:
        s?.handoffStopNotification ||
        'تم تحويل محادثتك إلى أحد موظفي خدمة العملاء وسيقوم بالرد عليك مباشرة في أقرب وقت ممكن. شكراً لصبرك!',
      pausedConversations: s?.pausedConversations || [],
      userMemoryEnabled: s?.userMemoryEnabled !== undefined ? s.userMemoryEnabled : true,
      userMemoryPrompt:
        s?.userMemoryPrompt ||
        'Remember durable, useful facts about this user so future conversations feel continuous and personalized across sessions — their explicit preferences, how they like to be addressed (name / preferred surname), their language, country and timezone, and any stated communication preferences or recurring needs. Focus on information that stays true over time and helps you serve them better next time. Do NOT store sensitive or regulated information — passwords, full credit-card or payment details, government IDs, health data, or similar — unless the user has explicitly asked you to remember it.',
      sendReadReceipts: s?.sendReadReceipts !== undefined ? s.sendReadReceipts : false,
      safetyGuardrails:
        s?.safetyGuardrails ||
        'لا تجمع أبداً عبر الدردشة بيانات حساسة: رقم بطاقة كامل، كلمات مرور، مفاتيح API، أو رموز OTP/صور، أو أكواد التحقق، أرقام هويات حكومية كاملة. لا تدّعي أنك تحققت من هوية المستخدم بنفسك. لا تؤكد أي معلومة غير موجودة بقاعدة المعرفة ولا تخمّن (خصوصاً السعر الأصلي المتضارب، التقسيط، أو أي تفاصيل تشغيلية غير مذكورة). عند نقص/تعارض المعلومات استخدم عبارة التحقق المحددة من أستاذ نواف، واصعّد مع تلخيص واضح لسؤال المستخدم وسياق المحادثة. لا توجّه المستخدم لموقع إلكتروني/رابط حجز غير مؤكد لأنه لا يوجد موقع مثبت.',
      errorRecovery:
        s?.errorRecovery ||
        'إذا صار خطأ أو تعثّر تقني، اعتذر باختصار وجرّب مرة ثانية أو اقترح خطوة بديلة بسيطة (مثلاً إعادة المحاولة على تيليجرام/تأكيد نوع الجهاز). لا تذكر تفاصيل داخلية أو أسماء أدوات/أخطاء نظام. إذا استمرّت المشكلة أو كانت خارج قاعدة المعرفة، اعرض تحويلها للمدرب مع تلخيص للسياق.',
      escalationEnabled: s?.escalationEnabled !== undefined ? s.escalationEnabled : true,
      escalationRules:
        s?.escalationRules ||
        'Escalate when:\n\n- Human request: Hand off immediately when the customer asks for a human.\n- High-stakes topics: Always hand off for Refunds & cancellations; Billing disputes; Account security; Legal & compliance; Outages & incidents; Enterprise contracts; اذا طلب دفع.\n- Failed resolution: Escalate after 2 failed attempts.\n- Frustration signals: Hand off for Repeated complaint.',
      escalationPreActions:
        s?.escalationPreActions ||
        'Collect relevant context, complete any checks, and set expectations.',
      outOfOfficeMessage:
        s?.outOfOfficeMessage ||
        'مرحباً بك! فريق خدمة العملاء غير متواجد حالياً خارج أوقات العمل الرسمية. تم تسجيل استفسارك وسيقوم موظفنا بالتواصل معك في أقرب وقت مع بداية دوام العمل القادم. شكراً لتفهمك!',
    };
  }

  public updateSettings(tenantId: string, updates: Partial<StoredSettings>): StoredSettings {
    const current = this.getSettings(tenantId);
    const updated = { ...current, ...updates };
    this.data.settings[tenantId] = updated;
    this.save();
    return updated;
  }

  public pauseConversationAutoReply(tenantId: string, convId: string): void {
    const settings = this.getSettings(tenantId);
    const paused = new Set(settings.pausedConversations || []);
    paused.add(convId);
    this.updateSettings(tenantId, { pausedConversations: Array.from(paused) });
  }

  public resumeConversationAutoReply(tenantId: string, convId: string): void {
    const settings = this.getSettings(tenantId);
    const paused = (settings.pausedConversations || []).filter((id) => id !== convId);
    this.updateSettings(tenantId, { pausedConversations: paused });
  }

  // --- Knowledge Base (Botpress-like) ---
  public getKnowledgeItems(tenantId: string): KnowledgeItem[] {
    return this.data.knowledge?.[tenantId] || [];
  }

  public addKnowledgeItem(
    tenantId: string,
    item: Omit<KnowledgeItem, 'id' | 'tenantId' | 'createdAt' | 'charCount'> & { charCount?: number }
  ): KnowledgeItem {
    if (!this.data.knowledge) this.data.knowledge = {};
    if (!this.data.knowledge[tenantId]) this.data.knowledge[tenantId] = [];

    const newItem: KnowledgeItem = {
      id: `kn_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      tenantId,
      title: item.title,
      type: item.type,
      content: item.content,
      source: item.source,
      charCount: item.content.length,
      createdAt: new Date().toISOString(),
    };

    this.data.knowledge[tenantId].unshift(newItem);
    this.save();
    return newItem;
  }

  public deleteKnowledgeItem(tenantId: string, id: string): boolean {
    if (!this.data.knowledge || !this.data.knowledge[tenantId]) return false;
    const initialLen = this.data.knowledge[tenantId].length;
    this.data.knowledge[tenantId] = this.data.knowledge[tenantId].filter((k) => k.id !== id);
    const changed = this.data.knowledge[tenantId].length < initialLen;
    if (changed) {
      this.save();
    }
    return changed;
  }
}

export const localStore = new LocalStoreManager();
