# AfriBot Agency OS — Complete Deployment Guide
### For Total Beginners · Written in Plain English

---

## Before We Start: What Are We Actually Doing?

Your project has **two parts** that need to live on the internet:

| Part | What It Does | Where It Goes |
|------|-------------|---------------|
| **Backend (API)** | The brain — processes WhatsApp messages, runs AI, saves data | **Railway** (free to start) |
| **Frontend (Dashboard)** | The website you log into to manage everything | **Vercel** (free) |

Both need a **database** (Supabase — free) and your **API keys** from various services.

Think of it like this: Supabase is your filing cabinet, Railway is your office where work happens, and Vercel is the front door people walk through.

---

## PHASE 1 — Create Accounts (Do This First, Takes ~30 Minutes)

You need to create accounts on 6 websites. All are free to start.

---

### Step 1: GitHub (stores your code)
1. Go to **github.com** → click **Sign Up**
2. Create a free account
3. Come back here when done

---

### Step 2: Supabase (your database)
1. Go to **supabase.com** → click **Start for Free**
2. Sign up with your GitHub account (easiest)
3. Click **New Project**
4. Fill in:
   - **Name:** `afribot-agency`
   - **Database Password:** Make a strong password, **save it somewhere safe**
   - **Region:** Choose `West EU (Ireland)` — closest to Nigeria with good latency
