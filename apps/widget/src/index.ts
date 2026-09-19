import cssContent from './widget.css?inline';

interface WidgetConfig {
  tenantId: string;
  apiUrl: string;
  title: string;
  welcomeMessage: string;
  primaryColor?: string;
  position?: 'right' | 'left';
}

interface WidgetMessage {
  id: string;
  sender: 'visitor' | 'agent';
  text: string;
  timestamp: number;
}

class OmniChatWidget {
  private config: WidgetConfig = {
    tenantId: 'demo-tenant-1',
    apiUrl: 'http://localhost:4000',
    title: 'مساعد الذكاء الاصطناعي',
    welcomeMessage: 'مرحباً بك! كيف يمكننا مساعدتك اليوم؟',
    primaryColor: '#10b981',
    position: 'right',
  };

  private isOpen = false;
  private isTyping = false;
  private visitorId = '';
  private messages: WidgetMessage[] = [];
  private hasInitialized = false;

  public init(customConfig?: Partial<WidgetConfig>) {
    if (this.hasInitialized) return;
    this.hasInitialized = true;

    if (customConfig) {
      this.config = { ...this.config, ...customConfig };
    }

    this.initStorage();
    this.injectStyles();
    this.render();
  }

  private initStorage() {
    try {
      const storageKey = `omni_visitor_${this.config.tenantId}`;
      let vid = localStorage.getItem(storageKey);
      if (!vid) {
        vid = 'v_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
        localStorage.setItem(storageKey, vid);
      }
      this.visitorId = vid;

      const historyKey = `omni_history_${this.config.tenantId}`;
      const saved = localStorage.getItem(historyKey);
      if (saved) {
        this.messages = JSON.parse(saved);
      } else {
        this.messages = [
          {
            id: 'welcome_1',
            sender: 'agent',
            text: this.config.welcomeMessage,
            timestamp: Date.now(),
          },
        ];
      }
    } catch {
      this.visitorId = 'v_' + Math.random().toString(36).substring(2, 9);
      this.messages = [
        {
          id: 'welcome_1',
          sender: 'agent',
          text: this.config.welcomeMessage,
          timestamp: Date.now(),
        },
      ];
    }
  }

  private saveHistory() {
    try {
      const historyKey = `omni_history_${this.config.tenantId}`;
      localStorage.setItem(historyKey, JSON.stringify(this.messages.slice(-30)));
    } catch {}
  }

  private injectStyles() {
    if (typeof document === 'undefined') return;
    if (document.getElementById('omni-widget-styles')) return;

    const style = document.createElement('style');
    style.id = 'omni-widget-styles';
    style.textContent = cssContent;
    document.head.appendChild(style);

    // Apply custom brand primary color
    if (this.config.primaryColor) {
      document.documentElement.style.setProperty('--omni-primary', this.config.primaryColor);
    }
  }

  public toggle() {
    this.isOpen = !this.isOpen;
    const chatWindow = document.getElementById('omni-chat-window');
    const launcher = document.getElementById('omni-launcher');
    if (chatWindow) {
      chatWindow.style.display = this.isOpen ? 'flex' : 'none';
      if (this.isOpen) {
        setTimeout(() => {
          const input = document.getElementById('omni-input') as HTMLInputElement;
          input?.focus();
          this.scrollToBottom();
        }, 100);
      }
    }
    if (launcher) {
      launcher.innerHTML = this.isOpen
        ? `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`
        : `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>`;
    }
  }

