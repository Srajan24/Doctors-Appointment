# How to Check Root Directory in Vercel + What Happens When You Override It

## 📍 How to Check Root Directory in Vercel Dashboard

### Step-by-Step Instructions

1. **Go to Vercel Dashboard**
   - Visit: https://vercel.com/dashboard
   - Sign in if needed

2. **Select Your Project**
   - Find your project in the list (should be "doctors-appointment" or similar)
   - Click on the project name

3. **Go to Settings**
   - Click on the **"Settings"** tab at the top of the project page
   - It's usually next to "Deployments", "Analytics", etc.

4. **Go to General Tab**
   - In the Settings page, click on **"General"** in the left sidebar
   - This is usually the first option

5. **Find Root Directory**
   - Scroll down the page
   - Look for a section labeled **"Root Directory"**
   - It's usually in the "Project" section

6. **Check Current Value**
   - You'll see a field/input box
   - It might show:
     - **Empty/Blank** (nothing written)
     - A path like `srajan/backend`
     - Or just `/` (repository root)

### Visual Guide (What You'll See)

```
Vercel Dashboard → Your Project → Settings → General

┌─────────────────────────────────────┐
│  Project                            │
│                                     │
│  Project Name: doctors-appointment  │
│  Framework Preset: Other            │
│  Root Directory: [__________]       │ ← THIS FIELD
│                    ↑                │
│         Check what's written here   │
│                                     │
│  Build & Development Settings       │
│  ...                                │
└─────────────────────────────────────┘
```

---

## ✅ What Should Root Directory Be Set To?

**For your project, it should be:**
```
srajan/backend
```

**NOT:**
- ❌ Empty/Blank
- ❌ `/`
- ❌ `./`
- ❌ `srajan`
- ❌ Just `backend`

---

## 🔧 How to Override/Set Root Directory

### If Root Directory is Wrong or Empty:

1. **Click on the Root Directory field**
   - It should become editable (you can type in it)

2. **Clear any existing value**
   - Delete whatever is there

3. **Type the correct path:**
   ```
   srajan/backend
   ```
   - No leading slash `/`
   - No trailing slash `/`
   - Case-sensitive (lowercase `srajan` and `backend`)

4. **Click "Save"**
   - Usually at the bottom of the page
   - Or the save button might appear when you change the value

5. **Wait for confirmation**
   - You might see a "Saved" message
   - The page should refresh or show a success indicator

6. **Redeploy**
   - After changing Root Directory, you MUST redeploy
   - Go to **Deployments** tab
   - Click **"..."** (three dots) on the latest deployment
   - Click **"Redeploy"**
   - Or push a new commit to trigger auto-deploy

---

## 🤔 What Happens When You Override Root Directory?

### ✅ Correct Setting: `srajan/backend`

**What happens:**
1. Vercel treats `srajan/backend/` as the project root
2. Looks for `api/index.js` at `srajan/backend/api/index.js`
3. Reads `vercel.json` from `srajan/backend/vercel.json`
4. Reads `package.json` from `srajan/backend/package.json`
5. Builds the function correctly
6. Function appears in Functions tab
7. Routes work correctly → ✅ NO 404 ERRORS

**Visual representation:**
```
Repository Root:
├── srajan/
│   ├── backend/          ← Vercel treats this as root
│   │   ├── api/
│   │   │   └── index.js  ← Vercel finds this ✅
│   │   ├── vercel.json   ← Vercel uses this ✅
│   │   └── package.json  ← Vercel uses this ✅
│   └── frontend/
└── api/
    └── server.js         ← Vercel ignores this (not in root)
```

---

### ❌ Wrong Setting: Empty or Repository Root

**What happens:**
1. Vercel treats repository root as project root
2. Looks for `api/index.js` at repository root (`api/index.js`)
3. Doesn't find it (because it's at `srajan/backend/api/index.js`)
4. Or finds wrong file (`api/server.js` at root)
5. Function doesn't build correctly
6. Function doesn't appear in Functions tab
7. All routes return 404 → ❌ 404 ERRORS

