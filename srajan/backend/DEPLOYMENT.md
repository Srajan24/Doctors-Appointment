# Vercel Deployment Guide

## Environment Variables Required

Make sure to set these environment variables in your Vercel project settings:

- `MONGO_URI` - Your MongoDB connection string
- Any other environment variables your application requires

## Deployment Notes

1. The project uses ES modules (`"type": "module"` in package.json)
2. Database connections are cached for serverless environments
3. The API is structured as a serverless function in the `api/` directory
4. All routes are rewritten to the `/api/index.js` handler

## Deployment Steps

1. Connect your repository to Vercel
2. Set the root directory to `srajan/backend` (if deploying backend separately)
3. Add all required environment variables in Vercel dashboard
4. Deploy!

## Node.js Version

The project requires Node.js 18.x or higher. This is specified in:
- `package.json` engines field
- `vercel.json` runtime configuration (nodejs20.x)


