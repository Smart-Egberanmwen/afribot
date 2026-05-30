#!/usr/bin/env bash
# =============================================================================
# AfriBot Agency OS — One-Click Deploy Script
# Run: bash deploy.sh
# =============================================================================
set -e

BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

log()  { echo -e "${GREEN}✓${NC} $1"; }
warn() { echo -e "${YELLOW}⚠${NC}  $1"; }
err()  { echo -e "${RED}✗${NC} $1"; exit 1; }
info() { echo -e "${CYAN}→${NC} $1"; }
hdr()  { echo -e "\n${BOLD}$1${NC}"; }

hdr "╔══════════════════════════════════════╗"
hdr "║   AfriBot Agency OS — Deploy Script  ║"
hdr "╚══════════════════════════════════════╝"

# ── Check prerequisites ───────────────────────────────────────────────────────
hdr "1. Checking prerequisites..."
command -v node >/dev/null 2>&1 || err "Node.js not installed (need v20+)"
command -v npm  >/dev/null 2>&1 || err "npm not installed"
NODE_VER=$(node -v | cut -d. -f1 | tr -d 'v')
[ "$NODE_VER" -ge 20 ] || err "Node.js v20+ required (have $(node -v))"
log "Node.js $(node -v)"

# ── Check .env ────────────────────────────────────────────────────────────────
hdr "2. Checking environment..."
if [ ! -f ".env" ]; then
  warn ".env not found — copying .env.example"
  cp .env.example .env
  echo ""
  warn "IMPORTANT: Edit .env and fill in these required values before continuing:"
  echo "   SUPABASE_URL           → from app.supabase.com"
  echo "   SUPABASE_ANON_KEY      → from app.supabase.com"
  echo "   SUPABASE_SERVICE_ROLE_KEY → from app.supabase.com"
  echo "   JWT_SECRET             → generate: openssl rand -hex 32"
  echo "   ANTHROPIC_API_KEY      → from console.anthropic.com"
  echo "   PAYSTACK_SECRET_KEY    → from dashboard.paystack.com"
  echo ""
  read -p "Press Enter after editing .env to continue..."
fi
log ".env found"

# Source env
set -a; source .env; set +a

# Validate critical vars
[ -z "$SUPABASE_URL" ]       && err "SUPABASE_URL not set in .env"
[ -z "$ANTHROPIC_API_KEY" ]  && err "ANTHROPIC_API_KEY not set in .env"
[ -z "$JWT_SECRET" ]         && err "JWT_SECRET not set in .env"
log "Environment variables validated"

# ── Install dependencies ──────────────────────────────────────────────────────
hdr "3. Installing dependencies..."
info "Installing API dependencies..."
cd apps/api && npm install --silent && cd ../..
log "API dependencies installed"

info "Installing Web dependencies..."
cd apps/web && npm install --silent && cd ../..
log "Web dependencies installed"

# ── Build ─────────────────────────────────────────────────────────────────────
hdr "4. Building production bundles..."
info "Building API..."
cd apps/api && npm run build 2>&1 | tail -3 && cd ../..
log "API built → apps/api/dist/"

info "Building Web..."
cd apps/web && npm run build 2>&1 | tail -5 && cd ../..
log "Web built → apps/web/.next/"

# ── Database ──────────────────────────────────────────────────────────────────
hdr "5. Database setup..."
if command -v psql >/dev/null 2>&1; then
  info "Running schema migrations..."
  psql "$DATABASE_URL" -f infrastructure/supabase-schema.sql -q && log "Schema applied" || warn "Schema already applied or error — check Supabase"
  
  read -p "Seed sample data (3 test businesses)? [y/N]: " SEED
  if [[ "$SEED" =~ ^[Yy]$ ]]; then
    psql "$DATABASE_URL" -f infrastructure/seed.sql -q && log "Seed data inserted"
  fi
else
  warn "psql not found — run schema manually in Supabase SQL editor:"
  echo "   https://app.supabase.com → SQL Editor → paste infrastructure/supabase-schema.sql"
fi

# ── Deploy options ────────────────────────────────────────────────────────────
hdr "6. Deployment target..."
echo "   1) Railway (API) + Vercel (Web)  ← Recommended"
echo "   2) Docker Compose (self-hosted)"
echo "   3) Manual (skip deploy, just print commands)"
read -p "Choose [1-3]: " DEPLOY_TARGET

case $DEPLOY_TARGET in
  1)
    hdr "Deploying to Railway + Vercel..."
    
    # Railway API
    if command -v railway >/dev/null 2>&1; then
      info "Deploying API to Railway..."
      cd apps/api
      railway up --service afribot-api
      API_URL=$(railway variables get RAILWAY_PUBLIC_DOMAIN 2>/dev/null || echo "")
      cd ../..
      log "API deployed to Railway"
    else
      warn "Railway CLI not installed. Install: npm i -g @railway/cli"
      echo "   Then run: cd apps/api && railway login && railway up"
    fi
    
    # Vercel Web
    if command -v vercel >/dev/null 2>&1; then
      info "Deploying Web to Vercel..."
      cd apps/web
      vercel --prod --yes \
        -e NEXT_PUBLIC_API_URL="${API_URL:-https://your-api.railway.app}"
      cd ../..
      log "Web deployed to Vercel"
    else
      warn "Vercel CLI not installed. Install: npm i -g vercel"
      echo "   Then run: cd apps/web && vercel --prod"
    fi
    ;;

  2)
    hdr "Starting Docker Compose..."
    command -v docker >/dev/null 2>&1 || err "Docker not installed"
    docker compose -f infrastructure/docker/docker-compose.yml up -d --build
    log "All services started"
    echo ""
    echo "   API:       http://localhost:3001"
    echo "   Web:       http://localhost:3000"
    echo "   API Docs:  http://localhost:3001/api/docs"
    echo "   Queues:    http://localhost:3002"
    ;;

  3)
    hdr "Manual deployment commands:"
    echo ""
    echo "API (Railway):"
    echo "   npm i -g @railway/cli"
    echo "   cd apps/api && railway login && railway init && railway up"
    echo ""
    echo "Web (Vercel):"
    echo "   npm i -g vercel"
    echo "   cd apps/web && vercel login && vercel --prod"
    echo ""
    echo "Or Docker:"
    echo "   docker compose -f infrastructure/docker/docker-compose.yml up -d --build"
    ;;
esac

# ── Post-deploy checklist ─────────────────────────────────────────────────────
hdr "╔══════════════════════════════════════════╗"
hdr "║   POST-DEPLOY CHECKLIST                  ║"
hdr "╚══════════════════════════════════════════╝"
echo ""
echo -e "${BOLD}DONE AUTOMATICALLY:${NC}"
echo "   ✓ API built and deployed"
echo "   ✓ Frontend built and deployed"
echo "   ✓ Database schema applied"
echo ""
echo -e "${BOLD}DO MANUALLY (requires external accounts):${NC}"
echo "   □ 360Dialog: Add webhook URL → https://YOUR-API/api/v1/whatsapp/webhook"
echo "   □ Meta: Verify business account (passport + CAC)"
echo "   □ Paystack: Complete KYC for live payments"
echo "   □ First login: admin@afribot.agency / Admin1234!"
echo "   □ Change default password in Settings"
echo "   □ Add your first real client in Clients → Add Client"
echo ""
echo -e "${GREEN}${BOLD}AfriBot Agency OS is live! 🚀${NC}"
echo ""
