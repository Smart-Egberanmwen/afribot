-- =============================================================================
-- AFRIBOT AGENCY OS — SEED DATA
-- Run after schema: seeds 3 sample businesses with full data
-- =============================================================================

-- ── 1. Super Admin User ──────────────────────────────────────────────────────
-- password: Admin1234! (bcrypt hash below)
INSERT INTO users (id, email, full_name, role, is_active, password_hash)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'admin@afribot.agency',
  'Ade Okafor',
  'super_admin',
  true,
  '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY1LSYJ2ixe5JCS'
) ON CONFLICT (email) DO NOTHING;

-- ── 2. Sample Tenants ────────────────────────────────────────────────────────
INSERT INTO tenants (id, slug, name, business_type, status, subscription_plan, monthly_fee_ngn, timezone)
VALUES
  ('t1000000-0000-0000-0000-000000000001', 'mama-tee-kitchen',    'Mama Tee Kitchen',      'restaurant',   'active', 'growth',  2500000, 'Africa/Lagos'),
  ('t1000000-0000-0000-0000-000000000002', 'lagos-styles',         'Lagos Styles Boutique', 'retail',        'active', 'starter', 1500000, 'Africa/Lagos'),
  ('t1000000-0000-0000-0000-000000000003', 'quickfix-auto',        'QuickFix Auto Repairs', 'automotive',   'trial',  'starter', 0,       'Africa/Lagos')
ON CONFLICT (slug) DO NOTHING;

-- ── 3. WhatsApp Accounts ─────────────────────────────────────────────────────
INSERT INTO whatsapp_accounts (tenant_id, phone_number, phone_number_id, waba_id, display_name, dialog360_api_key, is_active)
VALUES
  ('t1000000-0000-0000-0000-000000000001', '+2349012345678', 'PHONE_ID_1', 'WABA_ID_1', 'Mama Tee Kitchen', 'REPLACE_WITH_360DIALOG_KEY_1', true),
  ('t1000000-0000-0000-0000-000000000002', '+2348023456789', 'PHONE_ID_2', 'WABA_ID_2', 'Lagos Styles',     'REPLACE_WITH_360DIALOG_KEY_2', true),
  ('t1000000-0000-0000-0000-000000000003', '+2347034567890', 'PHONE_ID_3', 'WABA_ID_3', 'QuickFix Auto',    'REPLACE_WITH_360DIALOG_KEY_3', true)
ON CONFLICT (phone_number) DO NOTHING;

-- ── 4. AI Agents ─────────────────────────────────────────────────────────────
INSERT INTO ai_agents (tenant_id, name, persona, system_prompt, enable_order_taking, enable_payment_links, welcome_message, handoff_keywords)
VALUES
(
  't1000000-0000-0000-0000-000000000001',
  'Tee Bot',
  'Friendly Nigerian restaurant assistant who knows every dish on the menu',
  E'You are Tee Bot, the AI assistant for Mama Tee Kitchen, an authentic Nigerian restaurant in Lagos.\n\nYou help customers:\n- Browse our menu and get food descriptions\n- Place orders for delivery or pickup\n- Get delivery time estimates (45-60 mins)\n- Track existing orders\n- Answer questions about ingredients and allergens\n\nOur menu highlights:\n- Jollof Rice (₦2,400/portion, serves 2) - smoky tomato-based rice, our bestseller\n- Egusi Soup + Eba (₦1,800) - ground melon seed soup with cassava fufu\n- Pounded Yam + Ofe Onugbu (₦2,200) - bitter leaf soup specialty\n- Fried Plantain (₦600) - perfectly caramelized sides\n- Chicken (₦1,500 per piece) - grilled or fried\n\nDelivery: ₦1,500 within Lagos Island/Mainland. Free for orders above ₦15,000.\nPayment: Paystack (card, bank transfer, USSD)\n\nAlways confirm the full order and total before generating a payment link.',
  true, true,
  E'Ẹ káàbọ̀! 👋 Welcome to Mama Tee Kitchen! I''m Tee Bot, your personal food assistant.\n\nWhat can I get for you today? You can:\n🍛 Browse our menu\n🛒 Place an order\n📦 Track your order\n\nJust type what you need!',
  ARRAY['human', 'agent', 'staff', 'manager', 'help me', 'speak to someone']
),
(
  't1000000-0000-0000-0000-000000000002',
  'Style Bot',
  'Fashionable and knowledgeable Nigerian fashion assistant',
  E'You are Style Bot for Lagos Styles Boutique, a premium African fashion store.\n\nYou help customers:\n- Browse our collections (Ankara, Aso-oke, Ready-to-wear, Accessories)\n- Check sizes and availability\n- Place orders with delivery\n- Get styling advice\n- Process returns and exchanges\n\nKey products:\n- Ankara Wrap Dress (₦9,500) - Available S, M, L, XL\n- Aso-oke Set (₦45,000) - Custom made, 2 weeks lead time\n- Agbada Suit (₦38,000) - Available in standard sizes\n- Gele (₦6,500) - Pre-tied and raw options\n- Accessories from ₦2,500\n\nDelivery: Lagos same-day ₦2,000 / Next day ₦1,500 / Outside Lagos from ₦3,500\n\nAlways ask for size before confirming fashion orders.',
  true, true,
  E'Hey gorgeous! 👗✨ Welcome to Lagos Styles Boutique!\n\nI''m Style Bot — I can help you find that perfect look.\n\nBrowse 🛍️ | Place Order 📦 | Track Delivery 🚚\n\nWhat are you shopping for today?',
  ARRAY['human', 'agent', 'staff', 'help', 'manager', 'return', 'refund']
),
(
  't1000000-0000-0000-0000-000000000003',
  'Auto Assist',
  'Professional and knowledgeable auto repair assistant',
  E'You are Auto Assist for QuickFix Auto Repairs, a trusted auto repair shop in Lagos.\n\nYou help customers:\n- Get repair quotes and estimates\n- Book service appointments\n- Check on the status of their vehicle\n- Answer questions about our services\n- Provide basic car care tips\n\nOur services:\n- Engine diagnostics (₦5,000)\n- Oil change + filter (₦12,000 incl. oil)\n- Brake pad replacement (from ₦35,000)\n- AC service (from ₦25,000)\n- Tyre change (₦8,000/tyre mounted)\n- Full service (from ₦65,000)\n\nWorkshop hours: Mon-Sat 8am-6pm Lagos time\nLocation: 14 Workshop Road, Mushin, Lagos\n\nAlways collect: customer name, car make/model/year, and issue description before booking.',
  false, false,
  E'Hello! 🔧 Welcome to QuickFix Auto Repairs.\n\nI''m Auto Assist — here to help with all your car needs.\n\n🔍 Get a quote | 📅 Book service | ❓ Ask a question\n\nWhat can I help you with today?',
  ARRAY['human', 'mechanic', 'engineer', 'speak to', 'call me']
);

