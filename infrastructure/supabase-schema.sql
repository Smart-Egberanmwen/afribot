-- =============================================================================
-- AFRIBOT AGENCY OS — DATABASE SCHEMA
-- Run this in Supabase SQL Editor: https://app.supabase.com → SQL Editor
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";  -- for RAG/embeddings
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- for fast text search

-- =============================================================================
-- ENUMS
-- =============================================================================
CREATE TYPE user_role AS ENUM ('super_admin', 'agency_admin', 'client_admin', 'client_viewer');
CREATE TYPE tenant_status AS ENUM ('active', 'suspended', 'trial', 'cancelled');
CREATE TYPE subscription_plan AS ENUM ('starter', 'growth', 'pro', 'enterprise');
CREATE TYPE conversation_status AS ENUM ('open', 'pending', 'resolved', 'bot', 'handoff');
CREATE TYPE message_type AS ENUM ('text', 'image', 'audio', 'video', 'document', 'location', 'template', 'interactive', 'sticker', 'reaction', 'system');
CREATE TYPE message_direction AS ENUM ('inbound', 'outbound');
CREATE TYPE order_status AS ENUM ('pending', 'confirmed', 'processing', 'ready', 'delivered', 'cancelled', 'refunded');
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded', 'partial');
CREATE TYPE inventory_movement_type AS ENUM ('sale', 'restock', 'adjustment', 'return', 'wastage');
CREATE TYPE broadcast_status AS ENUM ('draft', 'scheduled', 'sending', 'sent', 'failed');
CREATE TYPE ai_provider AS ENUM ('claude', 'gpt4o', 'grok', 'openrouter');

-- =============================================================================
-- TENANTS (Clients / Businesses)
-- =============================================================================
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  business_type VARCHAR(100),         -- 'restaurant', 'retail', 'services', etc.
  logo_url TEXT,
  website_url TEXT,
  status tenant_status DEFAULT 'trial',
  subscription_plan subscription_plan DEFAULT 'starter',
  subscription_start TIMESTAMPTZ,
  subscription_end TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),
  monthly_fee_ngn INTEGER DEFAULT 0,  -- in kobo (smallest naira unit)
  max_whatsapp_numbers INTEGER DEFAULT 1,
  max_monthly_messages INTEGER DEFAULT 1000,
  max_contacts INTEGER DEFAULT 500,
  max_ai_requests INTEGER DEFAULT 500,
  timezone VARCHAR(50) DEFAULT 'Africa/Lagos',
  currency VARCHAR(3) DEFAULT 'NGN',
  locale VARCHAR(10) DEFAULT 'en-NG',
  low_data_mode BOOLEAN DEFAULT false,  -- Nigerian optimization
  settings JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- USERS
-- =============================================================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  auth_id VARCHAR(255) UNIQUE,        -- Clerk or Supabase Auth user ID
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255),
  avatar_url TEXT,
  phone VARCHAR(20),
  role user_role DEFAULT 'client_viewer',
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMPTZ,
  notification_preferences JSONB DEFAULT '{"email": true, "whatsapp": true, "low_stock": true, "new_order": true}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- WHATSAPP BUSINESS ACCOUNTS
-- =============================================================================
CREATE TABLE whatsapp_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  phone_number VARCHAR(20) UNIQUE NOT NULL,   -- E.164 format e.g. +2348012345678
  phone_number_id VARCHAR(100),               -- Meta WABA phone number ID
  waba_id VARCHAR(100),                        -- WhatsApp Business Account ID
  display_name VARCHAR(255),
  dialog360_api_key VARCHAR(500),             -- Per-client 360Dialog key
  dialog360_channel_id VARCHAR(100),
  webhook_url TEXT,
  is_active BOOLEAN DEFAULT true,
  quality_rating VARCHAR(20) DEFAULT 'GREEN', -- GREEN, YELLOW, RED
  messaging_limit VARCHAR(50),
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  last_webhook_at TIMESTAMPTZ,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- CONTACTS (per tenant)
-- =============================================================================
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  whatsapp_number VARCHAR(20) NOT NULL,
  name VARCHAR(255),
  email VARCHAR(255),
  tags TEXT[] DEFAULT '{}',
  custom_fields JSONB DEFAULT '{}',
  is_blocked BOOLEAN DEFAULT false,
  is_opted_out BOOLEAN DEFAULT false,
  total_orders INTEGER DEFAULT 0,
  total_spent_ngn BIGINT DEFAULT 0,      -- in kobo
  last_interaction_at TIMESTAMPTZ,
  first_seen_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  assigned_staff_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, whatsapp_number)
);

