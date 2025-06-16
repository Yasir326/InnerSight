# Kinde + Supabase Integration Setup Guide

This guide will help you set up Kinde authentication with Supabase database for your InnerSight journal app.

## Prerequisites

1. Node.js 20+ installed
2. Expo CLI installed
3. A Kinde account
4. A Supabase account

## 1. Kinde Setup

### Create a Kinde Application

1. Go to [Kinde](https://kinde.com) and create an account
2. Create a new application
3. Choose "React Native" as the application type
4. Note down your:
   - Domain (e.g., `https://your-domain.kinde.com`)
   - Client ID
   - Redirect URI (e.g., `innersight://kinde_callback`)
   - Logout Redirect URI (e.g., `innersight://`)

### Configure Kinde Settings

1. In your Kinde dashboard, go to Settings > Applications
2. Add your redirect URIs
3. Enable the authentication methods you want (email, social, etc.)

## 2. Supabase Setup

### Create a Supabase Project

1. Go to [Supabase](https://supabase.com) and create an account
2. Create a new project
3. Note down your:
   - Project URL
   - Anon/Public key

### Set Up Database Schema

Run the SQL commands from `supabase-schema.sql` in your Supabase SQL editor:

```sql
-- The schema includes:
-- - profiles table for user data
-- - journal_entries table for journal entries
-- - onboarding_data table for user onboarding info
-- - Row Level Security policies
-- - Triggers for updated_at timestamps
```

## 3. Environment Variables

Create a `.env` file in your project root with:

```env
# Kinde Authentication
EXPO_PUBLIC_KINDE_DOMAIN=https://your-domain.kinde.com
EXPO_PUBLIC_KINDE_CLIENT_ID=your_client_id
EXPO_PUBLIC_KINDE_REDIRECT_URI=innersight://kinde_callback
EXPO_PUBLIC_KINDE_LOGOUT_REDIRECT_URI=innersight://

# Supabase Database
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# OpenAI API (for AI features)
EXPO_PUBLIC_OPENAI_API_KEY=your_openai_api_key
```

## 4. Install Dependencies

```bash
npm install @kinde-oss/react-native-sdk-0-7x @supabase/supabase-js
```

## 5. App Configuration

### Update app.json/app.config.js

Add the URL scheme for Kinde redirects:

```json
{
  "expo": {
    "scheme": "innersight",
    "platforms": ["ios", "android", "web"]
  }
}
```

### iOS Configuration (if targeting iOS)

Add URL scheme to `ios/InnerSight/Info.plist`:

```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLName</key>
    <string>innersight</string>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>innersight</string>
    </array>
  </dict>
</array>
```

## 6. Updated Architecture

### Authentication Flow
1. User clicks "Sign In" or "Sign Up"
2. Kinde handles authentication (email, social, etc.)
3. User is redirected back to app with tokens
4. App creates/updates user profile in Supabase

### Data Storage
- **Authentication**: Handled by Kinde
- **User Data**: Stored in Supabase with RLS policies
- **Journal Entries**: Stored in Supabase, tied to Kinde user ID
- **Onboarding Data**: Stored in Supabase

### Key Files Updated
- `src/lib/kinde.ts` - Kinde client configuration
- `src/lib/supabase.ts` - Supabase client with Kinde integration
- `src/components/Auth.tsx` - New authentication UI
- `src/services/storage.ts` - Updated to use Supabase
- `src/services/journalEntries.ts` - Updated to use Supabase
- `src/services/ai.ts` - Updated to work with new data layer

## 7. Benefits of This Architecture

### Security
- Professional authentication with Kinde
- Row Level Security in Supabase
- No sensitive data stored locally

### Scalability
- Cloud-based data storage
- Multi-device sync
- Professional user management

### User Experience
- Single sign-on capabilities
- Social authentication options
- Seamless cross-device experience

## 8. Next Steps

1. Set up your Kinde and Supabase accounts
2. Configure environment variables
3. Run the database schema
4. Test authentication flow
5. Update any remaining screens to use the new services

## Troubleshooting

### Common Issues

1. **Redirect URI not working**: Make sure the scheme matches in Kinde, app.json, and platform configs
2. **Supabase RLS errors**: Ensure policies are set up correctly
3. **Environment variables not loading**: Check that EXPO_PUBLIC_ prefix is used for client-side variables

### Testing

1. Test authentication flow
2. Verify data is saving to Supabase
3. Check that RLS policies work correctly
4. Test on both iOS and Android if targeting both platforms 