  private async sendMessage(text: string) {
    if (!text.trim() || this.isTyping) return;

    const userMsg: WidgetMessage = {
      id: `msg_${Date.now()}`,
      sender: 'visitor',
      text: text.trim(),
      timestamp: Date.now(),
    };

    this.messages.push(userMsg);
    this.saveHistory();
    this.updateMessagesDOM();

    // Show typing indicator
    this.isTyping = true;
    this.renderTypingIndicator(true);

    try {
      const historyPayload = this.messages.slice(-8).map((m) => ({
        sender: m.sender,
        text: m.text,
      }));

      const res = await fetch(`${this.config.apiUrl}/api/widget/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': this.config.tenantId,
        },
        body: JSON.stringify({
          tenantId: this.config.tenantId,
          visitorId: this.visitorId,
          message: text.trim(),
          history: historyPayload,
        }),
      });

      if (!res.ok) {
        throw new Error('Network error');
      }

      const data = await res.json();
      this.isTyping = false;
      this.renderTypingIndicator(false);

      const bubbles: string[] = Array.isArray(data.bubbles) && data.bubbles.length > 0
        ? data.bubbles
        : [data.reply || 'شكراً لتواصلك معنا!'];

      // Render bubbles with natural pacing
      for (let i = 0; i < bubbles.length; i++) {
        if (i > 0) {
          // Show brief typing before bubble 2
          this.renderTypingIndicator(true);
          await new Promise((r) => setTimeout(r, 1200));
          this.renderTypingIndicator(false);
        }

        const agentMsg: WidgetMessage = {
          id: `reply_${Date.now()}_${i}`,
          sender: 'agent',
          text: bubbles[i],
          timestamp: Date.now(),
        };

        this.messages.push(agentMsg);
        this.saveHistory();
        this.updateMessagesDOM();
      }
    } catch (err) {
      console.warn('[OmniChatWidget] Error connecting to backend:', err);
      this.isTyping = false;
      this.renderTypingIndicator(false);

      this.messages.push({
        id: `err_${Date.now()}`,
        sender: 'agent',
        text: 'عذراً، حدث خطأ مؤقت في الاتصال. يرجى المحاولة بعد قليل أو التواصل معنا عبر الواتساب مباشرة.',
        timestamp: Date.now(),
      });
      this.saveHistory();
      this.updateMessagesDOM();
    }
  }

  private updateMessagesDOM() {
    const container = document.getElementById('omni-messages-body');
    if (!container) return;

    container.innerHTML = this.messages
      .map(
        (m) =>
          `<div class="omni-bubble ${m.sender}">${this.escapeHtml(m.text)}</div>`
      )
      .join('');

    this.scrollToBottom();
  }

  private renderTypingIndicator(show: boolean) {
    const container = document.getElementById('omni-messages-body');
    if (!container) return;

    const existing = document.getElementById('omni-typing-indicator');
    if (show && !existing) {
      const typingEl = document.createElement('div');
      typingEl.id = 'omni-typing-indicator';
      typingEl.className = 'omni-bubble agent typing';
      typingEl.innerHTML = `
        <span class="omni-typing-dot"></span>
        <span class="omni-typing-dot"></span>
        <span class="omni-typing-dot"></span>
      `;
      container.appendChild(typingEl);
      this.scrollToBottom();
    } else if (!show && existing) {
      existing.remove();
    }
  }

  private scrollToBottom() {
    const container = document.getElementById('omni-messages-body');
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }

  private escapeHtml(str: string): string {
    return str.replace(/[&<>'"]/g, 
      (tag) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
  }

  private render() {
    if (typeof document === 'undefined') return;

    const root = document.createElement('div');
    root.className = `omni-widget-container ${this.config.position === 'left' ? 'position-left' : ''}`;
    root.innerHTML = `
      <div id="omni-chat-window" class="omni-chat-window" style="display: none;">
        <div class="omni-header">
          <div>
            <div class="omni-header-title">${this.escapeHtml(this.config.title)}</div>
            <div class="omni-header-status">
              <span class="omni-status-dot"></span>
              <span>متصل الآن • رد فوري</span>
            </div>
          </div>
          <button id="omni-close-btn" class="omni-close-btn" aria-label="إغلاق المحادثة">✕</button>
        </div>
        <div id="omni-messages-body" class="omni-messages-body"></div>
        <div class="omni-composer">
          <input id="omni-input" class="omni-input" type="text" placeholder="اكتب استفسارك هنا..." autocomplete="off" />
          <button id="omni-send-btn" class="omni-send-btn">إرسال</button>
        </div>
      </div>
      <button id="omni-launcher" class="omni-launcher-btn" aria-label="فتح المحادثة المباشرة">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
      </button>
    `;

    document.body.appendChild(root);

    // Event bindings
    document.getElementById('omni-launcher')?.addEventListener('click', () => this.toggle());
    document.getElementById('omni-close-btn')?.addEventListener('click', () => this.toggle());

    const input = document.getElementById('omni-input') as HTMLInputElement;
    const sendBtn = document.getElementById('omni-send-btn') as HTMLButtonElement;

    const handleSend = () => {
      if (input && input.value.trim()) {
        const val = input.value;
        input.value = '';
        this.sendMessage(val);
      }
    };

    sendBtn?.addEventListener('click', handleSend);
    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSend();
      }
    });

    this.updateMessagesDOM();
  }
}

// Global Singleton
const instance = new OmniChatWidget();
(window as any).OmniChatWidget = instance;

// Auto-initialize if embedded directly via <script data-tenant-id="..." ...>
if (typeof document !== 'undefined') {
  const currentScript = document.currentScript as HTMLScriptElement;
  if (currentScript) {
    const tenantId = currentScript.getAttribute('data-tenant-id');
    const apiUrl = currentScript.getAttribute('data-api-url');
    const title = currentScript.getAttribute('data-title');
    const welcome = currentScript.getAttribute('data-welcome');
    const color = currentScript.getAttribute('data-color');
    const position = currentScript.getAttribute('data-position') as 'right' | 'left';

    const autoStart = () => {
      instance.init({
        tenantId: tenantId || 'demo-tenant-1',
        apiUrl: apiUrl || (currentScript.src ? new URL(currentScript.src).origin : 'http://localhost:4000'),
        title: title || 'مساعد الذكاء الاصطناعي',
        welcomeMessage: welcome || 'مرحباً بك! كيف يمكننا مساعدتك اليوم؟',
        primaryColor: color || '#10b981',
        position: position || 'right',
      });
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', autoStart);
    } else {
      autoStart();
    }
  }
}

export default instance;