-- =============================================================================
-- CONVERSATIONS
-- =============================================================================
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  whatsapp_account_id UUID REFERENCES whatsapp_accounts(id),
  status conversation_status DEFAULT 'bot',
  assigned_to UUID REFERENCES users(id),
  subject TEXT,
  context JSONB DEFAULT '{}',            -- AI context/memory
  is_24hr_window_open BOOLEAN DEFAULT false,
  window_expires_at TIMESTAMPTZ,
  handoff_requested_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- MESSAGES
-- =============================================================================
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id),
  whatsapp_message_id VARCHAR(255),      -- Meta message ID (for dedup)
  direction message_direction NOT NULL,
  type message_type DEFAULT 'text',
  content TEXT,
  media_url TEXT,
  media_mime_type VARCHAR(100),
  media_size_bytes INTEGER,
  template_name VARCHAR(255),
  interactive_payload JSONB,
  reaction_emoji VARCHAR(10),
  is_read BOOLEAN DEFAULT false,
  is_deleted BOOLEAN DEFAULT false,
  ai_generated BOOLEAN DEFAULT false,
  ai_provider ai_provider,
  ai_latency_ms INTEGER,
  error_code VARCHAR(50),
  metadata JSONB DEFAULT '{}',
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- AI AGENTS (per tenant chatbot config)
-- =============================================================================
CREATE TABLE ai_agents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL DEFAULT 'AI Assistant',
  persona TEXT,                          -- Personality/tone description
  system_prompt TEXT NOT NULL,           -- Master system prompt
  fallback_provider ai_provider DEFAULT 'gpt4o',
  primary_provider ai_provider DEFAULT 'claude',
  temperature DECIMAL(3,2) DEFAULT 0.3,
  max_response_tokens INTEGER DEFAULT 500,
  enable_order_taking BOOLEAN DEFAULT true,
  enable_payment_links BOOLEAN DEFAULT true,
  enable_appointment_booking BOOLEAN DEFAULT false,
  enable_lead_qualification BOOLEAN DEFAULT true,
  handoff_keywords TEXT[] DEFAULT ARRAY['human', 'agent', 'staff', 'help'],
  escalation_threshold INTEGER DEFAULT 3, -- failed AI turns before handoff
  working_hours JSONB DEFAULT '{"enabled": false, "timezone": "Africa/Lagos", "schedule": {}}',
  out_of_hours_message TEXT,
  welcome_message TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- KNOWLEDGE BASE (RAG per tenant)
-- =============================================================================
CREATE TABLE knowledge_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  content TEXT NOT NULL,
  doc_type VARCHAR(50) DEFAULT 'faq',    -- 'faq', 'product', 'policy', 'custom'
  source_url TEXT,
  is_active BOOLEAN DEFAULT true,
  chunk_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE knowledge_chunks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536),                -- OpenAI text-embedding-3-small dimensions
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- PRODUCT CATALOG (per tenant)
-- =============================================================================
CREATE TABLE product_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  image_url TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  category_id UUID REFERENCES product_categories(id),
  sku VARCHAR(100),
  name VARCHAR(500) NOT NULL,
  description TEXT,
  image_urls TEXT[] DEFAULT '{}',
  price_ngn BIGINT NOT NULL DEFAULT 0,   -- in kobo
  compare_price_ngn BIGINT,              -- original price for discounts
  unit VARCHAR(50) DEFAULT 'piece',
  track_inventory BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  is_available_whatsapp BOOLEAN DEFAULT true,
  variants JSONB DEFAULT '[]',            -- [{name, options, price_adj}]
  tags TEXT[] DEFAULT '{}',
  weight_grams INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, sku)
);

-- =============================================================================
-- INVENTORY
-- =============================================================================
CREATE TABLE inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity_on_hand INTEGER NOT NULL DEFAULT 0,
  quantity_reserved INTEGER NOT NULL DEFAULT 0,  -- in pending orders
  quantity_available INTEGER GENERATED ALWAYS AS (quantity_on_hand - quantity_reserved) STORED,
  reorder_point INTEGER DEFAULT 10,
  reorder_quantity INTEGER DEFAULT 50,
  max_stock INTEGER,
  location VARCHAR(255),
  last_counted_at TIMESTAMPTZ,
  last_restocked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, product_id)
);

CREATE TABLE inventory_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  type inventory_movement_type NOT NULL,
  quantity INTEGER NOT NULL,             -- positive=in, negative=out
  quantity_before INTEGER NOT NULL,
  quantity_after INTEGER NOT NULL,
  order_id UUID,                         -- reference to orders
  notes TEXT,
  performed_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- ORDERS
