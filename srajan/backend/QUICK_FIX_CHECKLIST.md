# Quick Fix Checklist for Vercel NOT_FOUND Error

## ⚡ Immediate Actions (5 minutes)

### 1. Verify Vercel Project Root Directory
**CRITICAL - Most Common Issue**

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. **Settings** → **General** → **Root Directory**
4. Must be set to: `srajan/backend`
5. If different, change it and redeploy

### 2. Check Environment Variables
1. **Settings** → **Environment Variables**
2. Verify `MONGO_URI` exists (check spelling - it's `MONGO_URI` not `MONGODB_URI`)
3. Ensure it's set for **Production** environment
4. Add any other required variables from your `.env` file

### 3. Verify File Structure
Your backend should have:
```
srajan/backend/
  ├── api/
  │   └── index.js          ✅ Must exist
  ├── index.js              ✅ Your Express app
  ├── vercel.json           ✅ Configuration
  └── package.json          ✅ Dependencies
```

### 4. Test Deployment
After making changes:
1. Push to Git (triggers auto-deploy) OR
2. Run `cd srajan/backend && vercel --prod`
3. Wait for deployment to complete
4. Test: `https://your-app.vercel.app/`
5. Should return: "Backend is running 🚀"

## 🔍 Diagnostic Commands

### Check if api/index.js exists and is correct:
```bash
cd srajan/backend
cat api/index.js
# Should show: export default app;
```

### Check vercel.json:
```bash
cat vercel.json
# Should have builds, routes, and functions sections
```

### Verify Express app exports correctly:
```bash
grep "export default app" index.js
# Should find: export default app;
```

## ❌ Common Mistakes to Avoid

1. **Root Directory Wrong**
   - ❌ Set to repository root
   - ✅ Set to `srajan/backend`

2. **Missing api/index.js**
   - ❌ No `api/` directory
   - ✅ `api/index.js` exists and exports app

3. **Wrong Environment Variable Name**
   - ❌ Code uses `MONGO_URI` but env var is `MONGODB_URI`
   - ✅ Match exactly what code expects

4. **Multiple vercel.json Files**
   - ❌ Both root and backend have active configs
   - ✅ Only backend `vercel.json` should be active

5. **app.listen() Always Running**
   - ❌ `app.listen()` in production
   - ✅ Conditional: `if (process.env.NODE_ENV !== 'production')`

## ✅ Success Indicators

After fix, you should see:
- ✅ Deployment succeeds in Vercel dashboard
- ✅ Function `api/index.js` appears in Functions tab
- ✅ `https://your-app.vercel.app/` returns "Backend is running 🚀"
- ✅ `https://your-app.vercel.app/api/user` works (or returns expected error)
- ✅ No NOT_FOUND errors in logs

## 🆘 Still Not Working?

1. **Check Build Logs**
   - Vercel Dashboard → Deployment → Build Logs
   - Look for errors about missing files

2. **Check Function Logs**
   - Vercel Dashboard → Deployment → Functions → api/index.js → Logs
   - Look for runtime errors

3. **Verify Function Exists**
   - Vercel Dashboard → Deployment → Functions
   - Should see `api/index.js` listed
   - If missing → Root directory is wrong

4. **Test Locally First**
   ```bash
   cd srajan/backend
   npm install
   npm run dev
   # Test: http://localhost:5000/
   # Should work locally before deploying
   ```

## 📚 Full Explanation

See `COMPREHENSIVE_NOT_FOUND_FIX.md` for:
- Detailed root cause analysis
- Conceptual understanding
- Warning signs to watch for
- Alternative approaches
- Complete troubleshooting guide