5. Click **Create new project** — wait 2 minutes for it to set up
6. Once ready, go to **Settings → API** (left sidebar)
7. **Copy and save** these three things (you'll need them soon):
   - **Project URL** (looks like `https://xxxx.supabase.co`)
   - **anon public key** (long text starting with `eyJ`)
   - **service_role key** (another long text starting with `eyJ`) ⚠️ Keep this secret!

---

### Step 3: Run the Database Schema
This creates all the tables your app needs.

1. In Supabase, click **SQL Editor** in the left sidebar
2. Click **New query**
3. Open the file `infrastructure/supabase-schema.sql` from your downloaded project
4. Copy **all** the text in that file
5. Paste it into the SQL Editor
6. Click **Run** (the green button)
7. You should see `Success. No rows returned` — that's correct!
8. Now do the same thing with `infrastructure/seed.sql` (this adds 3 sample businesses)

---

### Step 4: Anthropic (the AI brain)
1. Go to **console.anthropic.com** → Sign up
2. Click **API Keys** → **Create Key**
3. Name it `afribot-production`
4. **Copy the key** (starts with `sk-ant-`) — you only see it once!
5. Add billing: click **Plans** → add a credit card (start with $10 credit)

---

### Step 5: Resend (sends emails)
1. Go to **resend.com** → Sign up free
2. Click **API Keys** → **Create API Key**
3. Name it `afribot`
4. **Copy the key** (starts with `re_`)
5. While here: go to **Domains** → Add your domain (e.g. `youragency.com`)
   - Follow their DNS instructions (takes 5-30 mins)
   - If you don't have a domain yet, skip this — use `onboarding@resend.dev` as your FROM address temporarily

---

### Step 6: Paystack (Nigerian payments)
1. Go to **dashboard.paystack.com** → Sign up
2. Complete your business profile (takes 5 mins)
3. Go to **Settings → API Keys & Webhooks**
4. **Copy** your **Secret Key** (starts with `sk_test_` for now, change to live after KYC)
5. **Copy** your **Public Key** (starts with `pk_test_`)

---

## PHASE 2 — Put Your Code on GitHub (10 Minutes)

1. Download and install **Git** from **git-scm.com**
2. Download and install **Node.js** from **nodejs.org** (choose version 20 LTS)
3. Extract the `afribot-agency-os-final.tar.gz` file you downloaded
4. Open your **Terminal** (Mac/Linux) or **Command Prompt** (Windows)
5. Navigate to the folder:
   ```
   cd afribot
   ```
6. Copy the environment file:
   ```
   cp .env.example .env
   ```
7. Open `.env` in any text editor (Notepad is fine on Windows)
8. Fill in the values you collected in Phase 1:
   ```
   SUPABASE_URL=https://xxxx.supabase.co          ← paste yours
   SUPABASE_ANON_KEY=eyJxxxx                       ← paste yours
   SUPABASE_SERVICE_ROLE_KEY=eyJxxxx               ← paste yours
   JWT_SECRET=any-random-long-string-you-make-up   ← make up 32+ random characters
   ANTHROPIC_API_KEY=sk-ant-xxxx                   ← paste yours
   PAYSTACK_SECRET_KEY=sk_test_xxxx                ← paste yours
   PAYSTACK_PUBLIC_KEY=pk_test_xxxx                ← paste yours
   NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_test_xxxx    ← same public key
   RESEND_API_KEY=re_xxxx                          ← paste yours
   EMAIL_FROM=noreply@yourdomain.com               ← your email domain
   AGENCY_NAME=Your Agency Name
   AGENCY_EMAIL=your@email.com
   ```
9. Save the file
10. Run in terminal:
    ```
    git init
    git add .
    git commit -m "initial commit"
    ```
11. Go to **github.com** → click **+** → **New repository**
12. Name it `afribot-agency-os` → click **Create repository**
13. Copy the commands GitHub shows you under "push an existing repository" and run them in your terminal

---

## PHASE 3 — Deploy the Backend API to Railway (15 Minutes)

Railway is where your API server lives. It runs 24/7.

1. Go to **railway.app** → click **Login** → login with GitHub
2. Click **New Project** → **Deploy from GitHub repo**
3. Select your `afribot-agency-os` repository
4. Click **Add service** → **GitHub Repo**
5. Railway will start trying to build — it will fail at first, that's ok
6. Click on your service → go to **Settings** tab
7. Under **Root Directory**, type: `apps/api`
8. Under **Start Command**, type: `node dist/main`
9. Under **Build Command**, type: `npm install && npm run build`
10. Go to the **Variables** tab
11. Click **Raw Editor** and paste your entire `.env` file contents
12. Click **Deploy** — wait 3-5 minutes for it to build

When it says **Active** with a green dot, it's running!

13. Click **Settings** → under **Networking** → click **Generate Domain**
14. **Copy your domain** — it looks like `afribot-api-production.up.railway.app`
    ⚠️ Save this! You need it for the next step.

15. **Add Redis** (needed for message queues):
    - In Railway, click **New** → **Database** → **Add Redis**
    - Railway automatically connects it — no extra steps needed

---

## PHASE 4 — Deploy the Frontend to Vercel (10 Minutes)

Vercel hosts the website/dashboard you'll log into.

1. Go to **vercel.com** → click **Sign Up** → login with GitHub
2. Click **Add New Project**
3. Import your `afribot-agency-os` repository
4. Under **Framework Preset**, select `Next.js`
5. Under **Root Directory**, click **Edit** and type: `apps/web`
6. Click **Environment Variables** and add:
   ```
   NEXT_PUBLIC_API_URL = https://YOUR-RAILWAY-DOMAIN.up.railway.app
   ```
   (Replace with the Railway domain you copied above)
7. Click **Deploy** — wait 2-3 minutes

When it's done, Vercel gives you a URL like `afribot-web.vercel.app`

**That's your dashboard URL — open it and you'll see the login page!**

---

## PHASE 5 — First Login & Test (5 Minutes)

1. Open your Vercel URL in a browser
2. Click **Create one** (register)
3. Fill in your name, email, and password
4. You're in! 🎉

**Test that everything works:**
- Dashboard loads → ✅ Frontend working
- Click **Clients** → you should see 3 sample businesses → ✅ Database connected
- Click **Settings** → check no error messages → ✅ API connected

---

## PHASE 6 — Connect WhatsApp (Takes 1-7 Days for Approval)

This part requires external approvals. Start it immediately even while doing other steps.

### Step A: Apply for 360Dialog Agency Account (TODAY)
1. Go to **360dialog.com/partners**
2. Click **Become a Partner**
3. Fill the form — say you're building a WhatsApp automation agency in Nigeria
4. Wait for email approval (usually 1-3 business days)
5. When approved, you get a **Partner Token** and **Partner ID**
6. Add these to your Railway environment variables:
   ```
   DIALOG360_PARTNER_TOKEN=your-token
   DIALOG360_PARTNER_ID=your-id
   WEBHOOK_VERIFY_TOKEN=any-secret-word-you-choose
   WEBHOOK_SECRET=another-secret-string-you-make-up
   ```

### Step B: Meta Business Verification (TODAY, runs in parallel)
1. Go to **business.facebook.com**
2. Create a Meta Business Account if you don't have one
3. Go to **Settings → Business Verification**
4. Submit documents: government ID + proof of business (CAC certificate or utility bill with business name)
5. Wait for approval (1-7 business days)

### Step C: Once 360Dialog Approves You
1. Log into 360Dialog dashboard
2. For each client business, create a WhatsApp channel
3. Each channel gives you a **phone_number_id**, **waba_id**, and **API key**
4. In your AfriBot dashboard → **Clients** → open a client → **Settings** → paste these values

### Step D: Set the Webhook URL
In your 360Dialog dashboard → **Webhooks**, add this URL:
```
https://YOUR-RAILWAY-DOMAIN.up.railway.app/api/v1/whatsapp/webhook
```

---

## PHASE 7 — Connect Email (30 Minutes)

### Transactional Emails (already works with Resend key you added)
Nothing extra needed. When customers order, they automatically get confirmation emails.

### Inbound Email (customers can email your clients)

1. Sign up at **postmark.com** (free tier: 100 emails/month)
2. Create a **Server** → get your **Inbound email address** (looks like `xxxx@inbound.postmarkapp.com`)
3. Add to Railway environment variables:
   ```
   POSTMARK_INBOUND_TOKEN=your-server-token
   ```
4. In Postmark → **Inbound** → **Webhook URL**, paste:
   ```
   https://YOUR-RAILWAY-DOMAIN.up.railway.app/api/v1/email/inbound
   ```
5. Optionally: set up email forwarding so `support@yourclientbusiness.com` forwards to your Postmark inbound address. (Do this in your domain's DNS settings or ask your domain provider.)

When customers email your clients, those emails now appear as conversations in the AfriBot dashboard, right alongside WhatsApp messages. The AI replies to both automatically.

---

## Summary: What Each Service Costs

| Service | Free Tier | When You'll Pay |
|---------|-----------|-----------------|
| **Supabase** | Free up to 500MB + 50,000 rows | ~$25/mo when you scale |
| **Railway** | $5 free credit, then ~$5-10/mo | From day 1 basically |
| **Vercel** | Free forever for frontend | Only if huge traffic |
| **Anthropic** | Pay per use | ~$5-20/mo to start |
| **Resend** | 3,000 emails/mo free | $20/mo at scale |
| **Paystack** | Free | 1.5% per transaction (max ₦2,000) |
| **360Dialog** | None — paid from day 1 | ~$5-10/mo per client WABA |
| **Postmark** | 100 emails/mo free | $15/mo when you scale |
| **Total to start** | ~$10-20/mo | Less than ₦20,000/month |

---

## Common Problems & Fixes

**"The dashboard shows but I can't log in"**
→ Your Railway API might still be starting up. Wait 2 minutes and try again. Check Railway logs for errors.

**"I see a white screen"**
→ Open browser developer tools (F12) → Console tab. Copy the error and search it.

**"WhatsApp messages aren't being received"**
→ Check that your webhook URL is correct in 360Dialog. Check Railway logs for incoming requests.

**"Emails aren't sending"**
→ Check that RESEND_API_KEY is correctly set in Railway variables. Check Resend dashboard for error logs.

**"I need to update something in the code"**
→ Edit the file on your computer → run `git add . && git commit -m "update" && git push` → Railway and Vercel automatically redeploy within 2-3 minutes.

---

## Your Go-Live Checklist

```
[ ] Supabase database created and schema applied
[ ] Railway API deployed and showing "Active"
[ ] Vercel frontend deployed and login page visible
[ ] First admin account created
[ ] 3 sample businesses visible in dashboard
[ ] 360Dialog application submitted
[ ] Meta Business Verification submitted
[ ] Paystack KYC started
[ ] First real client added in dashboard
[ ] Webhook URL set in 360Dialog
[ ] AI agent system prompt customised for first client
[ ] Products added to inventory for first client
[ ] TEST: Send a WhatsApp message to client number → AI replies ✅
[ ] TEST: Place a test order via WhatsApp → appears in dashboard ✅
[ ] TEST: Customer emails client → appears in conversations ✅
```

---

*Need help? The error logs are your best friend. In Railway, click your service → Deployments → click the latest one → view logs. In Vercel, same thing under Deployments. Most problems are either a missing environment variable or a typo in a URL.*
