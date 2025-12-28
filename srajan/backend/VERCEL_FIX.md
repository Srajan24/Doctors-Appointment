# Vercel NOT_FOUND Error - Root Cause & Fix

## Root Cause Analysis

### What Was Happening
The NOT_FOUND (404) error occurs when Vercel cannot locate or properly execute the serverless function handler. This happened because:

1. **Missing Serverless Function Structure**: Express apps on Vercel need to be wrapped in a serverless function handler located in the `api/` directory
2. **Incorrect Vercel Configuration**: The `vercel.json` needed proper build and route configuration
3. **Database Connection Issues**: Serverless functions require connection caching to avoid creating new DB connections on every request

### Why This Error Exists
Vercel uses serverless functions - each API endpoint runs as an independent function. Unlike traditional servers where Express runs continuously, Vercel spins up functions on-demand. The Express app must be structured to work within this serverless architecture.

## The Fix

### 1. Created `api/index.js` Serverless Handler
This file imports your Express app and exports it as a serverless function handler.

### 2. Updated `vercel.json` Configuration
- Added proper `builds` section to tell Vercel to build the function using `@vercel/node`
- Added `routes` section to route all requests to the serverless function

### 3. Fixed Database Connection
Updated `db-config.js` to cache MongoDB connections, which is essential for serverless environments where functions can be cold-started frequently.

## Deployment Checklist

1. ✅ **Environment Variables**: Set `MONGO_URI` in Vercel project settings
2. ✅ **Root Directory**: Set Vercel project root to `srajan/backend` 
3. ✅ **Node.js Version**: Specified in `package.json` (>=18.x)
4. ✅ **Function Handler**: `api/index.js` exists and exports the Express app
5. ✅ **Vercel Config**: `vercel.json` properly configured

## How It Works Now

```
Request → Vercel → vercel.json routes → api/index.js → Express app → Routes
```

All incoming requests are routed to `/api/index.js`, which loads your Express app. The Express app then handles routing to `/api/user`, `/api/doctor`, etc.

## Warning Signs to Watch For

1. **Missing `api/` directory**: Vercel expects serverless functions in `api/`
2. **Wrong export format**: Must export the Express app, not a wrapper function
3. **No connection caching**: Database connections should be cached for serverless
4. **Missing `vercel.json`**: Required for custom routing configuration
5. **Wrong root directory**: Vercel project must point to the backend folder

## Alternative Approaches

1. **Separate API Functions**: Instead of one Express app, you could create individual serverless functions for each route (more complex but more scalable)
2. **Vercel Serverless Functions**: Use Vercel's native serverless function format (would require rewriting routes)
3. **Keep Express Structure**: Current approach (recommended for existing Express apps)

The current fix maintains your existing Express structure while making it compatible with Vercel's serverless architecture.


