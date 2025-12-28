# Project Not Running - Complete Troubleshooting Guide

## 🚨 Quick Diagnosis

First, determine **where** it's not running:
- ❌ **Local development** (localhost)?
- ❌ **Vercel deployment** (production)?
- ❌ **Both**?

---

## 🔍 Step 1: Test Locally First

**Before fixing Vercel, ensure it works locally!**

### Test Local Server

```bash
cd srajan/backend
npm install
npm run dev
```

**Expected Result:**
```
🚀 Server running on port 5000
✅ MongoDB Connected
```

**If it fails locally, fix that first before deploying.**

### Common Local Issues

#### Issue 1: Missing Dependencies
```bash
# Fix: Install dependencies
cd srajan/backend
npm install
```

#### Issue 2: Missing Environment Variables
Create `.env` file in `srajan/backend/`:
```env
MONGO_URI=your_mongodb_connection_string
NODE_ENV=development
PORT=5000
```

#### Issue 3: Database Connection Error
- Check MongoDB connection string format
- Verify MongoDB cluster allows connections from your IP
- Test connection string in MongoDB Compass

#### Issue 4: Port Already in Use
```bash
# Windows: Find process using port 5000
netstat -ano | findstr :5000
# Kill the process (replace PID with actual process ID)
taskkill /PID <PID> /F

# Mac/Linux: Find and kill process
lsof -ti:5000 | xargs kill -9
```

---

## 🚀 Step 2: Check Vercel Deployment

### 2.1 Verify Deployment Status

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Check **Deployments** tab
4. Look at the **latest deployment**

**What to Check:**
- ✅ **Status**: Should be "Ready" (green)
- ❌ **Status**: "Error" or "Failed" → Check build logs
- ⏳ **Status**: "Building" → Wait for it to complete

### 2.2 Check Build Logs

If deployment failed:

1. Click on the failed deployment
2. Go to **Build Logs** tab
3. Look for error messages

**Common Build Errors:**

