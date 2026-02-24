# Render Environment Configuration Fix

## Problem: Database Connection Issues

**Current Error**: `ENETUNREACH` — Render cannot reach your Supabase database. This happens when:
1. `DATABASE_URL` hasn't been updated in Render environment
2. DNS resolution issues (rare, but possible)
3. Old credentials or incorrect pooler endpoint

---

## ✅ Quick Fix (3 Steps)

### Step 1: Copy the New DATABASE_URL
```
postgresql://postgres.ktduabpfsqlubqpweiot:Hir%40imomo20@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require
```

### Step 2: Update Render Dashboard
1. Go to [dashboard.render.com](https://dashboard.render.com)
2. Click your backend service (**madison88-itsm**)
3. Go to **Environment** tab
4. Find `DATABASE_URL` and paste the URL above
5. Click **Save**

### Step 3: Wait for Redeploy
- Render will auto-redeploy (watch **Deploys** tab)
- Wait for green checkmark
- Check logs — should see `Database connection established`

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