-- ── 5. Product Categories ────────────────────────────────────────────────────
INSERT INTO product_categories (id, tenant_id, name, display_order)
VALUES
  ('c1000000-0000-0000-0000-000000000001', 't1000000-0000-0000-0000-000000000001', 'Rice Dishes',      1),
  ('c1000000-0000-0000-0000-000000000002', 't1000000-0000-0000-0000-000000000001', 'Soups & Swallows', 2),
  ('c1000000-0000-0000-0000-000000000003', 't1000000-0000-0000-0000-000000000001', 'Sides & Drinks',   3),
  ('c1000000-0000-0000-0000-000000000004', 't1000000-0000-0000-0000-000000000002', 'Dresses',          1),
  ('c1000000-0000-0000-0000-000000000005', 't1000000-0000-0000-0000-000000000002', 'Traditional Wear', 2),
  ('c1000000-0000-0000-0000-000000000006', 't1000000-0000-0000-0000-000000000003', 'Car Services',     1);

-- ── 6. Products ──────────────────────────────────────────────────────────────
INSERT INTO products (id, tenant_id, category_id, name, sku, description, price_ngn, track_inventory, is_active, is_available_whatsapp)
VALUES
  -- Mama Tee Kitchen
  ('p1000000-0000-0000-0000-000000000001','t1000000-0000-0000-0000-000000000001','c1000000-0000-0000-0000-000000000001','Jollof Rice (Large)','JR-LG','Smoky party jollof rice, serves 2 people',240000,true,true,true),
  ('p1000000-0000-0000-0000-000000000002','t1000000-0000-0000-0000-000000000001','c1000000-0000-0000-0000-000000000001','Fried Rice (Large)','FR-LG','Nigerian fried rice with mixed vegetables, serves 2',240000,true,true,true),
  ('p1000000-0000-0000-0000-000000000003','t1000000-0000-0000-0000-000000000001','c1000000-0000-0000-0000-000000000002','Egusi Soup + Eba','ES-EB','Ground melon seed soup served with cassava eba',180000,true,true,true),
  ('p1000000-0000-0000-0000-000000000004','t1000000-0000-0000-0000-000000000001','c1000000-0000-0000-0000-000000000002','Pounded Yam + Egusi','PY-EG','Hand-pounded yam with rich egusi soup',220000,true,true,true),
  ('p1000000-0000-0000-0000-000000000005','t1000000-0000-0000-0000-000000000001','c1000000-0000-0000-0000-000000000003','Grilled Chicken (Full)','GC-FL','Marinated whole grilled chicken',250000,true,true,true),
  ('p1000000-0000-0000-0000-000000000006','t1000000-0000-0000-0000-000000000001','c1000000-0000-0000-0000-000000000003','Fried Plantain','FP-SM','Perfectly caramelized dodo, side portion',60000,true,true,true),
  -- Lagos Styles
  ('p1000000-0000-0000-0000-000000000007','t1000000-0000-0000-0000-000000000002','c1000000-0000-0000-0000-000000000004','Ankara Wrap Dress','ANK-WR','Premium ankara fabric wrap dress, available S-XL',950000,true,true,true),
  ('p1000000-0000-0000-0000-000000000008','t1000000-0000-0000-0000-000000000002','c1000000-0000-0000-0000-000000000004','Ankara Skirt Set','ANK-SK','Matching blouse and skirt set',780000,true,true,true),
  ('p1000000-0000-0000-0000-000000000009','t1000000-0000-0000-0000-000000000002','c1000000-0000-0000-0000-000000000005','Aso-oke Set (Full)','ASO-FL','Premium aso-oke fabric, gele + wrapper + blouse',4500000,true,true,true),
  ('p1000000-0000-0000-0000-000000000010','t1000000-0000-0000-0000-000000000002','c1000000-0000-0000-0000-000000000005','Agbada Suit Set','AGS-XL','Premium agbada with inner wear, all sizes',3800000,true,true,true),
  -- QuickFix Auto
  ('p1000000-0000-0000-0000-000000000011','t1000000-0000-0000-0000-000000000003','c1000000-0000-0000-0000-000000000006','Engine Diagnostics','SVC-DIAG','Full computer diagnostics + report',500000,false,true,true),
  ('p1000000-0000-0000-0000-000000000012','t1000000-0000-0000-0000-000000000003','c1000000-0000-0000-0000-000000000006','Oil Change Service','SVC-OIL','Engine oil + filter replacement (incl. oil)',1200000,true,true,true);

