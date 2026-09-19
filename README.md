# 🚀 Enterprise Omnichannel Helpdesk Platform (Meta WhatsApp Compliant)

A high-performance, multi-tenant SaaS Helpdesk (Zendesk / Chatwoot alternative) engineered for WhatsApp Cloud API, Messenger, and live Web Widget with strict 24-hour compliance and anti-ban safeguards.

---

## 🏗 Architecture Overview

```text
omnichannel-platform/
├── apps/
│   ├── api/          # Express.js, TypeScript, BullMQ, Redis, Prisma, Socket.io
│   ├── dashboard/    # Next.js 15 (App Router), React, TailwindCSS, Zustand
│   └── widget/       # Preact/Vanilla TS embeddable chat widget (Vite)
└── packages/
    ├── database/     # Prisma schema with multi-tenant models & 24h Meta fields
    └── types/        # Shared DTOs, Meta webhook contracts & Socket.io events
```

---

## 🛡️ Meta Anti-Ban Compliance Rules Built-In

1. **Immediate HTTP 200 OK Webhook**: Acknowledges incoming Meta webhooks in `< 50ms` prior to database writes or parsing to prevent webhook timeouts and retry storms.
2. **Asynchronous BullMQ Queue**: Heavy payload ingestion, contact upsertion, and conversation handling are processed asynchronously via Redis.
3. **Strict 24-Hour Care Window**:
   - `lastCustomerMessageAt` and `windowExpiresAt` are updated **only on incoming customer messages**.
   - Agent free-form replies are locked if 24 hours have elapsed.
   - The UI automatically unlocks the **Meta Pre-Approved Template Selector**.
4. **Tenant Outgoing Rate-Limiter**: Redis sliding window log throttles outgoing Graph API calls to prevent spam flags.
5. **HMAC-SHA256 Cryptographic Verification**: Verifies `x-hub-signature-256` using the raw request body buffer.
6. **Hub Challenge Handshake**: Complete implementation for `hub.mode`, `hub.verify_token`, and `hub.challenge`.

---

## ⚡ Quick Start

### 1. Start Infrastructure (PostgreSQL & Redis)
```bash
docker compose up -d
```

### 2. Install Monorepo Dependencies
```bash
npm install
```

### 3. Generate Database Client & Push Schema
```bash
npm run db:push
```

### 4. Run All Services with Turborepo
```bash
npm run dev
```

- **Agent Dashboard**: `http://localhost:3000`
- **Backend API**: `http://localhost:4000`
- **Chat Widget Demo**: `http://localhost:5173`
