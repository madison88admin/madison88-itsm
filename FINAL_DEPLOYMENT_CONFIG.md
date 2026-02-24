# 🚀 Production Deployment - Final Configuration

**Confirmed URLs & Credentials**

| Component | Value |
|-----------|-------|
| **Netlify Frontend** | https://m88itsm.netlify.app |
| **Render Backend** | https://madison88-itsm-platform.onrender.com |
| **Supabase Pooler** | aws-1-ap-south-1.pooler.supabase.com |
| **Brevo SMTP Server** | smtp-relay.brevo.com:587 |

---

## 🔧 STEP 1: Render Backend Environment Variables

Go to **Render Dashboard → Your Service → Environment**

Add these exact variables:

```env
NODE_ENV=production
FRONTEND_URL=https://m88itsm.netlify.app
FRONTEND_PROD_URL=https://m88itsm.netlify.app

DATABASE_URL=postgresql://postgres.ktduabpfsqlubqpweiot:YOUR-PASSWORD@aws-1-ap-south-1.pooler.supabase.com:5432/postgres

JWT_SECRET=your-super-secret-jwt-secret-32-chars-minimum

SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=a2fb04001@smtp-brevo.com
SMTP_PASSWORD=xsmtpsib-410213093fe8d37e82e5a2866895b2472f1705c85f1e41a51a8324cdf1bbc2d4-iMH3z6nT65QbI8cA
SMTP_FROM_EMAIL=itsmmadison@gmail.com
SMTP_FROM_NAME=Madison88 ITSM Support
ADMIN_NOTIFICATION_EMAIL=itsmmadison@gmail.com

ENABLE_EMAIL_NOTIFICATIONS=true
```

### ⚠️ Important Notes:
- Replace `YOUR-PASSWORD` with your actual Supabase password
- Generate a strong JWT_SECRET (use `openssl rand -base64 32` on Mac/Linux)
- On Windows PowerShell: `[Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes((1..32 | ForEach-Object { [char](Get-Random -Minimum 65 -Maximum 122) } ) -join ""))`

---

## 🔧 STEP 2: Netlify Frontend Environment Variable

Go to **Netlify Dashboard → Site Settings → Build & Deploy → Environment**

Add:

```env
VITE_API_URL=https://madison88-itsm-platform.onrender.com/api
```

---

## ✅ Deployment Steps

### Step 1: Configure Render Environment
- [ ] Go to Render Dashboard
- [ ] Select your service `madison88-itsm-platform`
- [ ] Click "Environment"
- [ ] Add all environment variables from STEP 1 above
- [ ] Click "Save"

### Step 2: Deploy Backend
- [ ] Render will auto-deploy when env vars are saved
- [ ] Watch the "Builds" tab for deployment status
- [ ] Wait for "Live" status

### Step 3: Verify Backend
```bash
# Test your backend (copy exact URL from Render dashboard)
curl https://madison88-itsm-platform.onrender.com/health

# Expected response:
{"status": "healthy", "timestamp": "2026-02-24T...", "environment": "production"}
```

### Step 4: Configure Netlify Environment
- [ ] Go to Netlify Dashboard
- [ ] Select app `m88itsm`
- [ ] Site Settings → Build & Deploy → Environment
- [ ] Add `VITE_API_URL` variable
- [ ] Value: `https://madison88-itsm-platform.onrender.com/api`

### Step 5: Deploy Frontend
- [ ] Go to Netlify Deploys tab
- [ ] Click "Trigger deploy" → "Deploy site"
- [ ] Wait for build to complete (green status)

### Step 6: Verify Everything Works
```bash
# Open browser console on frontend
# https://m88itsm.netlify.app

fetch('https://madison88-itsm-platform.onrender.com/api/health')
  .then(r => r.json())
  .then(d => console.log('✅ Backend OK:', d))
  .catch(e => console.error('❌ Error:', e))
```

---

## 🧪 Test Critical Workflows

After deployment, test these:

### 1. Frontend Loads
```
✅ Open https://m88itsm.netlify.app
✅ Page loads (no 404, no errors)
```