-- =============================================================================
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  order_number VARCHAR(50) NOT NULL,
  contact_id UUID NOT NULL REFERENCES contacts(id),
  conversation_id UUID REFERENCES conversations(id),
  status order_status DEFAULT 'pending',
  payment_status payment_status DEFAULT 'pending',
  subtotal_ngn BIGINT NOT NULL DEFAULT 0,  -- in kobo
  discount_ngn BIGINT DEFAULT 0,
  delivery_fee_ngn BIGINT DEFAULT 0,
  total_ngn BIGINT NOT NULL DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'NGN',
  delivery_address JSONB,
  delivery_notes TEXT,
  estimated_delivery_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  paystack_reference VARCHAR(255),
  paystack_payment_url TEXT,
  payment_confirmed_at TIMESTAMPTZ,
  notes TEXT,
  processed_by ai_provider,              -- which AI took the order
  staff_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, order_number)
);

CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  product_name VARCHAR(500) NOT NULL,    -- snapshot at time of order
  product_sku VARCHAR(100),
  variant JSONB,
  quantity INTEGER NOT NULL,
  unit_price_ngn BIGINT NOT NULL,        -- in kobo
  total_price_ngn BIGINT NOT NULL,       -- in kobo
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- MESSAGE TEMPLATES
-- =============================================================================
CREATE TABLE message_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL,         -- 'MARKETING', 'UTILITY', 'AUTHENTICATION'
  language VARCHAR(10) DEFAULT 'en',
  status VARCHAR(50) DEFAULT 'PENDING',  -- APPROVED, PENDING, REJECTED
  components JSONB NOT NULL,             -- Meta template structure
  meta_template_id VARCHAR(255),         -- ID from Meta after approval
  variables TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, name, language)
);

-- =============================================================================
-- BROADCASTS
-- =============================================================================
CREATE TABLE broadcasts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  template_id UUID REFERENCES message_templates(id),
  custom_message TEXT,
  recipient_filter JSONB DEFAULT '{}',   -- filter rules for contacts
  recipient_count INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  read_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  status broadcast_status DEFAULT 'draft',
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- ANALYTICS SNAPSHOTS (pre-aggregated for performance)
-- =============================================================================
CREATE TABLE analytics_daily (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  new_contacts INTEGER DEFAULT 0,
  total_conversations INTEGER DEFAULT 0,
  bot_conversations INTEGER DEFAULT 0,
  human_handoffs INTEGER DEFAULT 0,
  messages_inbound INTEGER DEFAULT 0,
  messages_outbound INTEGER DEFAULT 0,
  orders_created INTEGER DEFAULT 0,
  orders_completed INTEGER DEFAULT 0,
  revenue_ngn BIGINT DEFAULT 0,          -- in kobo
  ai_requests INTEGER DEFAULT 0,
  avg_response_time_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, date)
);

-- =============================================================================
-- AUDIT LOG
-- =============================================================================
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(100),
  resource_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- BILLING / SUBSCRIPTIONS
-- =============================================================================
CREATE TABLE billing_invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  amount_ngn BIGINT NOT NULL,            -- in kobo
  status payment_status DEFAULT 'pending',
  paystack_reference VARCHAR(255),
  paid_at TIMESTAMPTZ,
  items JSONB DEFAULT '[]',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE usage_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  month DATE NOT NULL,                   -- first day of month
  messages_sent INTEGER DEFAULT 0,
  ai_requests INTEGER DEFAULT 0,
  contacts_created INTEGER DEFAULT 0,
  storage_mb DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, month)
);

-- =============================================================================
-- INDEXES (Performance)
-- =============================================================================
CREATE INDEX idx_messages_tenant_conversation ON messages(tenant_id, conversation_id);
CREATE INDEX idx_messages_whatsapp_id ON messages(whatsapp_message_id);
CREATE INDEX idx_messages_sent_at ON messages(tenant_id, sent_at DESC);
CREATE INDEX idx_conversations_contact ON conversations(tenant_id, contact_id);
CREATE INDEX idx_conversations_status ON conversations(tenant_id, status);
CREATE INDEX idx_contacts_whatsapp ON contacts(tenant_id, whatsapp_number);
CREATE INDEX idx_orders_tenant_status ON orders(tenant_id, status, created_at DESC);
CREATE INDEX idx_orders_contact ON orders(contact_id);
CREATE INDEX idx_inventory_tenant_product ON inventory(tenant_id, product_id);
CREATE INDEX idx_analytics_daily_lookup ON analytics_daily(tenant_id, date DESC);
CREATE INDEX idx_knowledge_chunks_embedding ON knowledge_chunks USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX idx_audit_logs_tenant ON audit_logs(tenant_id, created_at DESC);
CREATE INDEX idx_whatsapp_accounts_phone ON whatsapp_accounts(phone_number);

