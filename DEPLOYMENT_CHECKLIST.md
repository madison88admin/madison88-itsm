# 🚀 Production Deployment Verification Checklist

**Date:** February 24, 2026  
**Platform Stack:** React (Vite) on Netlify → Node/Express on Render → Supabase → Brevo SMTP

---

## ✅ Pre-Deployment Code Review (COMPLETED)

### Frontend Code Fixes
- [x] **TicketDetailPage.jsx** - Removed hardcoded `http://localhost:3001` fallback
  - Fixed: Now uses `import.meta.env.VITE_API_URL` with `window.location.origin` fallback
  
- [x] **TicketConversation.jsx** - Removed hardcoded localhost fallback
  - Fixed: Now uses `import.meta.env.VITE_API_URL` with `window.location.origin` fallback
  
- [x] **socket.js** - Removed hardcoded onrender.com URL
  - Fixed: Now uses `import.meta.env.VITE_API_URL` or `window.location.origin`

- [x] **_redirects** - Removed hardcoded onrender.com API redirect
  - Fixed: Now simple SPA redirect rule, API calls handled via VITE_API_URL env var

- [x] **netlify.toml** - Updated with note about env variables
  - Fixed: Added comment about BACKEND_URL environment variable

- [x] **package.json proxy** - Marked as development-only
  - Status: No change needed (proxy comment added for clarity)

### Backend Code Fixes
- [x] **app.js CORS** - Made production-safe with env variables
  - Fixed: Now uses origin callback function with `FRONTEND_URL` and `FRONTEND_PROD_URL` env vars
  - Fixed: Removed hardcoded Netlify domain URLs
  
- [x] **Health Check Route** - Already present at `GET /health`
  - Status: ✅ Already implemented and correct

- [x] **Environment Variable Handling**
  - Status: ✅ Backend loads vars from `process.env` correctly
  - Status: ✅ SMTP_PORT should be 587 (documented)

### Email Service (Brevo SMTP)
- [x] **notification.service.js** - Verified error logging
  - Status: ✅ Errors are logged properly
  - Status: ✅ Falls back to EmailJS if configured

---

## 🔐 Environment Variables Configuration

### Backend (Render Dashboard)
```
[ ] NODE_ENV=production
[ ] PORT=3000  (or leave empty for Render to assign)
[ ] API_URL=https://your-backend.onrender.com

[ ] DATABASE_URL=postgresql://user:pass@pooler.supabase.co:6543/postgres
[ ] JWT_SECRET=[strong-random-32-char-minimum]
[ ] JWT_EXPIRES_IN=24h
[ ] JWT_REFRESH_EXPIRY=7d

[ ] FRONTEND_URL=https://your-site.netlify.app
[ ] FRONTEND_PROD_URL=https://your-site.netlify.app

[ ] SMTP_HOST=smtp-relay.brevo.com
[ ] SMTP_PORT=587
[ ] SMTP_USER=[brevo-smtp-login]
[ ] SMTP_PASSWORD=[brevo-smtp-password]
[ ] SMTP_FROM_EMAIL=[verified-sender@yourdomain.com]
[ ] SMTP_FROM_NAME=Madison88 ITSM Support
[ ] ENABLE_EMAIL_NOTIFICATIONS=true
[ ] ADMIN_NOTIFICATION_EMAIL=[admin@yourdomain.com]
```

### Frontend (Netlify Environment Variables)
```
[ ] VITE_API_URL=https://your-backend.onrender.com/api
```

---

## 🗄️ Database Setup (Supabase)

### Connection Configuration
- [ ] Copy **Connection Pooler URL** from Supabase dashboard
- [ ] Format: `postgresql://user:pass@pooler.supabase.co:6543/postgres`
- [ ] Add to `DATABASE_URL` in Render environment variables

### Risk Mitigation
- [ ] Enable **Row Level Security (RLS)** on all production tables
- [ ] Create RLS policies for multi-tenant isolation
- [ ] Verify migrations run on deploy:
  ```bash
  render logs --follow  # Monitor for migration errors
  ```
- [ ] Test connection: `psql $DATABASE_URL -c "SELECT 1"`

