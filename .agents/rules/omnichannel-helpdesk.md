# OmniDesk Architecture & Rules

## 1. Baileys WhatsApp Anti-Ban & Stealth Hardening
- **Outgoing Queue**: Never send messages directly to the Baileys socket. All outgoing messages MUST be enqueued to `OutgoingWhatsAppQueue`.
- **Concurrency**: Process exactly 1 message at a time per tenant (`concurrency: 1`).
- **Humanizer Delay**: Calculate natural delay = `3000ms + (charCount * 45ms) + jitter`, capped at 12s.
- **Cool-down**: Maintain a strict 4-6 second gap between outgoing messages.
- **Opt-Out**: Instantly flag `is_opted_out = true` upon receiving "stop", "إلغاء", or "توقف".

## 2. Multi-Tenant AI Skills Architecture
- All AI skills extend `BaseSkill` in `apps/api/src/skills/base.skill.ts`.
- Skills must expose:
  - `toToolDeclaration()`: For Google Gemini and OpenAI / OpenRouter function calling.
  - `getFormattedInstruction()`: Street-smart Arabic system prompts.
  - `execute(context, args)`: Business logic with DB updates and suggested customer reply.
- Skills must be registered in `SkillRegistry` (`apps/api/src/skills/registry.ts`).

## 3. MCP Server Protocol
- The project runs an MCP server at `apps/api/src/mcp/server.ts`.
- Exposes tools, resources, and prompts over stdio JSON-RPC 2.0.
- Registered in `.agents/mcp_config.json`.
