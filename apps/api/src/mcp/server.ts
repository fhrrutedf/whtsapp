/**
 * OmniDesk Enterprise MCP Server (Model Context Protocol)
 * Implements JSON-RPC 2.0 over stdio for seamless integration with
 * Antigravity, Claude Desktop, Cursor, and any MCP-compliant AI assistant.
 */

import * as readline from 'readline';
import { skillRegistry } from '../skills/registry';
import { localStore } from '../services/store.service';
import { KnowledgeService } from '../services/knowledge.service';
import { whatsAppManager } from '../services/whatsapp.service';

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id?: number | string | null;
  method: string;
  params?: any;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: number | string | null;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

class OmniDeskMcpServer {
  private rl: readline.Interface;

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false,
    });
  }

  public start(): void {
    // Note: Log diagnostics exclusively to stderr to keep stdout strictly JSON-RPC clean
    console.error('[OmniDesk-MCP] Server starting up on stdio...');

    this.rl.on('line', async (line: string) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      try {
        const req: JsonRpcRequest = JSON.parse(trimmed);
        await this.handleRequest(req);
      } catch (err: any) {
        this.sendError(null, -32700, `Parse error: ${err.message}`);
      }
    });

    this.rl.on('close', () => {
      console.error('[OmniDesk-MCP] Stdio channel closed. Exiting.');
      process.exit(0);
    });
  }

  private async handleRequest(req: JsonRpcRequest): Promise<void> {
    const { id, method, params } = req;

    // Notifications do not expect a response
    if (id === undefined || id === null) {
      if (method === 'notifications/initialized') {
        console.error('[OmniDesk-MCP] Client completed initialization.');
      }
      return;
    }

    try {
      switch (method) {
        case 'initialize':
          this.sendResult(id, {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: {},
              resources: {},
              prompts: {},
            },
            serverInfo: {
              name: 'omnidesk-helpdesk-mcp',
              version: '1.0.0',
            },
          });
          break;

        case 'tools/list': {
          const registeredSkills = skillRegistry.getAllSkills();
          const tools = registeredSkills.map((s) => {
            const decl = s.toToolDeclaration();
            return {
              name: decl.name,
              description: decl.description,
              inputSchema: decl.parameters,
            };
          });

          // Add Extra WhatsApp & Helpdesk operational tools
          tools.push(
            {
              name: 'send_whatsapp_message',
              description: 'Send or enqueue a stealth, human-like WhatsApp message to a customer.',
              inputSchema: {
                type: 'object',
                properties: {
                  tenantId: { type: 'string', description: 'The unique tenant ID' },
                  toPhone: { type: 'string', description: 'Target phone number with country code' },
                  message: { type: 'string', description: 'Message body in natural text' },
                },
                required: ['tenantId', 'toPhone', 'message'],
              },
            },
            {
              name: 'query_knowledge_base',
              description: 'Retrieve RAG knowledge base articles and context for a specific tenant.',
              inputSchema: {
                type: 'object',
                properties: {
                  tenantId: { type: 'string', description: 'Tenant ID to fetch knowledge for' },
                },
                required: ['tenantId'],
              },
            },
            {
              name: 'get_customer_info',
              description: 'Fetch persistent contact memory facts, tags, and conversation notes.',
              inputSchema: {
                type: 'object',
                properties: {
                  tenantId: { type: 'string', description: 'Tenant ID' },
                  phone: { type: 'string', description: 'Customer phone number' },
                },
                required: ['tenantId', 'phone'],
              },
            }
          );

          this.sendResult(id, { tools });
          break;
        }

        case 'tools/call': {
          const { name, arguments: toolArgs } = params || {};
          console.error(`[OmniDesk-MCP] Executing tool "${name}" with args:`, toolArgs);

          // Check if it's one of our registered 7 skills
          const skill = skillRegistry.getSkill(name);
          if (skill) {
            const context = {
              tenantId: toolArgs?.tenantId || 'demo-tenant-1',
              conversationId: toolArgs?.conversationId || `conv_${Date.now()}`,
              contactPhone: toolArgs?.contactPhone || toolArgs?.customerPhone || 'unknown',
              customerName: toolArgs?.customerName,
              customerPhone: toolArgs?.customerPhone,
            };

            const result = await skill.execute(context, toolArgs || {});
            this.sendResult(id, {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2),
                },
              ],
            });
            break;
          }

          // Handle extra helpdesk tools
          if (name === 'send_whatsapp_message') {
            const { tenantId, toPhone, message } = toolArgs || {};
            await whatsAppManager.enqueueOutgoingMessage({
              tenantId,
              toPhone,
              text: message,
              senderType: 'BOT',
              senderName: 'MCP Agent',
            });
            this.sendResult(id, {
              content: [
                {
                  type: 'text',
                  text: `Message queued for ${toPhone} via OutgoingWhatsAppQueue with stealth delay.`,
                },
              ],
            });
            break;
          }

          if (name === 'query_knowledge_base') {
            const { tenantId } = toolArgs || {};
            const context = KnowledgeService.getKnowledgeContext(tenantId || 'demo-tenant-1');
            this.sendResult(id, {
              content: [{ type: 'text', text: context || 'No knowledge base documents indexed.' }],
            });
            break;
          }

          if (name === 'get_customer_info') {
            const { tenantId, phone } = toolArgs || {};
            const contact = localStore.getContactByPhone(tenantId || 'demo-tenant-1', phone);
            this.sendResult(id, {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(contact || { error: 'Contact not found' }, null, 2),
                },
              ],
            });
            break;
          }

          this.sendError(id, -32601, `Unknown tool: ${name}`);
          break;
        }

        case 'resources/list': {
          this.sendResult(id, {
            resources: [
              {
                uri: 'omnidesk://skills/catalog',
                name: 'Active AI Skills Catalog',
                description: 'Full list of sales and operations skills with their system prompts.',
                mimeType: 'text/markdown',
              },
              {
                uri: 'omnidesk://rules/stealth-anti-ban',
                name: 'Stealth & Anti-Ban Hardening Rules',
                description: 'Operational guidelines for natural typing jitter and rate limits.',
                mimeType: 'text/markdown',
              },
            ],
          });
          break;
        }

        case 'resources/read': {
          const { uri } = params || {};
          if (uri === 'omnidesk://skills/catalog') {
            const content = skillRegistry.getCombinedSystemPrompts();
            this.sendResult(id, {
              contents: [
                {
                  uri,
                  mimeType: 'text/markdown',
                  text: `# OmniDesk Active AI Skills\n\n${content}`,
                },
              ],
            });
          } else if (uri === 'omnidesk://rules/stealth-anti-ban') {
            const rules =
              `# WhatsApp Anti-Ban & Human Stealth Rules\n\n` +
              `1. Concurrency: Process only ONE message per tenant at a time.\n` +
              `2. Natural Typing: Delay = 3-5 seconds + 45ms per character (capped at 12s).\n` +
              `3. Anti-Flood: Enforce minimum 4 seconds cooldown between messages.\n` +
              `4. Opt-Out: Immediate suppression when user sends "stop", "إلغاء", or "توقف".\n`;
            this.sendResult(id, {
              contents: [{ uri, mimeType: 'text/markdown', text: rules }],
            });
          } else {
            this.sendError(id, -32602, `Resource not found: ${uri}`);
          }
          break;
        }

        case 'prompts/list': {
          this.sendResult(id, {
            prompts: [
              {
                name: 'sales_closer_arabic',
                description: 'Direct closing prompt for high-intent Arab customers.',
              },
              {
                name: 'objection_handler_arabic',
                description: 'Reframe price objections into concrete ROI.',
              },
            ],
          });
          break;
        }

        case 'prompts/get': {
          const { name } = params || {};
          if (name === 'sales_closer_arabic') {
            this.sendResult(id, {
              description: 'Direct closing prompt in street-smart Arabic',
              messages: [
                {
                  role: 'user',
                  content: {
                    type: 'text',
                    text: 'أنت في مرحلة إغلاق البيعة. العميل جاهز للدفع. قدم رابط الدفع بأسلوب حاسم ومرحب دون أسئلة إضافية.',
                  },
                },
              ],
            });
          } else if (name === 'objection_handler_arabic') {
            this.sendResult(id, {
              description: 'Objection handling prompt in street-smart Arabic',
              messages: [
                {
                  role: 'user',
                  content: {
                    type: 'text',
                    text: 'تعامل مع اعتراض السعر بذكاء واحتواء. اعترف بالسعر ثم اشرح العائد على الاستثمار والضمان.',
                  },
                },
              ],
            });
          } else {
            this.sendError(id, -32601, `Prompt not found: ${name}`);
          }
          break;
        }

        default:
          this.sendError(id, -32601, `Method not implemented: ${method}`);
      }
    } catch (err: any) {
      console.error(`[OmniDesk-MCP] Internal error processing ${method}:`, err);
      this.sendError(id, -32603, `Internal error: ${err.message}`);
    }
  }

  private sendResult(id: number | string | null, result: any): void {
    const res: JsonRpcResponse = {
      jsonrpc: '2.0',
      id,
      result,
    };
    process.stdout.write(JSON.stringify(res) + '\n');
  }

  private sendError(id: number | string | null, code: number, message: string, data?: any): void {
    const res: JsonRpcResponse = {
      jsonrpc: '2.0',
      id,
      error: { code, message, data },
    };
    process.stdout.write(JSON.stringify(res) + '\n');
  }
}

// Start MCP Server if executed directly
if (require.main === module) {
  const server = new OmniDeskMcpServer();
  server.start();
}

export { OmniDeskMcpServer };