---

## 📧 Email Service Setup (Brevo)

### SMTP Configuration
- [ ] Log into Brevo dashboard (brevo.com)
- [ ] Navigate to Settings → SMTP & API
- [ ] Generate or retrieve SMTP credentials
- [ ] **Verify sender email address** in Brevo dashboard
- [ ] **IMPORTANT: Ensure SMTP_PORT=587** (not 465 or 25)

### Email Testing
```bash
# From backend terminal after deployment:
curl -X POST https://your-backend.onrender.com/api/test/email \
  -H "Content-Type: application/json" \
  -d '{"email": "test@yourdomain.com", "subject": "Test"}'

# Monitor delivery in Brevo dashboard → Activity
```

### Troubleshooting Port Issues
- [ ] If email fails: Check Render logs for "ECONNREFUSED"
- [ ] Render blocks ports 25 and 465; use **587 only**
- [ ] If need fallback: Implement Brevo HTTP API in notification.service.js

---

## 🌐 Frontend Deployment (Netlify)

### Build Configuration
- [ ] Repository connected to Netlify
- [ ] Build command: `npm run build`
- [ ] Publish directory: `build` or `dist`
- [ ] Node version: 18+ (set in netlify.toml or UI)

### Environment Variables
- [ ] `VITE_API_URL` set to your backend URL
- [ ] Any Auth0 or third-party service keys configured

### Verification
```bash
# Test health endpoint from deployed frontend:
# Open DevTools Console (F12) and run:
const apiUrl = import.meta.env.VITE_API_URL;
console.log("API Base:", apiUrl);

fetch(`${apiUrl}/health`)
  .then(r => r.json())
  .then(data => console.log("Backend health:", data))
  .catch(e => console.error("Backend error:", e));
```

### SPA Routing
- [ ] `_redirects` file exists at `frontend/public/_redirects`
- [ ] Contains: `/* /index.html 200`
- [ ] Test route: Navigate to `/settings` → should not show 404

---

## 🖥️ Backend Deployment (Render)

### Service Configuration
- [ ] Web Service created in Render dashboard
- [ ] GitHub repository connected
- [ ] Branch: `main` or `production`
- [ ] Build command: `npm install && npm run migrate`
- [ ] Start command: `node src/server.js`
- [ ] **DO NOT use**: `nodemon`, dev servers, or watch modes

### Health Check Setup
- [ ] Enable health checks in Render dashboard
- [ ] Path: `/health`
- [ ] Interval: 5 minutes
- [ ] Timeout: 30 seconds

### Verification
```bash
# Test backend health endpoint:
curl https://your-backend.onrender.com/health

# Expected response:
{"status": "healthy", "timestamp": "2026-02-24T...", "environment": "production"}

# Test CORS from frontend domain:
curl -H "Origin: https://your-site.netlify.app" https://your-backend.onrender.com/health
```

---

## 🔗 CORS & API Connectivity

### Verification Steps

1. **Test from Netlify Console:**
   ```javascript
   fetch('https://your-backend.onrender.com/health')
     .then(r => r.json())
     .then(console.log)
     .catch(console.error);
   ```

2. **Check CORS Headers:**
   ```bash
   curl -i -X OPTIONS https://your-backend.onrender.com/api/tickets \
     -H "Origin: https://your-site.netlify.app" \
     -H "Access-Control-Request-Method: GET"
   ```

3. **Expected HTTP 200 response with CORS headers:**
   ```
   Access-Control-Allow-Origin: https://your-site.netlify.app
   Access-Control-Allow-Credentials: true
   ```

---

## 🎯 Post-Deployment Testing

### Critical Workflows to Test

1. **User Authentication**
   - [ ] Sign up new user → Email verification sent
   - [ ] Email arrives within 5 minutes
   - [ ] Confirm email → Login works
   - [ ] Session persists across page reloads

2. **Ticket Creation**
   - [ ] Create new ticket → Notification email sent to assignee
   - [ ] Email arrives in inbox (not spam)
   - [ ] Ticket appears in dashboard immediately
   - [ ] File upload works (if applicable)

