# Environment Setup Guide

## Required Environment Variables

Create a `.env` file in the root of your InnerSight project with the following variables:

```env
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

## How to Get Your Supabase Credentials

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings** → **API**
4. Copy the following:
   - **Project URL** → Use as `EXPO_PUBLIC_SUPABASE_URL`
   - **Project API keys** → **anon public** → Use as `EXPO_PUBLIC_SUPABASE_ANON_KEY`

## Example .env file

```env
EXPO_PUBLIC_SUPABASE_URL=https://kzcalwpmskkxgzwwwipz.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6Y2Fsd3Btc2treGd6d3d3aXB6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE2ODk5NzI4MDAsImV4cCI6MjAwNTU0ODgwMH0.example-key
```

## After Setting Up

1. Restart your development server
2. The app should now show the authentication screen properly
3. You can create an account or sign in

## Troubleshooting

- Make sure the `.env` file is in the root directory (same level as `package.json`)
- Restart your Metro bundler after adding environment variables
- Check that your Supabase project is active and not paused 