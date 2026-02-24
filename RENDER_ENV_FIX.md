# Render Environment Configuration Fix

## Problem: Database Timeout Issues

The current `DATABASE_URL` includes `pgbouncer=true` which is incompatible with Supabase's Session Pooler. This causes connection timeouts and pooling errors.

---

## ✅ Solution: Update DATABASE_URL on Render

### Step 1: Go to Render Dashboard
1. Navigate to [render.com](https://render.com)
2. Find your backend service: **madison88-itsm** (or similar)
3. Click on the service name

### Step 2: Update Environment Variables

In the **Environment** tab:

**OLD DATABASE_URL (Remove):**
```
postgresql://postgres.ktduabpfsqlubqpweiot:Hir%40imomo20@aws-1-ap-south-1.pooler.supabase.com:5432/postgres?pgbouncer=true&sslmode=no-verify
```

**NEW DATABASE_URL (Replace with):**
```
postgresql://postgres.ktduabpfsqlubqpweiot:Hir%40imomo20@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require&connection_limit=10&connect_timeout=30
```

### Key Changes:
- `pgbouncer=true` → **removed** (not compatible with Session Pooler)
- Port `5432` → `6543` (Supabase Session Pooler port)
- `sslmode=no-verify` → `sslmode=require` (more secure for Supabase)
- Added `connection_limit=10` (optimal for serverless, prevents connection exhaustion)
- Added `connect_timeout=30` (30 second timeout for slow connections)

### Step 3: Save & Redeploy

1. Click **Save** at the bottom of the Environment tab
2. The service will **auto-redeploy** (watch the Deploys tab for progress)
3. Once deployment completes, test the connection

---

## ✅ Code-side Fix (Already Applied)

The backend now includes:
```javascript
// backend/src/app.js
app.set('trust proxy', 1);  // ← Trusts Render's proxy; fixes rate limiter IP detection
```

This allows Express rate limiters to correctly identify client IPs even when behind Render's load balancer.

---

## Testing the Fix

Once both changes are applied:

1. **Check backend logs** in Render:
   - Should see no more `ECONNREFUSED` or timeout errors
   - Should see connection pool messages like `pool size = 10`

2. **Test an API endpoint** (e.g., from Netlify frontend or curl):
   ```bash
   curl -X GET https://madison88-itsm.onrender.com/api/auth/me \
     -H "Authorization: Bearer <YOUR_TOKEN>"
   ```
   Should return `200 OK` (or `401 if no token`)

3. **Verify rate limiting works**:
   ```bash
   # Spam an endpoint (should hit rate limit after ~500 requests in 15 min)
   for i in {1..30}; do curl https://madison88-itsm.onrender.com/api/users; done
   ```

---

## Troubleshooting

If issues persist after the update:

1. **Check Supabase credentials** in the URL (copy from [supabase.com](https://supabase.com) dashboard)
2. **Verify SSL mode**: Use `sslmode=require` for production
3. **Check connection limits**: If many services connect, increase `connection_limit` to 20 or 30
4. **Restart service**: In Render dashboard, click **Restart Service** or re-deploy

---

## Summary

| Issue | Fix | Status |
|-------|-----|--------|
| Rate limiter IP detection | `app.set('trust proxy', 1)` | ✅ Applied in code |
| Database connection pooling | Update `DATABASE_URL` in Render env | ⏳ Manual: See Step 2 above |

Once you update the `DATABASE_URL` in Render, the system should be production-ready.
