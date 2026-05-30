# 🤖 AfriBot Agency OS
### Multi-Tenant WhatsApp AI Automation Platform for Africa

Built for Lagos-based agencies managing multiple business clients with full AI automation, inventory management, and Paystack payments.

---

## 🏗️ Architecture

```
afribot/
├── apps/
│   ├── api/          # NestJS + TypeScript backend
│   └── web/          # Next.js 15 + Tailwind + shadcn/ui frontend
├── packages/
│   └── shared/       # Shared types, constants, utilities
└── infrastructure/
    ├── supabase-schema.sql  # Complete DB schema
    ├── docker/              # Docker Compose
    └── nginx/               # Reverse proxy config
```

**Tech Stack:**
- **Backend:** NestJS (TypeScript), Supabase (PostgreSQL + pgvector), Redis + BullMQ
- **Frontend:** Next.js 15 (App Router), Tailwind, shadcn/ui, TanStack Query, Zustand
- **AI:** Claude (Anthropic) primary, GPT-4o fallback, RAG via pgvector
- **WhatsApp:** 360Dialog Partner API (recommended) or Meta Cloud API direct
- **Payments:** Paystack (NGN, multi-method)
- **Auth:** Clerk (recommended) or Supabase Auth
- **Monitoring:** Sentry, Winston, BullMQ Dashboard

---

## 📋 PHASE 1 CHECKLIST — Before You Code

Complete these in order before running the project:

### 1. Supabase Setup (FREE → $25/mo)
- [ ] Create project at https://app.supabase.com
- [ ] Run `infrastructure/supabase-schema.sql` in SQL Editor
- [ ] Enable pgvector extension (Database → Extensions → vector)
- [ ] Copy URL, anon key, and service role key to `.env`

### 2. 360Dialog Agency Account (PAID — critical path)
- [ ] Apply at: https://www.360dialog.com/partners (agency partner program)
- [ ] Get approved (1-3 business days — email them for faster processing)
- [ ] Receive your `DIALOG360_PARTNER_TOKEN` and `DIALOG360_PARTNER_ID`
- [ ] For each client: create channel via API or their Hub dashboard
- **Cost:** ~$5-10/month per client WABA + per-message fees

### 3. Meta Business Verification (FREE but required)
- [ ] Create Meta Business Account: https://business.facebook.com
- [ ] Submit Business Verification (passport/CAC + utility bill for Nigeria)
- [ ] Wait 1-7 days for approval
- [ ] 360Dialog will link client WABAs once you have the partner token

### 4. Anthropic API Key
- [ ] Sign up at: https://console.anthropic.com
- [ ] Create API key → add to `.env` as `ANTHROPIC_API_KEY`
- **Cost:** ~$0.003/1K tokens (claude-sonnet-4) — very affordable for most usage

### 5. OpenAI API Key (Fallback)
- [ ] https://platform.openai.com → API Keys
- **Cost:** Pay-per-use, minimal for fallback role

### 6. Paystack Account
- [ ] Sign up: https://dashboard.paystack.com
- [ ] Complete KYC verification (BVN + CAC docs for business account)
- [ ] Get live keys once verified
- **Cost:** 1.5% + ₦100 per transaction (capped at ₦2,000)

### 7. Clerk Auth
- [ ] https://dashboard.clerk.com → create application
- [ ] Copy publishable key + secret key to `.env`
- **Cost:** FREE up to 10,000 monthly active users

### 8. Sentry (Error monitoring)
- [ ] https://sentry.io → create project (Node.js + Next.js)
- **Cost:** FREE for up to 5,000 errors/month

### 9. Redis (Required for queues)
- [ ] Local: `docker run -d -p 6379:6379 redis:alpine`
- [ ] Production: Railway ($5/mo) or Upstash (pay-per-request)

---

## 🚀 Local Development Setup

### Prerequisites
- Node.js 20+
- Docker + Docker Compose
- Git

### Step 1: Clone & Install
```bash
git clone https://github.com/yourusername/afribot-agency-os
cd afribot-agency-os
cp .env.example .env
# Fill in all values in .env
npm install
```

### Step 2: Start Infrastructure
```bash
# Start PostgreSQL + Redis locally
npm run docker:up

# Run database schema
npm run db:migrate

# Seed test data (3 sample businesses)
npm run db:seed
```

### Step 3: Start Development Servers
```bash
# Start both API + Web concurrently
npm run dev

# Or separately:
npm run dev:api    # http://localhost:3001
npm run dev:web    # http://localhost:3000

# Swagger API docs: http://localhost:3001/api/docs
# Bull dashboard: http://localhost:3002
```

---

## 🌐 Production Deployment

### Option A: Railway (Recommended for starters — ~$20-30/mo total)
```bash
# Install Railway CLI
npm install -g @railway/cli
railway login

# Create project
railway init

# Deploy API
cd apps/api && railway up

# Deploy web
cd apps/web && railway up

# Add Redis plugin in Railway dashboard
# Connect Supabase via DATABASE_URL env var
```

