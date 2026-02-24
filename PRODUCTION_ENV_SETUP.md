# Production Environment Setup Guide

## Overview
This document outlines all environment variables that must be configured in production before deployment. The application is deployed to:
- **Frontend**: Netlify  
- **Backend**: Render  
- **Database**: Supabase  
- **Email**: Brevo (SMTP Relay)

---

## 🔒 CRITICAL SECURITY NOTES

⚠️ **NEVER commit .env files to version control**  
⚠️ **NEVER expose credentials in error messages or logs**  
⚠️ **ALWAYS use secure, randomly generated passwords/keys for production**  
⚠️ **Rotate credentials regularly**

---

## Backend Environment Variables (Render)

Add these in **Render Dashboard → Environment**

```env
# === DATABASE ===
DATABASE_URL=postgresql://[user]:[password]@[host]:[port]/[database]
# Use Supabase connection pooler URL for better performance
# Format: postgresql://user:password@pooler.supabase.co:6543/postgres

# === SERVER ===
NODE_ENV=production
PORT=3000  # Render assigns this port automatically
API_URL=https://your-backend.onrender.com  # Set to your actual Render URL

# === FRONTEND URLS (CORS) ===
FRONTEND_URL=https://your-site.netlify.app
FRONTEND_PROD_URL=https://your-site.netlify.app

# === JWT SECURITY ===
JWT_SECRET=[Generate a strong random string - at least 32 characters]
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRY=7d

# === EMAIL / BREVO SMTP ===
ENABLE_EMAIL_NOTIFICATIONS=true
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587  # IMPORTANT: Use 587 (TLS), not 465 or 25
SMTP_USER=[your-brevo-smtp-login]
SMTP_PASSWORD=[your-brevo-smtp-password]
SMTP_FROM_EMAIL=[verified-sender-email@yourdomain.com]
SMTP_FROM_NAME=Madison88 ITSM Support
ADMIN_NOTIFICATION_EMAIL=[admin-email@yourdomain.com]

# === AWS/STORAGE (if using S3 for uploads) ===
AWS_REGION=ap-southeast-1
AWS_ACCESS_KEY_ID=[your-aws-key]
AWS_SECRET_ACCESS_KEY=[your-aws-secret]
AWS_S3_BUCKET=[your-bucket-name]

# === OPTIONAL: EMAILJS (if using instead of SMTP) ===
# EMAILJS_SERVICE_ID=[your-service-id]
# EMAILJS_TEMPLATE_ID=[your-template-id]
# EMAILJS_PUBLIC_KEY=[your-public-key]
# EMAILJS_PRIVATE_KEY=[your-private-key]

# === OPTIONAL: AUTH0 (if using Auth0) ===
# VITE_AUTH0_DOMAIN=your-domain.auth0.com
# VITE_AUTH0_CLIENT_ID=your-client-id
```

---

## Frontend Environment Variables (Netlify)

Add these in **Netlify → Site Settings → Build & Deploy → Environment**

```env
# === API ENDPOINT ===
VITE_API_URL=https://your-backend.onrender.com/api

# === OPTIONAL: AUTH0 (if using) ===
# VITE_AUTH0_DOMAIN=your-domain.auth0.com
# VITE_AUTH0_CLIENT_ID=your-client-id
# VITE_AUTH0_REDIRECT_URI=https://your-site.netlify.app/callback
```

---

## Step-by-Step Deployment Checklist

### 1. Prepare Backend (Render)

- [ ] Create account on Render.com
- [ ] Connect GitHub repository
- [ ] Create new Web Service from repository
- [ ] Set **Build Command**: `npm install && npm run migrate`
- [ ] Set **Start Command**: `node src/server.js`
- [ ] Add all environment variables from Backend section above
- [ ] Verify `/health` endpoint returns `{"status": "healthy"}`
- [ ] Test API endpoint: `curl https://your-backend.onrender.com/health`

### 2. Prepare Brevo Email