#### Error: "Module not found"
```
Error: Cannot find module 'express'
```
**Fix:**
- Check `package.json` has all dependencies
- Verify `npm install` ran successfully
- Ensure `node_modules` is not in `.gitignore` (it shouldn't be, Vercel installs it)

#### Error: "Cannot find file"
```
Error: Cannot find module './api/index.js'
```
**Fix:**
- Verify `api/index.js` exists in `srajan/backend/api/index.js`
- Check Vercel **Root Directory** is set to `srajan/backend`

#### Error: "Build command failed"
**Fix:**
- Check if you have a `build` script in `package.json` that's failing
- Remove or fix the build script (not needed for Express on Vercel)

### 2.3 Check Function Logs

1. Go to deployment → **Functions** tab
2. Click on `api/index.js`
3. Check **Logs** tab
4. Try making a request and watch for errors

**Common Runtime Errors:**

#### Error: "Database connection failed"
```
❌ Database connection failed: MongoServerError: ...
```
**Fix:**
- Verify `MONGO_URI` is set in Vercel **Environment Variables**
- Check MongoDB connection string is correct
- Ensure MongoDB IP whitelist includes Vercel IPs (or use 0.0.0.0/0 for all)

#### Error: "Environment variable not found"
```
Error: MONGO_URI is not defined
```
**Fix:**
- Go to Vercel **Settings** → **Environment Variables**
- Add `MONGO_URI` with your MongoDB connection string
- Ensure it's set for **Production** environment
- Redeploy after adding variables

#### Error: "Function timeout"
```
Error: Function execution timed out
```
**Fix:**
- Check `vercel.json` has `maxDuration` set (you have 30 seconds)
- Optimize slow database queries
- Check for infinite loops or blocking operations

---

## ✅ Step 3: Verify Vercel Configuration

### 3.1 Check Root Directory

**CRITICAL - Most Common Issue**

1. Vercel Dashboard → **Settings** → **General**
2. Find **Root Directory**
3. **Must be:** `srajan/backend`
4. **NOT:** (empty) or repository root

**If wrong:**
- Change to `srajan/backend`
- Click **Save**
- Trigger a new deployment

### 3.2 Check Build Settings

**Settings** → **General** → **Build & Development Settings**

| Setting | Should Be |
|---------|-----------|
| **Framework Preset** | `Other` (or leave auto) |
| **Root Directory** | `srajan/backend` |
| **Build Command** | (empty) OR `npm install` |
| **Output Directory** | **(EMPTY - leave blank)** |
| **Install Command** | (empty) OR `npm install` |

### 3.3 Verify Environment Variables

**Settings** → **Environment Variables**

**Required:**
- ✅ `MONGO_URI` (your MongoDB connection string)
- ✅ Check spelling: `MONGO_URI` not `MONGODB_URI`
- ✅ Set for **Production** environment
- ✅ Value is correct (starts with `mongodb://` or `mongodb+srv://`)

**Optional but recommended:**
- `NODE_ENV=production`

**After adding/changing variables:**
- **Redeploy** the project (variables are injected at build time)

---

## 🔧 Step 4: Verify File Structure

Your backend should have this structure:

```
srajan/backend/
  ├── api/
  │   └── index.js          ✅ Must exist and export app
  ├── index.js              ✅ Your Express app
  ├── vercel.json           ✅ Vercel configuration
  ├── package.json          ✅ Dependencies
  └── config/
      └── db-config.js      ✅ Database connection
```

### Check api/index.js

```bash
cd srajan/backend
cat api/index.js
```

**Should show:**
```javascript
import app from '../index.js';
export default app;
```

### Check vercel.json

```bash
cat vercel.json
```

**Should have:**
- `builds` section with `api/index.js`
- `routes` section routing to `/api/index.js`
- `functions` section with `maxDuration`

---

## 🧪 Step 5: Test Endpoints

### Test Root Endpoint

```bash
# Replace with your actual Vercel URL
curl https://your-project.vercel.app/
```

**Expected Response:**
```
Backend is running 🚀
```

**If NOT_FOUND (404):**
- Root directory is wrong
- Function handler not found
- Routing configuration incorrect

**If Error (500):**
- Check function logs in Vercel dashboard
- Likely database connection or runtime error

### Test API Endpoint

```bash
curl https://your-project.vercel.app/api/user
```

**Expected:**
- Either data (if endpoint works)
- Or error response (not 404)

**If 404:**
- Route not configured correctly
- Function not handling routes

---

## 🐛 Common Issues & Fixes

### Issue 1: "NOT_FOUND" Error

**Symptoms:**
- All requests return 404
- Deployment succeeds but nothing works

**Causes & Fixes:**

1. **Wrong Root Directory**
   - Fix: Set to `srajan/backend` in Vercel settings

2. **Missing api/index.js**
   - Fix: Ensure file exists at `srajan/backend/api/index.js`

3. **Wrong export in api/index.js**
   - Fix: Must be `export default app;` not a function wrapper

4. **Conflicting vercel.json files**
   - Fix: Only keep `srajan/backend/vercel.json`
   - Delete or neutralize root-level `vercel.json`

### Issue 2: "Function Error" or 500 Error

**Symptoms:**
- Requests return 500 Internal Server Error
- Function logs show errors

**Causes & Fixes:**

1. **Missing MONGO_URI**
   - Fix: Add `MONGO_URI` to Vercel environment variables

2. **Database Connection Failed**
   - Fix: Check MongoDB connection string
   - Verify MongoDB IP whitelist includes Vercel
   - Check connection string format

3. **Module Import Error**
   - Fix: Ensure all dependencies in `package.json`
   - Check import paths are correct

4. **Syntax Error in Code**
   - Fix: Test locally first, fix syntax errors
   - Check function logs for specific error

### Issue 3: "Build Failed"

**Symptoms:**
- Deployment fails during build phase
- Build logs show errors

**Causes & Fixes:**

1. **Missing package.json**
   - Fix: Ensure `package.json` exists in `srajan/backend/`

2. **Invalid package.json**
   - Fix: Check JSON syntax is valid
   - Verify `engines.node` is set (>=18.x)

3. **Build Script Failing**
   - Fix: Remove or fix `build` script (not needed for Express)
   - Or set Build Command to empty in Vercel settings

4. **Node Version Mismatch**
   - Fix: Ensure `package.json` has `"engines": { "node": ">=18.x" }`
   - Vercel will use Node 18+ automatically

### Issue 4: "Timeout" Error

**Symptoms:**
- Requests take too long and timeout
- Function logs show timeout errors

**Causes & Fixes:**

1. **Slow Database Queries**
   - Fix: Optimize queries, add indexes
   - Check for N+1 query problems

2. **maxDuration Too Low**
   - Fix: Increase in `vercel.json`:
     ```json
     "functions": {
       "api/index.js": {
         "maxDuration": 60  // Increase from 30 to 60 seconds
       }
     }
     ```
   - Note: Free tier max is 10 seconds, Pro tier up to 60 seconds

3. **Infinite Loop or Blocking Operation**
   - Fix: Check for synchronous operations
   - Use async/await properly
   - Avoid blocking the event loop

---

## 📋 Quick Diagnostic Checklist

Run through this checklist:

### Local Testing
- [ ] `cd srajan/backend && npm install` succeeds
- [ ] `.env` file exists with `MONGO_URI`
- [ ] `npm run dev` starts server successfully
- [ ] `http://localhost:5000/` returns "Backend is running 🚀"
- [ ] Database connects successfully

### Vercel Configuration
- [ ] Root Directory set to `srajan/backend`
- [ ] Output Directory is **EMPTY**
- [ ] `MONGO_URI` environment variable set
- [ ] Latest deployment status is "Ready" (green)

### File Structure
- [ ] `srajan/backend/api/index.js` exists
- [ ] `api/index.js` exports: `export default app;`
- [ ] `srajan/backend/vercel.json` exists and is correct
- [ ] `srajan/backend/index.js` exports: `export default app;`

### Testing
- [ ] `https://your-app.vercel.app/` returns response (not 404)
- [ ] Function logs show no errors
- [ ] Database connection successful in logs

---

## 🆘 Still Not Working?

If you've checked everything above and it's still not working:

### 1. Check Deployment Logs
- Go to Vercel Dashboard → Latest Deployment → Build Logs
- Copy the full error message
- Look for specific file paths or error codes

### 2. Check Function Logs
- Go to Deployment → Functions → `api/index.js` → Logs
- Make a test request and watch for errors
- Check for database connection errors

### 3. Test Function Directly
- Vercel Dashboard → Functions → `api/index.js` → Invoke
- See if function executes without errors

### 4. Verify Project Type
- Make sure Vercel project is set as a **Serverless Function** project
- Not a Static Site or other type

### 5. Try Manual Deployment
```bash
cd srajan/backend
vercel --prod
```
This shows detailed output and errors in your terminal.

### 6. Check for Conflicting Files
- Ensure no conflicting `vercel.json` at root level
- Ensure no conflicting `api/` directory at root level
- Only `srajan/backend/vercel.json` should be active

---

## 🎯 Most Likely Issues (By Priority)

Based on common problems, check in this order:

1. **Wrong Root Directory** (90% of issues)
   - Set to `srajan/backend` in Vercel settings

2. **Missing MONGO_URI** (80% of runtime errors)
   - Add to Vercel environment variables

3. **Output Directory Set** (60% of build issues)
   - Must be EMPTY for serverless functions

4. **Missing api/index.js** (50% of NOT_FOUND errors)
   - Ensure file exists and exports correctly

5. **Database Connection Issues** (40% of 500 errors)
   - Check connection string and IP whitelist

---

## 📞 Need More Help?

If you're still stuck, gather this information:

1. **Error Message**: Exact error from Vercel logs
2. **Deployment Status**: Success/Failed from dashboard
3. **Root Directory**: What it's currently set to
4. **Environment Variables**: List of variables set
5. **Local Test**: Does it work locally? (`npm run dev`)
6. **Function Logs**: Error messages from function logs

With this information, we can diagnose the specific issue more accurately.

---

*Last updated: Based on current codebase structure*

