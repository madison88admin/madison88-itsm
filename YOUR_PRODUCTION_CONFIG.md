# 🚀 Production Configuration - Your Setup

**Netlify Frontend:** https://m88itsm.netlify.app  
**Brevo API Key:** Provided ✅

---

## ⚠️ IMPORTANT: Brevo API Key Security

Your Brevo API key is sensitive. **NEVER commit it to code or Git.**

✅ Store it only in **Render Environment Variables**  
❌ DO NOT paste in any code files

---

## 🔧 Render Backend Setup

### Step 1: Get Your Render URL

1. Go to **Render Dashboard** → Select your Web Service
2. Find the service URL (looks like `https://your-service-name.onrender.com`)
3. Copy it

### Step 2: Add These Environment Variables to Render

Go to **Render Dashboard → Environment** and add:

```env
NODE_ENV=production
PORT=3000

FRONTEND_URL=https://m88itsm.netlify.app
FRONTEND_PROD_URL=https://m88itsm.netlify.app

DATABASE_URL=postgresql://user:pass@pooler.supabase.co:6543/postgres

JWT_SECRET=[generate strong random 32 char string]

SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=[your brevo SMTP email - may differ from API key account]
SMTP_PASSWORD=[your brevo SMTP password]
SMTP_FROM_EMAIL=[your verified sender email]
SMTP_FROM_NAME=Madison88 ITSM Support

ADMIN_NOTIFICATION_EMAIL=itsmmadison@gmail.com

ENABLE_EMAIL_NOTIFICATIONS=true
```

### Step 3: Set Frontend Environment Variable in Netlify

Go to **Netlify Dashboard → Site Settings → Build & Deploy → Environment**

Add:
```env
VITE_API_URL=https://your-render-service.onrender.com/api
```

Replace `your-render-service` with your actual Render service name.

---

## 🔑 Your Brevo Configuration

### API Key Provided:
```
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
```

### For Brevo SMTP Email Sending:

1. **Log into Brevo.com** → Settings → SMTP & API
2. **Find your SMTP credentials** (may be different from API key):
   - SMTP Username: Usually your Brevo login email
   - SMTP Password: Your SMTP password (generated in Brevo)
3. **Verify your sender email** is confirmed in Brevo
4. **Set in Render:**
   ```env
   SMTP_USER=[your brevo SMTP email]
   SMTP_PASSWORD=[your brevo SMTP password]
   SMTP_FROM_EMAIL=[confirmed sender email]
   ```

### For Brevo API (Alternative - HTTP instead of SMTP):

If you want to use Brevo's HTTP API instead of SMTP:
```env
BREVO_API_KEY=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
```

This would require backend code changes to use the API instead of SMTP.

---

## ✅ Configuration Checklist

```
[ ] Get Render backend URL
[ ] Set FRONTEND_URL and FRONTEND_PROD_URL in Render to: https://m88itsm.netlify.app
[ ] Set JWT_SECRET to strong random value (32+ characters)
[ ] Set DATABASE_URL to Supabase pooler URL
[ ] Set SMTP credentials from Brevo (or BREVO_API_KEY)
[ ] Deploy backend
[ ] Verify backend responds: curl https://your-render-url/health
[ ] Set VITE_API_URL in Netlify to your Render backend URL
[ ] Deploy frontend
[ ] Test: https://m88itsm.netlify.app
```

---

## 🧪 Test After Deployment

### Backend Health Check
```bash
# Should return {"status": "healthy", ...}
curl https://your-render-url/health
```

### Frontend Console Test
```javascript
// Open DevTools Console on https://m88itsm.netlify.app
fetch(import.meta.env.VITE_API_URL + '/health')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error)
```

### CORS Test
```bash
# Check CORS headers
curl -H "Origin: https://m88itsm.netlify.app" https://your-render-url/health -v
```

---

## ❓ Need Your Render Backend URL

**What I still need from you:**

1. Your **Render backend service URL** (looks like: `https://madison88-app.onrender.com`)
2. Your **Database connection string** (Supabase pooler URL)
3. Your **SMTP credentials from Brevo** (if different from API key)

Once you provide these, I can:
- ✅ Configure CORS to use `https://m88itsm.netlify.app`
- ✅ Set up Brevo email sending
- ✅ Create final deployment script

---

**Status:** ⏳ Waiting for:
- [ ] Render backend URL
- [ ] Supabase connection string  
- [ ] Brevo SMTP credentials (if applicable)