**Visual representation:**
```
Repository Root:          ← Vercel treats this as root
├── api/
│   └── server.js        ← Vercel might find this (wrong file) ❌
├── srajan/
│   ├── backend/
│   │   ├── api/
│   │   │   └── index.js ← Vercel doesn't look here ❌
│   │   ├── vercel.json  ← Vercel doesn't use this ❌
│   │   └── package.json ← Vercel doesn't use this ❌
│   └── frontend/
└── vercel.json          ← Wrong config file (if exists) ❌
```

**Result:**
- ❌ 404 errors on all routes
- ❌ Function not found
- ❌ Deployment "succeeds" but nothing works

---

### ⚠️ Wrong Setting: `srajan` (without `/backend`)

**What happens:**
1. Vercel treats `srajan/` as root
2. Looks for `api/index.js` at `srajan/api/index.js`
3. Doesn't find it (it's at `srajan/backend/api/index.js`)
4. Function doesn't build
5. 404 errors → ❌

**Visual representation:**
```
Repository Root:
└── srajan/              ← Vercel treats this as root ❌
    ├── backend/
    │   ├── api/
    │   │   └── index.js ← Still in wrong location relative to root
    │   └── vercel.json
    └── frontend/
```

---

## 📊 Comparison Table

| Root Directory Setting | Vercel Looks For | Finds File? | Result |
|----------------------|------------------|-------------|--------|
| `srajan/backend` ✅ | `srajan/backend/api/index.js` | ✅ YES | ✅ Works |
| Empty/Blank ❌ | `api/index.js` (repo root) | ❌ NO | ❌ 404 Error |
| `/` ❌ | `api/index.js` (repo root) | ❌ NO | ❌ 404 Error |
| `srajan` ❌ | `srajan/api/index.js` | ❌ NO | ❌ 404 Error |
| `backend` ❌ | `backend/api/index.js` | ❌ NO | ❌ 404 Error |

---

## 🔍 How to Verify Root Directory is Correct

### Method 1: Check Deployment Build Logs

1. Go to **Deployments** → Latest deployment
2. Click **Build Logs**
3. Look for these messages:

**✅ CORRECT (Root Directory = `srajan/backend`):**
```
Installing dependencies...
Building functions...
Building api/index.js...
Function api/index.js built successfully
```

**❌ WRONG (Root Directory = empty or wrong):**
```
No functions found
Cannot find module 'api/index.js'
Build failed
```

### Method 2: Check Functions Tab

1. Go to **Deployments** → Latest deployment
2. Click **Functions** tab
3. Look for `api/index.js` in the list

**✅ CORRECT:**
- You see `api/index.js` in the list
- Status shows as ready/active

**❌ WRONG:**
- Functions tab is empty
- Or shows different functions
- Or shows errors

### Method 3: Test the Deployment

1. After deployment completes
2. Visit: `https://your-project.vercel.app/`
3. Should return: `Backend is running 🚀`

**✅ CORRECT:**
- Returns response (not 404)

**❌ WRONG:**
- Returns 404 error
- Page not found

---

## ⚡ Quick Action Steps

### To Fix Your 404 Error Right Now:

1. **Check Root Directory:**
   ```
   Dashboard → Project → Settings → General → Root Directory
   ```

2. **If it's NOT `srajan/backend`:**
   - Click the field
   - Type: `srajan/backend`
   - Click Save

3. **Redeploy:**
   - Go to Deployments tab
   - Click "..." on latest deployment
   - Click "Redeploy"

4. **Verify:**
   - Check Functions tab → Should see `api/index.js`
   - Test URL → Should work (no 404)

---

## 🎯 Summary

**To Check Root Directory:**
1. Vercel Dashboard → Your Project → Settings → General
2. Look for "Root Directory" field
3. See what value is written (or if it's empty)

**What to Set It To:**
- ✅ `srajan/backend`

**What Happens When You Set It:**
- ✅ Correct (`srajan/backend`): Function builds, routes work, no 404
- ❌ Wrong (empty/wrong path): Function doesn't build, 404 errors everywhere

**After Changing:**
- Must redeploy for changes to take effect

---

*Check your Root Directory now - it's almost certainly the cause of your 404 errors!*