-- =============================================================================
-- ROW LEVEL SECURITY (Multi-tenant isolation)
-- =============================================================================
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_daily ENABLE ROW LEVEL SECURITY;

-- Users can only see their own tenant's data
CREATE POLICY tenant_isolation ON contacts
  USING (tenant_id = (SELECT tenant_id FROM users WHERE auth_id = auth.uid()::text));

-- Super admin bypass (handled via service role key in backend)

-- =============================================================================
-- FUNCTIONS & TRIGGERS
-- =============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tenants_updated BEFORE UPDATE ON tenants FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_users_updated BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_contacts_updated BEFORE UPDATE ON contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_conversations_updated BEFORE UPDATE ON conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_products_updated BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_inventory_updated BEFORE UPDATE ON inventory FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_orders_updated BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_ai_agents_updated BEFORE UPDATE ON ai_agents FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Function: deduct inventory when order confirmed
CREATE OR REPLACE FUNCTION deduct_inventory_on_order()
RETURNS TRIGGER AS $$
DECLARE
  item RECORD;
BEGIN
  IF NEW.status = 'confirmed' AND OLD.status = 'pending' THEN
    FOR item IN SELECT * FROM order_items WHERE order_id = NEW.id LOOP
      UPDATE inventory
      SET quantity_on_hand = quantity_on_hand - item.quantity,
          quantity_reserved = GREATEST(0, quantity_reserved - item.quantity)
      WHERE tenant_id = NEW.tenant_id AND product_id = item.product_id;

      INSERT INTO inventory_movements (tenant_id, product_id, type, quantity, quantity_before, quantity_after, order_id)
      SELECT NEW.tenant_id, item.product_id, 'sale', -item.quantity,
             quantity_on_hand + item.quantity, quantity_on_hand, NEW.id
      FROM inventory WHERE tenant_id = NEW.tenant_id AND product_id = item.product_id;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_deduct_inventory
  AFTER UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION deduct_inventory_on_order();

-- Function: generate order number
CREATE OR REPLACE FUNCTION generate_order_number(p_tenant_id UUID)
RETURNS TEXT AS $$
DECLARE
  today_count INTEGER;
  order_num TEXT;
BEGIN
  SELECT COUNT(*) + 1 INTO today_count
  FROM orders
  WHERE tenant_id = p_tenant_id
  AND DATE(created_at) = CURRENT_DATE;

  order_num := 'ORD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(today_count::TEXT, 4, '0');
  RETURN order_num;
END;
$$ LANGUAGE plpgsql;

-- Function: semantic search for RAG
CREATE OR REPLACE FUNCTION match_knowledge_chunks(
  p_tenant_id UUID,
  query_embedding vector(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  similarity FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    kc.id,
    kc.content,
    1 - (kc.embedding <=> query_embedding) AS similarity
  FROM knowledge_chunks kc
  WHERE kc.tenant_id = p_tenant_id
    AND 1 - (kc.embedding <=> query_embedding) > match_threshold
  ORDER BY kc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- SEED DATA (sample tenants for development)
-- =============================================================================

-- Agency admin tenant (your account)
INSERT INTO tenants (id, slug, name, business_type, status, subscription_plan, monthly_fee_ngn)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'afribot-agency',
  'AfriBot Agency',
  'agency',
  'active',
  'enterprise',
  0
);

-- Sample client 1: Restaurant
INSERT INTO tenants (slug, name, business_type, status, subscription_plan, monthly_fee_ngn)
VALUES ('mama-tee-kitchen', 'Mama Tee Kitchen', 'restaurant', 'active', 'growth', 2500000);

-- Sample client 2: Retail/Fashion
INSERT INTO tenants (slug, name, business_type, status, subscription_plan, monthly_fee_ngn)
VALUES ('lagos-styles', 'Lagos Styles Boutique', 'retail', 'active', 'starter', 1500000);

-- Sample client 3: Service business
INSERT INTO tenants (slug, name, business_type, status, subscription_plan, monthly_fee_ngn)
VALUES ('quickfix-auto', 'QuickFix Auto Repairs', 'automotive', 'trial', 'starter', 1500000);
