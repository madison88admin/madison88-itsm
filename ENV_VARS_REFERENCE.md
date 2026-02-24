# 🔧 Production Environment Variables - Quick Reference

## Netlify Frontend Environment Variables

**Location:** Netlify Dashboard → Site Settings → Build & Deploy → Environment

```env
# API Endpoint - Update this to your actual backend URL
VITE_API_URL=https://your-backend.onrender.com/api

# Optional: Auth0 Configuration (if using)
# VITE_AUTH0_DOMAIN=your-domain.auth0.com
# VITE_AUTH0_CLIENT_ID=your-client-id
# VITE_AUTH0_REDIRECT_URI=https://your-site.netlify.app/callback
```

---

## Render Backend Environment Variables

**Location:** Render Dashboard → Environment variables (or env.render file)

### Required Variables

```env
# === Environment ===
NODE_ENV=production

# === Server ===
# Note: PORT is automatically assigned by Render, do not set manually
# PORT=3000  <- Render handles this

# === Frontend URLs (CORS) ===
FRONTEND_URL=https://your-site.netlify.app
FRONTEND_PROD_URL=https://your-site.netlify.app

# === Database ===
# Use Supabase connection pooler URL (not direct connection)
DATABASE_URL=postgresql://[user]:[password]@pooler.supabase.co:6543/[database]

# === Security - JWT ===
# Generate a strong random secret! Example: openssl rand -base64 32
JWT_SECRET=[PUT-YOUR-32-CHAR-RANDOM-SECRET-HERE]
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRY=7d

# === Email Service - Brevo SMTP ===
ENABLE_EMAIL_NOTIFICATIONS=true
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=[your-brevo-smtp-login-email]
SMTP_PASSWORD=[your-brevo-smtp-password]
SMTP_FROM_EMAIL=[verified-sender-email@yourdomain.com]
SMTP_FROM_NAME=Madison88 ITSM Support
ADMIN_NOTIFICATION_EMAIL=[admin@yourdomain.com]
```

### Optional Variables

```env
# === Optional: AWS S3 (if using for file uploads) ===
# AWS_REGION=ap-southeast-1
# AWS_ACCESS_KEY_ID=your-aws-key
# AWS_SECRET_ACCESS_KEY=your-aws-secret
# AWS_S3_BUCKET=your-bucket-name

# === Optional: EmailJS (alternative to SMTP) ===
# EMAILJS_SERVICE_ID=service_xxxxx
# EMAILJS_TEMPLATE_ID=template_xxxxx
# EMAILJS_PUBLIC_KEY=public_xxxxx
# EMAILJS_PRIVATE_KEY=private_xxxxx

# === Optional: Redis (for idempotency) ===
# REDIS_ENABLED=false  (set true if using Redis)
# REDIS_URL=redis://host:port
```

---

## 📝 Copy-Paste Template

### For Netlify (Frontend)
```env
VITE_API_URL=https://your-backend.onrender.com/api
```

### For Render (Backend) - Minimal Setup
```env
NODE_ENV=production
FRONTEND_URL=https://your-site.netlify.app
FRONTEND_PROD_URL=https://your-site.netlify.app
DATABASE_URL=postgresql://user:pass@pooler.supabase.co:6543/postgres
JWT_SECRET=your-strong-32-char-random-secret-here
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=your-brevo-login
SMTP_PASSWORD=your-brevo-password
SMTP_FROM_EMAIL=verified-sender@yourdomain.com
SMTP_FROM_NAME=Madison88 ITSM Support
ADMIN_NOTIFICATION_EMAIL=admin@yourdomain.com
ENABLE_EMAIL_NOTIFICATIONS=true
```

---

## 🔐 How to Generate Strong Secrets

### Linux/Mac
```bash
# Generate JWT_SECRET
openssl rand -base64 32

# Example output:
# abc123+XYZ/def456+UVW/ghi789+RST/jkl012+OPQ=
```

### Windows PowerShell
```powershell
[System.Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes((1..32 | % {[char](Get-Random -Minimum 33 -Maximum 127))} -join "")))
```

### Or use an online generator
- https://generate-random.org/base64
- https://www.random.org/strings/

---

## 🔍 Where to Find Values

### Brevo SMTP Credentials
1. Log in to brevo.com
2. Settings → SMTP & API → Tab "SMTP"
3. Copy your SMTP:
   - SMTP_USER: Your email from "SMTP Users"
   - SMTP_PASSWORD: Password for that user
4. Verify sender email is confirmed

### Supabase Connection Pooler URL
1. Log in to supabase.com → Project
2. Settings → Database → Connection string
3. Select "Connection pooler" (not Direct connection)
4. Copy POOLER_URL

### Your Deployed URLs
- **Backend:** `https://your-app-name.onrender.com` (get from Render dashboard)
- **Frontend:** `https://your-site.netlify.app` (get from Netlify dashboard)

---

## ⚠️ Important Notes

1. **PORT:** Do NOT set PORT for Render - it assigns automatically
2. **SMTP_PORT:** Must be 587 (not 465 or 25) - Render blocks other ports
3. **DATABASE_URL:** Use **connection pooler** URL, not direct connection URL
4. **JWT_SECRET:** Regenerate for each new deployment
5. **Sender Email:** Must be VERIFIED in Brevo dashboard first

---

## ✅ Verification After Setting Variables

```bash
# Test backend health
curl https://your-backend.onrender.com/health

# Expected response:
# {"status": "healthy", "timestamp": "2026-02-24T...", "environment": "production"}

# Test from browser console
fetch('https://your-backend.onrender.com/health')
  .then(r => r.json())
  .then(d => console.log('Backend OK:', d))
  .catch(e => console.error('Backend error:', e))
```

---

## 🚀 Deployment Order

1. Set environment variables in **Render** first
2. Deploy backend to Render
3. Verify backend `/health` endpoint responds
4. Set environment variables in **Netlify**
5. Deploy frontend to Netlify
6. Test API connectivity from frontend
7. Create test ticket and verify email delivery

---

**Last Updated:** February 24, 2026  
**Ready to Deploy:** ✅ YES

