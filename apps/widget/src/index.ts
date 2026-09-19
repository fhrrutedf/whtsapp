import './widget.css';

interface WidgetConfig {
  tenantId: string;
  apiUrl?: string;
  title?: string;
}

interface WidgetMessage {
  id: string;
  sender: 'visitor' | 'agent';
  text: string;
  timestamp: number;
}

class OmniChatWidget {
  private config: WidgetConfig = {
    tenantId: 'demo-tenant',
    apiUrl: 'http://localhost:4000',
    title: 'الدعم الفني المباشر',
  };

  private isOpen = false;
  private messages: WidgetMessage[] = [
    {
      id: 'welcome_1',
      sender: 'agent',
      text: 'مرحباً بك! كيف يمكننا مساعدتك اليوم؟',
      timestamp: Date.now(),
    },
  ];

  public init(customConfig?: Partial<WidgetConfig>) {
    if (customConfig) {
      this.config = { ...this.config, ...customConfig };
    }
    this.render();
  }

  private toggle() {
    this.isOpen = !this.isOpen;
    const chatWindow = document.getElementById('omni-chat-window');
    const launcher = document.getElementById('omni-launcher');
    if (chatWindow) {
      chatWindow.style.display = this.isOpen ? 'flex' : 'none';
    }
    if (launcher) {
      launcher.innerHTML = this.isOpen
        ? `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`
        : `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>`;
    }
  }

  private sendMessage(text: string) {
    if (!text.trim()) return;

    const newMsg: WidgetMessage = {
      id: `msg_${Date.now()}`,
      sender: 'visitor',
      text,
      timestamp: Date.now(),
    };

    this.messages.push(newMsg);
    this.updateMessagesDOM();

    // In a real session, dispatch over HTTP / WebSocket to backend:
    // fetch(`${this.config.apiUrl}/api/widget/message`, ...)

    // Simulate Agent Optimistic Auto-reply for demo
    setTimeout(() => {
      this.messages.push({
        id: `reply_${Date.now()}`,
        sender: 'agent',
        text: 'تم استلام استفسارك! سيتواصل معك أحد وكلائنا خلال لحظات.',
        timestamp: Date.now(),
      });
      this.updateMessagesDOM();
    }, 1200);
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
    container.scrollTop = container.scrollHeight;
  }

  private escapeHtml(str: string): string {
    return str.replace(/[&<>'"]/g, 
      (tag) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
  }

  private render() {
    const root = document.createElement('div');
    root.className = 'omni-widget-container';
    root.innerHTML = `
      <div id="omni-chat-window" class="omni-chat-window" style="display: none;">
        <div class="omni-header">
          <div>
            <div class="omni-header-title">${this.config.title}</div>
            <div class="omni-header-status">
              <span class="omni-status-dot"></span>
              <span>متصل الآن</span>
            </div>
          </div>
          <button id="omni-close-btn" class="omni-close-btn" aria-label="Close Chat">✕</button>
        </div>
        <div id="omni-messages-body" class="omni-messages-body"></div>
        <div class="omni-composer">
          <input id="omni-input" class="omni-input" type="text" placeholder="اكتب رسالتك..." />
          <button id="omni-send-btn" class="omni-send-btn">إرسال</button>
        </div>
      </div>
      <button id="omni-launcher" class="omni-launcher-btn" aria-label="Open Chat">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
      </button>
    `;

    document.body.appendChild(root);

    // Event bindings
    document.getElementById('omni-launcher')?.addEventListener('click', () => this.toggle());
    document.getElementById('omni-close-btn')?.addEventListener('click', () => this.toggle());

    const input = document.getElementById('omni-input') as HTMLInputElement;
    const sendBtn = document.getElementById('omni-send-btn');

    const handleSend = () => {
      if (input && input.value) {
        this.sendMessage(input.value);
        input.value = '';
      }
    };

    sendBtn?.addEventListener('click', handleSend);
    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleSend();
    });

    this.updateMessagesDOM();
  }
}

// Attach globally for script-tag embedding
(window as any).OmniChatWidget = new OmniChatWidget();
export default (window as any).OmniChatWidget;