### Option B: Render
```bash
# Create render.yaml in root (included in repo)
# Connect GitHub repo to Render
# Set all env vars in Render dashboard
```

### Option C: Fly.io + Vercel (Best performance)
```bash
# Deploy API to Fly.io
cd apps/api
fly launch
fly secrets set $(cat ../../.env | grep -v '^#' | xargs)
fly deploy

# Deploy Web to Vercel
cd apps/web
vercel --prod
```

### Webhook URL Configuration
After deploying the API, configure your webhook URL in 360Dialog/Meta:
```
https://YOUR-API-DOMAIN/api/v1/whatsapp/webhook
```

---

## 📱 Onboarding Your First Client

1. **Create tenant** — POST `/api/v1/tenants`
2. **Connect WhatsApp** — Use 360Dialog Partner API to provision their WABA
3. **Configure AI Agent** — POST `/api/v1/tenants/:id/ai-agents`
4. **Add knowledge base** — Upload FAQs, product catalog, policies
5. **Add products** — POST `/api/v1/tenants/:id/products` (with images)
6. **Set inventory** — Initial stock counts
7. **Test bot** — Send WhatsApp message to client's number
8. **Go live** — Toggle `is_active: true` on their WhatsApp account

---

## 💰 Pricing Strategy for Your Agency

| Plan | Price/mo | Features |
|------|----------|----------|
| Starter | ₦15,000 | 1 WA number, 500 AI msgs, basic inventory |
| Growth | ₦25,000 | 2 WA numbers, 2,000 AI msgs, full inventory + orders |
| Pro | ₦45,000 | 3 WA numbers, 5,000 AI msgs, broadcasts, analytics |
| Enterprise | Custom | Unlimited, white-label, priority support |

**Your costs per client (approx):**
- 360Dialog: ~₦5,000-8,000/mo
- AI API: ~₦1,000-3,000/mo (depending on usage)
- Infrastructure share: ~₦1,500/mo
- **Total cost:** ~₦7,500-12,000/mo
- **Margin on Starter plan:** ₦3,000-7,500 (20-50%)
- **Margin on Growth plan:** ₦13,000-17,500 (52-70%)

---

## 🏛️ Multi-Tenant Architecture

Data isolation is enforced at multiple levels:

1. **Application level:** All queries include `tenant_id` filter
2. **Database level:** Row Level Security (RLS) policies in Supabase
3. **API level:** Tenant middleware extracts and validates tenant from JWT
4. **Webhook level:** Routes by `phone_number_id` → unique per tenant

Each client has completely isolated:
- Contacts & conversations
- Products & inventory
- Orders & payments
- AI agent configuration
- Knowledge base / RAG data
- Analytics

---

## 🤖 AI System Architecture

```
Customer Message
      ↓
WhatsApp Webhook (single endpoint)
      ↓
Tenant Resolution (by phone_number_id)
      ↓
BullMQ Queue (async processing)
      ↓
AI Agent Service
  ├── Check handoff keywords → Human
  ├── RAG: pgvector semantic search → Context
  ├── Build system prompt (persona + context)
  ├── Try Claude (primary)
  │   ├── Success → Tool Use (orders, inventory, payments)
  │   └── Fail → GPT-4o fallback
  └── Send WhatsApp response
```

**Tool Use Capabilities:**
- `create_order` — AI takes orders and builds cart
- `check_inventory` — Real-time stock lookup
- `generate_payment_link` — Paystack link creation
- `book_appointment` — Calendar integration (optional)
- `qualify_lead` — Collect contact info

---

## 📊 API Endpoints (Summary)

### Agency Admin
- `GET /api/v1/tenants` — List all clients
- `POST /api/v1/tenants` — Create new client
- `GET /api/v1/analytics/agency` — Agency-wide metrics

### Per-Client (requires tenant context)
- `GET /api/v1/conversations` — Client conversations
- `GET /api/v1/orders` — Client orders
- `POST /api/v1/inventory/products` — Add product
- `POST /api/v1/inventory/restock` — Restock items
- `GET /api/v1/inventory/alerts` — Low stock alerts
- `POST /api/v1/broadcasts` — Create broadcast campaign
- `GET /api/v1/analytics` — Client analytics

### Webhooks
- `GET /api/v1/whatsapp/webhook` — Meta verification
- `POST /api/v1/whatsapp/webhook` — Incoming messages
- `POST /api/v1/billing/paystack/webhook` — Payment confirmations

Full API docs at `/api/docs` (Swagger)

---

## 🔒 Security

- OWASP Top 10 mitigations applied
- HMAC-SHA256 webhook signature verification
- JWT + Clerk auth on all protected routes
- Rate limiting (100 req/min global, 500/min webhooks)
- Helmet.js security headers
- Row Level Security in Supabase
- Encrypted env vars in production
- Sentry error monitoring

---

## 📞 Support

Built by and for Lagos agency owners.
- WhatsApp: +234 800 000 0000
- Email: support@youragency.com
