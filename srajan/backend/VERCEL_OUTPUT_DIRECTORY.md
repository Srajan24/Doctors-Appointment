# Vercel Output Directory Setting for Express Serverless Functions

## ⚠️ IMPORTANT: Output Directory Should Be EMPTY

For Express serverless functions on Vercel, **you should NOT set an output directory**.

## What to Enter in Vercel Dashboard

### Output Directory Setting
**Enter:** (Leave it **EMPTY** / **BLANK**)

Do NOT enter:
- ❌ `dist`
- ❌ `build`
- ❌ `public`
- ❌ `out`
- ❌ Any directory name

**Why?** Serverless functions are executed directly, not served as static files. Vercel runs your function code directly from your source files.

---

## Complete Vercel Project Settings

### 1. Root Directory
**Enter:** `srajan/backend`

This tells Vercel where your backend code lives.

---

### 2. Framework Preset
**Enter:** `Other` (or leave as auto-detected)

Vercel might not auto-detect Express, so select "Other".

---

### 3. Build Command
**Enter:** (Leave **EMPTY** or use `npm install`)

Vercel will automatically:
- Run `npm install` to install dependencies
- Build your serverless function using `@vercel/node` (as specified in `vercel.json`)

You can also explicitly set it to:
```
npm install
```

---

### 4. Output Directory
**Enter:** (Leave **EMPTY** / **BLANK**)

**This is the critical setting!** For serverless functions, this must be empty.

---

### 5. Install Command
**Enter:** (Leave **EMPTY** or use `npm install`)

Vercel will automatically run `npm install` based on your `package.json`.

---

### 6. Development Command
**Enter:** `npm run dev` (optional, for local development)

This is only used if you run `vercel dev` locally.

---

## Why Output Directory is Empty for Serverless Functions

### Static Sites vs Serverless Functions

**Static Sites (Need Output Directory):**
```
Build Process:
  Source Files → Build Command → Output Directory (dist/build)
                          ↓
                    Static Files (HTML, CSS, JS)
                          ↓
                    Vercel Serves Files
```

**Serverless Functions (No Output Directory):**
```
Deployment:
  Source Files → Install Dependencies → Package Function
                          ↓
                    Function Code (Executed on-demand)
                          ↓
                    Vercel Invokes Function
```

### Your Express App Architecture

```
srajan/backend/
  ├── api/
  │   └── index.js          ← Serverless function handler
  ├── index.js              ← Express app (imported by handler)
  ├── vercel.json           ← Tells Vercel: "Build api/index.js as function"
  └── package.json          ← Dependencies
```

When a request comes in:
1. Vercel reads `vercel.json`
2. Routes to `api/index.js` (the function handler)
3. Executes the function (which loads your Express app)
4. Returns the response

**No static files are served**, so no output directory is needed.

---

## Common Mistakes

### ❌ Mistake 1: Setting Output Directory to `dist` or `build`
**Why it's wrong:**
- Your Express app doesn't produce static files
- Vercel will look for static files in that directory
- Won't find any → NOT_FOUND error
- Functions won't be recognized

### ❌ Mistake 2: Setting Output Directory to `api`
**Why it's wrong:**
- `api/` contains source code, not build output
- Vercel expects compiled/static files here
- Won't work as a serverless function

### ❌ Mistake 3: Setting Output Directory to Root
**Why it's wrong:**
- Same issues as above
- Vercel will treat it as a static site, not serverless functions

---

## When You WOULD Use Output Directory

Output Directory is only needed for:

### 1. Static Site Generators
- Next.js (static export)
- Gatsby
- Nuxt.js (static)
- SvelteKit (static)

These generate HTML/CSS/JS files that need to be served.

### 2. Frontend Builds
If you had a frontend that builds to `dist/`:
```
Frontend Build:
  src/ → npm run build → dist/ (HTML, CSS, JS files)
                          ↓
                    Output Directory: dist
```

### 3. Your Frontend (If Deployed Separately)
Your frontend at `srajan/frontend/` might use:
- Output Directory: `dist` or `build` (if it's a static build)

But your **backend** (serverless functions) should **NOT** have an output directory.

---

## Step-by-Step: Setting Vercel Project Settings

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your backend project
3. Go to **Settings** → **General**
4. Scroll to **Build & Development Settings**

5. Configure each field:

   | Setting | What to Enter |
   |---------|---------------|
   | **Root Directory** | `srajan/backend` |
   | **Framework Preset** | `Other` |
   | **Build Command** | (empty) OR `npm install` |
   | **Output Directory** | **(EMPTY - leave blank)** |
   | **Install Command** | (empty) OR `npm install` |
   | **Development Command** | `npm run dev` (optional) |

6. Click **Save**
7. Redeploy your project

---

## Verification

After setting Output Directory to empty:

1. **Check Deployment Logs**
   - Should see: "Building functions"
   - Should see: "Function api/index.js built"
   - Should NOT see: "Serving static files from [directory]"

2. **Check Functions Tab**
   - Go to Deployment → Functions
   - Should see `api/index.js` listed as a function
   - Should NOT see it looking for static files

3. **Test Endpoint**
   - `https://your-app.vercel.app/`
   - Should return: "Backend is running 🚀"
   - Should NOT return: NOT_FOUND

---

## Your Current Configuration

Based on your `vercel.json`:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "api/index.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/api/index.js"
    }
  ],
  "functions": {
    "api/index.js": {
      "maxDuration": 30
    }
  }
}
```

This tells Vercel:
- ✅ Build `api/index.js` as a serverless function
- ✅ Route all requests to that function
- ✅ No output directory needed (functions are executed, not served)

**Therefore, Output Directory must be EMPTY.**

---

## Summary

| Question | Answer |
|----------|--------|
| **What to enter in Output Directory?** | **(EMPTY - leave blank)** |
| **Why?** | Serverless functions execute code, don't serve static files |
| **What happens if I set a directory?** | Vercel looks for static files, doesn't find them → NOT_FOUND |
| **When would I need Output Directory?** | Only for static sites (not serverless functions) |

---

## Quick Reference

```
✅ CORRECT Settings:
   Root Directory: srajan/backend
   Output Directory: (EMPTY)
   Build Command: (EMPTY or npm install)

❌ WRONG Settings:
   Output Directory: dist
   Output Directory: build
   Output Directory: api
   Output Directory: . (current directory)
```

---

*If Vercel is asking for an Output Directory and you can't leave it empty, that might indicate the project is misconfigured as a static site. Ensure you're deploying serverless functions, not a static site.*