- [ ] Log in to Brevo.com
- [ ] Go to Settings → SMTP & API
- [ ] Generate SMTP credentials (or use existing ones)
- [ ] Verify your sender email address in Brevo dashboard
- [ ] Set `SMTP_PORT=587` (Render blocks 25 and 465)
- [ ] Test email sending with backend email test script
- [ ] Monitor email delivery in Brevo dashboard

### 3. Configure Supabase Database

- [ ] Log in to Supabase
- [ ] Copy **Connection String (Pooler)** for backend
- [ ] Enable **Row Level Security (RLS)** on all tables
- [ ] Create appropriate RLS policies
- [ ] Verify connection from Render: `psql $DATABASE_URL -c "SELECT 1"`

### 4. Deploy Frontend (Netlify)

- [ ] Connect GitHub to Netlify
- [ ] Set build command: `npm run build`
- [ ] Set publish directory: `build` or `dist`
- [ ] Add Netlify environment variables
- [ ] Verify `_redirects` file exists in `public/` folder
- [ ] Deploy and verify routing works
- [ ] Test API calls in browser console

### 5. Verify Post-Deployment

```bash
# Backend Health Check
curl https://your-backend.onrender.com/health

# Database Connection
curl https://your-backend.onrender.com/api/auth/health

# CORS from Frontend
curl -H "Origin: https://your-site.netlify.app" \
  https://your-backend.onrender.com/health

# Frontend SPA Routes
curl https://your-site.netlify.app/  # Should return index.html
curl https://your-site.netlify.app/settings  # Should redirect to /index.html
```

### 6. Monitor & Troubleshoot

- [ ] Check Render logs for errors: `render logs --tail`
- [ ] Check Netlify build logs
- [ ] Verify email delivery in Brevo dashboard
- [ ] Set up uptime monitoring on Render
- [ ] Enable CORS logging in backend for debugging

---

## 🔗 Important URLs to Update

Replace these in your configuration:

| Component | Development | Production |
|-----------|------------|-----------|
| Backend | `http://localhost:3001` | `https://your-backend.onrender.com` |
| Frontend | `http://localhost:3000` | `https://your-site.netlify.app` |
| Database | Local/Supabase Dev | Supabase Production |
| Email | Local/Gmail SMTP | Brevo SMTP Relay |

---

## 🚨 Common Production Issues

### Email Not Sending
- ✅ Verify SMTP_PORT=587 (not 465 or 25)
- ✅ Verify sender email is verified in Brevo
- ✅ Check backend logs: `render logs --follow`
- ✅ Verify CORS allows Render IP
- ✅ Try SMTP test: `telnet smtp-relay.brevo.com 587`

### Frontend Can't Call Backend API
- ✅ Verify `VITE_API_URL` is set in Netlify env vars
- ✅ Check CORS config includes Netlify domain
- ✅ Verify backend is responding: `curl https://backend-url/health`
- ✅ Check browser console for blocked requests

### Database Connection Fails
- ✅ Verify DATABASE_URL is correct (use pooler URL)
- ✅ Check database is accessible from Render IP
- ✅ Verify credentials are correct
- ✅ Test connection: `psql $DATABASE_URL -c "SELECT 1"`

### Brevo SMTP Timeout/Connection Refused
- ✅ Port 587 must be used (not 465 or 25)
- ✅ Render may block port 25 - use relay instead
- ✅ Check credentials are correct
- ✅ Verify ENABLE_EMAIL_NOTIFICATIONS=true

---

## 🔄 Continuous Integration / Deployment

### For Production Deployments:

1. **Never push .env files** - use deployment platform's env var UI
2. **Run migrations before deploys**: `npm run migrate`
3. **Test health endpoint**: `curl /health`
4. **Monitor error logs** immediately after deploy
5. **Verify email delivery** within first hour
6. **Check user logins** and basic workflows

---

## 📞 Support

For issues, check logs:
- **Backend**: Render dashboard → Logs tab
- **Frontend**: Netlify dashboard → Deploy logs
- **Email**: Brevo dashboard → Activity tab
- **Database**: Supabase dashboard → Logs