-- ── 7. Inventory ─────────────────────────────────────────────────────────────
INSERT INTO inventory (tenant_id, product_id, quantity_on_hand, reorder_point, reorder_quantity)
VALUES
  ('t1000000-0000-0000-0000-000000000001','p1000000-0000-0000-0000-000000000001',50,10,50),
  ('t1000000-0000-0000-0000-000000000001','p1000000-0000-0000-0000-000000000002',40,10,40),
  ('t1000000-0000-0000-0000-000000000001','p1000000-0000-0000-0000-000000000003',6,10,30),   -- LOW STOCK
  ('t1000000-0000-0000-0000-000000000001','p1000000-0000-0000-0000-000000000004',30,8,25),
  ('t1000000-0000-0000-0000-000000000001','p1000000-0000-0000-0000-000000000005',15,5,20),
  ('t1000000-0000-0000-0000-000000000001','p1000000-0000-0000-0000-000000000006',80,20,100),
  ('t1000000-0000-0000-0000-000000000002','p1000000-0000-0000-0000-000000000007',3,5,20),    -- LOW STOCK
  ('t1000000-0000-0000-0000-000000000002','p1000000-0000-0000-0000-000000000008',12,5,20),
  ('t1000000-0000-0000-0000-000000000002','p1000000-0000-0000-0000-000000000009',0,2,5),     -- OUT OF STOCK
  ('t1000000-0000-0000-0000-000000000002','p1000000-0000-0000-0000-000000000010',4,3,10),
  ('t1000000-0000-0000-0000-000000000003','p1000000-0000-0000-0000-000000000012',11,5,20)
ON CONFLICT (tenant_id, product_id) DO NOTHING;

-- ── 8. Sample Contacts ───────────────────────────────────────────────────────
INSERT INTO contacts (id, tenant_id, whatsapp_number, name, total_orders, total_spent_ngn)
VALUES
  ('ct100000-0000-0000-0000-000000000001','t1000000-0000-0000-0000-000000000001','+2349012345678','Amara Kalu',5,3150000),
  ('ct100000-0000-0000-0000-000000000002','t1000000-0000-0000-0000-000000000001','+2348023456789','Tunde Eze',3,1890000),
  ('ct100000-0000-0000-0000-000000000003','t1000000-0000-0000-0000-000000000002','+2347034567890','Ngozi Adeyemi',2,1730000),
  ('ct100000-0000-0000-0000-000000000004','t1000000-0000-0000-0000-000000000003','+2348045678901','Chidi Nwosu',1,500000)
ON CONFLICT (tenant_id, whatsapp_number) DO NOTHING;

-- ── 9. Sample Analytics ──────────────────────────────────────────────────────
INSERT INTO analytics_daily (tenant_id, date, new_contacts, total_conversations, bot_conversations, messages_inbound, messages_outbound, orders_created, orders_completed, revenue_ngn, ai_requests)
SELECT
  t.id,
  CURRENT_DATE - (n || ' days')::INTERVAL,
  (random() * 15 + 2)::INT,
  (random() * 40 + 10)::INT,
  (random() * 35 + 8)::INT,
  (random() * 200 + 80)::INT,
  (random() * 180 + 70)::INT,
  (random() * 12 + 2)::INT,
  (random() * 10 + 1)::INT,
  (random() * 80000 + 20000)::BIGINT * 100,
  (random() * 120 + 40)::INT
FROM tenants t
CROSS JOIN generate_series(0, 29) AS n
WHERE t.slug != 'afribot-agency'
ON CONFLICT (tenant_id, date) DO NOTHING;

SELECT 'Seed data inserted successfully!' AS result;