### 2. Navigation Works
```
✅ Click different menu items (/settings, /tickets, etc)
✅ All routes load without 404
```

### 3. Backend API Connected
```
✅ Open DevTools Console (F12)
✅ Run: fetch(import.meta.env.VITE_API_URL + '/health').then(r => r.json()).then(console.log)
✅ Should show healthy response with timestamp
```

### 4. CORS Works
```bash
# From terminal:
curl -H "Origin: https://m88itsm.netlify.app" \
  https://madison88-itsm-platform.onrender.com/api/health -v

# Look for header: Access-Control-Allow-Origin: https://m88itsm.netlify.app
```

### 5. Email Sends
```
✅ Create a new ticket
✅ Check that notification email is sent
✅ Email should arrive in inbox (check spam folder)
```

---

## 🔐 Verify Credentials Are Correct

### Check Supabase Password
- Go to Supabase Dashboard
- Settings → Database → Connection string
- Click "Connection pooler"
- Copy the exact connection string and verify password

### Check Brevo SMTP
- Log into Brevo.com
- Settings → SMTP & API → SMTP tab
- Verify:
  - SMTP Login: `a2fb04001@smtp-brevo.com`
  - SMTP Key: Should match what you provided
  - Port: 587 ✅

### Check Verified Sender Email
- In Brevo, go to Senders & Domains
- Verify that `itsmmadison@gmail.com` is confirmed (has ✅)
- If not confirmed, Brevo won't send emails from that address

---

## 🚨 Troubleshooting

### Issue: "Email failed to send"
**Solution:**
1. Check `SMTP_PASSWORD` is exactly correct (copy from Brevo)
2. Verify sender email is confirmed in Brevo
3. Check Render logs: `render logs --follow`

### Issue: "Frontend can't reach backend"
**Solution:**
1. Verify `VITE_API_URL` is set in Netlify
2. Verify backend is responding: `curl https://madison88-itsm-platform.onrender.com/health`
3. Check CORS headers in DevTools

### Issue: "Database connection failed"
**Solution:**
1. Verify `DATABASE_URL` has correct password
2. Double-check: `postgresql://postgres.ktduabpfsqlubqpweiot:YOUR-PASSWORD@aws-1-ap-south-1.pooler.supabase.com:5432/postgres`
3. Replace `YOUR-PASSWORD` with actual password

### Issue: Render deployment fails
**Solution:**
1. Check Render build logs for errors
2. Verify all required env vars are set
3. Try triggering a manual deploy

---

## 📋 Final Checklist

```
BEFORE DEPLOYING:
[ ] Replace YOUR-PASSWORD with actual Supabase password
[ ] Generate strong JWT_SECRET (32+ chars)
[ ] Verify Brevo sender email is confirmed
[ ] Verify Render env vars are exactly as above
[ ] Verify Netlify env var is set

DEPLOYMENT:
[ ] Deploy Render backend
[ ] Wait for "Live" status
[ ] Verify /health endpoint works
[ ] Set Netlify frontend env var
[ ] Deploy Netlify frontend
[ ] Wait for build to complete

TESTING:
[ ] Frontend loads at https://m88itsm.netlify.app
[ ] Routes don't 404
[ ] API calls work (check DevTools)
[ ] Emails send successfully
[ ] No errors in Render logs

DONE:
[ ] All tests pass
[ ] Team notified of new URL
[ ] URLs documented
```

---

## 📞 Support

**If anything fails:**
1. Check Render logs: `render logs --follow` (from Render CLI or dashboard)
2. Check Netlify build logs: Dashboard → Deploys → Click deployment
3. Verify all env variables are set correctly
4. Check browser console for errors (F12)

**Common URLs you need:**
- Backend: https://madison88-itsm-platform.onrender.com
- Frontend: https://m88itsm.netlify.app
- Brevo: https://app.brevo.com
- Supabase: https://app.supabase.com

---

**Status:** ✅ Ready for Deployment  
**Next Action:** Follow the STEP 1 & 2 above to add environment variables