3. **Ticket Updates**
   - [ ] Add comment → Email sent to watchers
   - [ ] Change status → Escalation logic triggers (if applicable)
   - [ ] Reassign → New assignee notified

4. **API Connectivity**
   - [ ] Network requests use correct backend URL
   - [ ] DevTools Network tab shows: `https://your-backend.onrender.com/api/*`
   - [ ] NOT `localhost:3001` or old hardcoded URLs

5. **Error Handling**
   - [ ] Network error → User sees error message (not blank page)
   - [ ] Server error → Proper HTTP error code (not 200 with error body)
   - [ ] Session timeout → Redirect to login (not stuck screen)

---

## 🕵️ Monitoring & Logs

### Render Logs
```bash
# View live logs:
render logs --follow

# Filter for errors:
render logs --follow | grep -i error

# Check specific timestamps:
render logs --from "2026-02-24T10:00:00Z" --until "2026-02-24T10:30:00Z"
```

### Netlify Logs
- Dashboard → Deploys → Click deployment → View Deploy Log
- Dashboard → Analytics → Functions (if using Netlify Functions)

### Supabase Logs
- Supabase Dashboard → Logs → Query Performance
- Watch for slow queries or connection pool exhaustion

### Brevo Logs
- Brevo Dashboard → Activity → Filter by date
- Check delivery status and bounce rates

---

## 🚨 Known Issues & Troubleshooting

### Issue: "Failed to fetch" in Console
**Solution:** 
- Verify `VITE_API_URL` is set correctly in Netlify env vars
- Check CORS headers: `curl -v https://backend-url/health`
- Verify backend is responding: `curl https://backend-url/health`

### Issue: Emails Not Sending
**Solution:**
- Verify SMTP_PORT=587 (not 465 or 25)
- Check sender email is verified in Brevo
- Verify SMTP credentials are correct
- Check backend logs: `render logs --follow`
- Test SMTP connection: `telnet smtp-relay.brevo.com 587`

### Issue: Database Connection Pooler Timeout
**Solution:**
- Use connection pooler URL (not direct URL)
- Check max connections in Supabase dashboard
- Verify DATABASE_URL format: `postgresql://...@pooler.supabase.co:6543/...`

### Issue: Render Deployment Fails
**Solution:**
- Check build command runs successfully locally: `npm install && npm run migrate`
- Verify start command by running: `node src/server.js`
- Check for missing environment variables in Render dashboard
- Review full deploy log for specific errors

### Issue: Frontend Routes Show 404
**Solution:**
- Verify `_redirects` file exists in `frontend/public/` folder
- Check content: `/*    /index.html   200`
- Trigger redeploy in Netlify after file is committed

---

## ✅ Final Sign-Off Checklist

- [ ] All environment variables configured in Render
- [ ] All environment variables configured in Netlify
- [ ] Database migrations completed successfully
- [ ] SMTP credentials verified in Brevo
- [ ] Backend health check responds with 200
- [ ] Frontend loads without 404s
- [ ] API calls use correct backend URL (not localhost)
- [ ] CORS allows Netlify domain
- [ ] Email service sends successfully
- [ ] User authentication workflow tested end-to-end
- [ ] Ticket creation and notifications tested end-to-end
- [ ] Error handling verified (network errors, validation errors)
- [ ] No console errors in deployment
- [ ] Performance monitoring configured (if applicable)
- [ ] Runbook/escalation process documented for production issues
- [ ] Team notified of new production URL
- [ ] DNS/domain redirects configured (if using custom domain)

---

## 📞 Deployment Support

**Emergency Issues:**
1. Check logs immediately: `render logs --follow`
2. Rollback if critical: Push fix to main branch, Render redeploys automatically
3. Verify database constraints not violated: `psql $DATABASE_URL -c "SELECT * FROM pg_stat_database;"`

**Documentation:**
- See [PRODUCTION_ENV_SETUP.md](PRODUCTION_ENV_SETUP.md) for detailed env var guide
- See [CODE_AUDIT.md](CODE_AUDIT_FIXES.md) for code changes made

---

**Deployment Date:** _______________  
**Deployed By:** _______________  
**Verified By:** _______________  

