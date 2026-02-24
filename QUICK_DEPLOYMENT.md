# ⚡ Quick Start Deployment (5 minutes)

## 🎯 Your Production Stack

```
Frontend:  https://m88itsm.netlify.app
Backend:   https://madison88-itsm-platform.onrender.com
Database:  Supabase (aws-1-ap-south-1.pooler.supabase.com)
Email:     Brevo SMTP (smtp-relay.brevo.com:587)
```

---

## ⏱️ 5-Minute Setup

### ✅ Step 1: Generate JWT Secret (30 seconds)

**Windows PowerShell:**
```powershell
$secret = -join (1..32 | ForEach-Object { [char](Get-Random -Minimum 33 -Maximum 126) })
[Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($secret))
```

**Mac/Linux:**
```bash
openssl rand -base64 32
```

Copy the output - you'll use this for `JWT_SECRET`.

---

### ✅ Step 2: Add Render Environment Variables (2 minutes)

1. Go to: https://dashboard.render.com
2. Click your service: `madison88-itsm-platform`
3. Click: **Environment**
4. Click: **Add Environment Variable** (or paste all at once)

**Copy & Paste These:**
```
NODE_ENV=production
FRONTEND_URL=https://m88itsm.netlify.app
FRONTEND_PROD_URL=https://m88itsm.netlify.app
DATABASE_URL=postgresql://postgres.ktduabpfsqlubqpweiot:YOUR-SUPABASE-PASSWORD@aws-1-ap-south-1.pooler.supabase.com:5432/postgres
JWT_SECRET=[PASTE-YOUR-SECRET-FROM-STEP-1-HERE]
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=a2fb04001@smtp-brevo.com
SMTP_PASSWORD=xsmtpsib-410213093fe8d37e82e5a2866895b2472f1705c85f1e41a51a8324cdf1bbc2d4-iMH3z6nT65QbI8cA
SMTP_FROM_EMAIL=itsmmadison@gmail.com
SMTP_FROM_NAME=Madison88 ITSM Support
ADMIN_NOTIFICATION_EMAIL=itsmmadison@gmail.com
ENABLE_EMAIL_NOTIFICATIONS=true
```

**IMPORTANT:** Replace `YOUR-SUPABASE-PASSWORD` with your actual Supabase password.

5. Click: **Save** → Render auto-deploys ✨

---

### ✅ Step 3: Add Netlify Environment Variable (1 minute)

1. Go to: https://app.netlify.com
2. Select app: `m88itsm`
3. Go to: **Site Settings → Build & Deploy → Environment**
4. Add new variable:
   - Key: `VITE_API_URL`
   - Value: `https://madison88-itsm-platform.onrender.com/api`

5. Click: **Save**

---

### ✅ Step 4: Watch Deployments (1-2 minutes)

**Render Backend:**
- Go to Render dashboard
- Watch "Builds" tab
- Wait for green **"Live"** status (~1 min)

**Netlify Frontend:**
- Go to Netlify dashboard
- Go to "Deploys" tab
- Trigger deploy: **Deploy site** button
- Wait for green checkmark (~2-3 min)

---

## 🧪 Test It Works (1 minute)

### Test 1: Backend Health
```bash
curl https://madison88-itsm-platform.onrender.com/health
```
Expected: `{"status":"healthy",...}`

### Test 2: Frontend Loads
- Open: https://m88itsm.netlify.app
- Should see your ITSM app (no 404)

### Test 3: API Connected
- Open https://m88itsm.netlify.app
- Press F12 → Console tab
- Paste:
```javascript
fetch(import.meta.env.VITE_API_URL + '/health').then(r=>r.json()).then(console.log)
```
- Should show: `{status: "healthy", ...}`

### Test 4: Email Works
- Create a test ticket
- Check email arrives (check spam folder too)

---

## ✅ Done! ✨

If all tests pass, you're **live in production**! 🎉

```
✅ Frontend: https://m88itsm.netlify.app
✅ Backend: https://madison88-itsm-platform.onrender.com/api
✅ Email: Brevo SMTP configured
✅ Database: Supabase connected
```

---

## ❓ Need Help?

**Email not sending?**
- Verify sender email `itsmmadison@gmail.com` is confirmed in Brevo
- Check Render logs: `render logs --follow`

**Frontend can't reach backend?**
- Verify `VITE_API_URL` is set in Netlify env vars
- Check backend is responding: `curl https://madison88-itsm-platform.onrender.com/health`

**Database error?**
- Double-check `DATABASE_URL` has correct password
- Verify URL format: `postgresql://postgres.ktduabpfsqlubqpweiot:YOUR-PASSWORD@aws-1-ap-south-1.pooler.supabase.com:5432/postgres`

---

**Status:** 🚀 Ready to Deploy!  
**Time to Production:** ~5 minutes  
**Confidence Level:** ✅ High

