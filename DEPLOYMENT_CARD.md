# 🎯 DEPLOYMENT QUICK REFERENCE CARD

Print this or keep open while deploying

---

## 🔑 Your Credentials (Verified)

```
FRONTEND:     https://m88itsm.netlify.app
BACKEND:      https://madison88-itsm-platform.onrender.com
DATABASE:     aws-1-ap-south-1.pooler.supabase.com
SMTP SERVER:  smtp-relay.brevo.com:587
SMTP LOGIN:   a2fb04001@smtp-brevo.com
SMTP KEY:     xsmtpsib-410213093fe8d37e82e5a2866895b2472f1705c85f1e41a51a8324cdf1bbc2d4-iMH3z6nT65QbI8cA
API KEY:      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
```

---

## 🚀 STEP 1: Generate JWT Secret

**Windows PowerShell:**
```powershell
$secret = -join (1..32 | ForEach-Object { [char](Get-Random -Minimum 33 -Maximum 126) })
[Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($secret))
```

**Mac/Linux:**
```bash
openssl rand -base64 32
```

**Copy the output** → Use for JWT_SECRET below ↓

---

## 🔧 STEP 2: Render Environment Variables

**Go to:** https://dashboard.render.com

**Select:** madison88-itsm-platform → **Environment**

**Copy all these variables:**
```env
NODE_ENV=production
FRONTEND_URL=https://m88itsm.netlify.app
FRONTEND_PROD_URL=https://m88itsm.netlify.app
DATABASE_URL=postgresql://postgres.ktduabpfsqlubqpweiot:YOUR-PASSWORD@aws-1-ap-south-1.pooler.supabase.com:5432/postgres
JWT_SECRET=[PASTE-YOUR-SECRET-HERE]
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=a2fb04001@smtp-brevo.com
SMTP_PASSWORD=xsmtpsib-410213093fe8d37e82e5a2866895b2472f1705c85f1e41a51a8324cdf1bbc2d4-iMH3z6nT65QbI8cA
SMTP_FROM_EMAIL=itsmmadison@gmail.com
SMTP_FROM_NAME=Madison88 ITSM Support
ADMIN_NOTIFICATION_EMAIL=itsmmadison@gmail.com
ENABLE_EMAIL_NOTIFICATIONS=true
```

**IMPORTANT:** Replace `YOUR-PASSWORD` with your Supabase password

**Click:** Save → Backend auto-deploys ✨

---

## 🌐 STEP 3: Netlify Environment Variable

**Go to:** https://app.netlify.com → m88itsm

**Path:** Site Settings → Build & Deploy → Environment

**Add ONE variable:**
```
Key:   VITE_API_URL
Value: https://madison88-itsm-platform.onrender.com/api
```

**Click:** Save

---

## ⏳ STEP 4: Wait for Deployments

**Render Backend:**
- Render Dashboard → madison88-itsm-platform → Builds tab
- Wait for status: **"Live"** (green) ✅
- Takes ~1-2 minutes

**Netlify Frontend:**
- Netlify Dashboard → m88itsm → Deploys tab
- Click: **"Deploy site"** button
- Wait for green checkmark ✅
- Takes ~2-3 minutes

---

## 🧪 STEP 5: Verify Everything

### Test 1: Backend Health
```bash
curl https://madison88-itsm-platform.onrender.com/health
```
**Expected:** `{"status":"healthy",...}`

### Test 2: Frontend Loads
Open in browser:
```
https://m88itsm.netlify.app
```
**Expected:** App loads (no 404, no errors)

### Test 3: API Connected
Open: https://m88itsm.netlify.app → Press **F12** → **Console** tab

Paste:
```javascript
fetch(import.meta.env.VITE_API_URL + '/health').then(r=>r.json()).then(d=>console.log('✅ Backend:', d)).catch(e=>console.error('❌ Error:', e))
```

**Expected:** Shows `✅ Backend: {status: "healthy", ...}`

### Test 4: CORS Works
```bash
curl -H "Origin: https://m88itsm.netlify.app" https://madison88-itsm-platform.onrender.com/health -v
```

**Look for:**
```
Access-Control-Allow-Origin: https://m88itsm.netlify.app
```

### Test 5: Email Works
1. Open: https://m88itsm.netlify.app
2. Login
3. Create new ticket
4. Check email arrives in inbox (check spam too!)

---

## ✅ Success Checklist

- [ ] Render shows "Live" status
- [ ] Netlify deployment completed
- [ ] Backend health check returns 200
- [ ] Frontend loads without errors
- [ ] API calls work from browser console
- [ ] CORS headers present
- [ ] Email sends successfully
- [ ] All tests pass

---

## 🚨 Emergency Troubleshooting

### If backend won't start:
```bash
# Check Render logs
render logs --follow
```
Look for errors in output.

### If frontend shows blank page:
1. Press F12 → Console tab
2. Look for red errors
3. Check VITE_API_URL is set in Netlify env vars

### If email won't send:
1. Check Render logs: `render logs --follow`
2. Verify sender email confirmed in Brevo
3. Verify SMTP_PASSWORD exactly matches (no spaces)

### If API not responding:
1. Verify VITE_API_URL is correct
2. Verify CORS allows https://m88itsm.netlify.app
3. Check backend is running: `curl https://madison88-itsm-platform.onrender.com/health`

---

## 📖 Need More Help?

| Document | When to Read |
|----------|--------------|
| [QUICK_DEPLOYMENT.md](QUICK_DEPLOYMENT.md) | Initial 5-min overview |
| [FINAL_DEPLOYMENT_CONFIG.md](FINAL_DEPLOYMENT_CONFIG.md) | Detailed explanations |
| [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) | Full verification list |
| [DOCUMENTATION_INDEX.md](DOCUMENTATION_INDEX.md) | Find any document |

---

## ⏱️ Timeline

```
5 min  │ Generate JWT secret + read guide
2 min  │ Add Render env vars
1 min  │ Add Netlify env var
5 min  │ Watch deployments complete
7 min  │ Run verification tests
──────┼──────────────────────────
20 min │ TOTAL TO PRODUCTION ✨
```

---

## 🎉 When It Works

You'll see:
- ✅ Frontend at: https://m88itsm.netlify.app
- ✅ Backend responding: https://madison88-itsm-platform.onrender.com/api
- ✅ Emails sending from: itsmmadison@gmail.com
- ✅ Dashboard fully functional
- ✅ LIVE IN PRODUCTION! 🚀

---

## 📝 Notes

```
Supabase Password: _________________________
JWT Secret Generated: _________________________
Render Deployment Time: _________________________
Netlify Deployment Time: _________________________
All Tests Pass: YES / NO
Deployment Date: _________________________
```

---

**Version:** 1.0  
**Last Updated:** February 24, 2026  
**Status:** ✅ Ready to Use

