# OAuth Setup Guide

This guide explains how to set up OAuth authentication (Google, GitHub, Discord, etc.) in your application.

## Overview

The template now includes a complete OAuth implementation that:
- Supports Google OAuth (with easy extension for GitHub, Discord, etc.)
- Automatically creates user accounts from OAuth providers
- Auto-links OAuth accounts to existing email addresses
- Handles session management securely
- Includes CSRF protection via state tokens
- Provides comprehensive error handling

## Quick Start

### 1. Run Database Migration

Apply the OAuth migration to add required fields to the users table:

```bash
# Using wrangler for D1 database
wrangler d1 execute YOUR_DATABASE_NAME --local --file=server/database/migrations/0001_add_oauth_fields.sql

# For production
wrangler d1 execute YOUR_DATABASE_NAME --file=server/database/migrations/0001_add_oauth_fields.sql
```

Or regenerate migrations using drizzle-kit:

```bash
npm run db:generate
npm run db:migrate
```

### 2. Set Up Google OAuth

#### Get Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API:
   - Go to "APIs & Services" > "Library"
   - Search for "Google+ API"
   - Click "Enable"
4. Create OAuth 2.0 credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Choose "Web application"
   - Add authorized redirect URIs:
     - `http://localhost:3000/api/auth/google/callback` (for local development)
     - `https://yourdomain.com/api/auth/google/callback` (for production)
   - Click "Create"
   - Copy the Client ID and Client Secret

#### Configure Environment Variables

Add the following to your `.dev.vars` file (for local development):

```bash
# Google OAuth
NUXT_OAUTH_GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
NUXT_OAUTH_GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

For production (Cloudflare Pages/Workers), add these as environment variables in your deployment settings.

### 3. Test OAuth Flow

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to the sign-in page: `http://localhost:3000/auth/signin`

3. Click the Google icon to initiate OAuth flow

4. You should be redirected to Google for authorization

5. After authorizing, you'll be redirected back and logged in

## How It Works

### OAuth Flow

1. **User clicks "Sign in with Google"** → Redirects to `/api/auth/google/authorize`

2. **Authorization Endpoint** (`server/api/auth/google/authorize.get.ts`):
   - Generates CSRF protection state token
   - Redirects to Google OAuth with scopes: `openid`, `email`, `profile`

3. **User authorizes on Google** → Google redirects to callback URL with authorization code

4. **Callback Endpoint** (`server/api/auth/google/callback.get.ts`):
   - Verifies state token (CSRF protection)
   - Exchanges authorization code for access token
   - Fetches user info from Google
   - Finds or creates user account
   - Sets session cookie
   - Redirects to dashboard

### User Account Logic

The `findOrCreateOAuthUser` method in the identity service follows this logic:

1. **Check for existing OAuth user** by provider + provider ID
   - If found: Update login timestamp and redirect to dashboard

2. **Check for existing email**
   - If found AND OAuth email is verified: Auto-link OAuth to existing account
   - If found but email not verified: Throw error
   - If found but linked to different provider: Throw error

3. **Create new OAuth-only user**
   - Empty password hash (OAuth-only account)
   - Mark email as verified if Google verified it
   - Set role to "user"
   - Redirect to dashboard

### Security Features

- **CSRF Protection**: State tokens signed as JWT with 10-minute expiry
- **Session Security**: httpOnly cookies, SameSite=lax, secure in production
- **Email Verification**: Only auto-links accounts if OAuth provider verified the email
- **Provider Isolation**: Prevents linking to accounts already using different OAuth providers

## Database Schema Changes

The following fields were added to the `users` table:

- `oauth_provider` - OAuth provider name ("google", "github", etc.)
- `oauth_provider_id` - Provider's unique user ID
- `picture` - Profile picture URL from OAuth provider
- `last_login_method` - Last authentication method used ("password", "google", etc.)
- `last_login_at` - Timestamp of last login

Indexes:
- Unique index on `(oauth_provider, oauth_provider_id)` pair
- Index for OAuth lookups

## Adding More OAuth Providers

The infrastructure supports multiple OAuth providers. To add GitHub or Discord:

### 1. Add Provider Credentials

In `.dev.vars`:

```bash
# GitHub OAuth
NUXT_OAUTH_GITHUB_CLIENT_ID="your-github-client-id"
NUXT_OAUTH_GITHUB_CLIENT_SECRET="your-github-client-secret"

# Discord OAuth
NUXT_OAUTH_DISCORD_CLIENT_ID="your-discord-client-id"
NUXT_OAUTH_DISCORD_CLIENT_SECRET="your-discord-client-secret"
```

### 2. Create Provider Endpoints

Copy the Google OAuth files and adapt them:

```bash
# Create GitHub OAuth endpoints
cp server/api/auth/google/authorize.get.ts server/api/auth/github/authorize.get.ts
cp server/api/auth/google/callback.get.ts server/api/auth/github/callback.get.ts
```

### 3. Update OAuth Library

Add provider configuration to `server/lib/oauth.ts`:

```typescript
export const GITHUB_OAUTH_CONFIG = {
  authorizationUrl: "https://github.com/login/oauth/authorize",
  tokenUrl: "https://github.com/login/oauth/access_token",
  userInfoUrl: "https://api.github.com/user",
  scopes: ["read:user", "user:email"],
};
```

### 4. Update UI

Add provider button to sign-in page (`app/pages/auth/signin.vue`):

```vue
<button @click="onGithubSignin" class="hover:cursor-pointer">
  <Icon name="mdi:github" class="w-8 h-8 md:w-16 md:h-16" />
</button>
```

## Error Handling

OAuth errors redirect to `/auth/error` with error codes:

- `oauth_failed` - User denied authorization or provider error
- `state_mismatch` - CSRF validation failed (expired or tampered state token)
- `invalid_callback` - Missing code or state parameters
- `exchange_failed` - Failed to exchange code for access token
- `userinfo_failed` - Failed to fetch user info from provider
- `user_creation_failed` - Account creation/linking failed (e.g., email conflict)
- `unknown` - Unexpected error

Users can retry from the error page or contact support.

## Troubleshooting

### "OAuth is not configured" Error

**Cause**: Missing OAuth credentials in environment variables

**Solution**: Ensure `NUXT_OAUTH_GOOGLE_CLIENT_ID` and `NUXT_OAUTH_GOOGLE_CLIENT_SECRET` are set in `.dev.vars` (local) or deployment environment variables (production)

### "redirect_uri_mismatch" Error from Google

**Cause**: The callback URL in your Google Cloud Console doesn't match the actual callback URL

**Solution**:
1. Check the error message for the actual redirect URI being used
2. Add that exact URI to "Authorized redirect URIs" in Google Cloud Console
3. Common URIs:
   - Local: `http://localhost:3000/api/auth/google/callback`
   - Production: `https://yourdomain.com/api/auth/google/callback`

### "state_mismatch" Error

**Cause**: State token expired (>10 minutes) or JWT secret changed

**Solution**:
- Try signing in again (tokens expire after 10 minutes)
- Ensure `NUXT_JWT_SECRET` is consistent and not changing between requests

### "Cannot link accounts: Email not verified by OAuth provider"

**Cause**: Google account email is not verified

**Solution**: User must verify their email with Google first, then try signing in again

### User Created But Can't Access Dashboard

**Cause**: Permissions/roles not properly configured

**Solution**: Check that the user was created with `role: "user"` and `isActive: true`

## Production Checklist

Before deploying OAuth to production:

- [ ] Set `NUXT_SESSION_PASSWORD` to a secure random string (min 32 chars)
- [ ] Set `NUXT_JWT_SECRET` to a secure random string (min 32 chars)
- [ ] Add production redirect URI to Google Cloud Console
- [ ] Set OAuth credentials as environment variables in deployment platform
- [ ] Test OAuth flow in staging environment first
- [ ] Ensure `secure` cookie flag is enabled in production (automatic if `NODE_ENV=production`)
- [ ] Run database migrations on production database
- [ ] Set up error monitoring/logging for OAuth endpoints

## Files Modified/Created

### Created:
- `server/lib/oauth.ts` - OAuth utility functions
- `server/api/auth/google/authorize.get.ts` - Authorization endpoint
- `server/api/auth/google/callback.get.ts` - Callback endpoint
- `app/pages/auth/error.vue` - OAuth error page
- `server/database/migrations/0001_add_oauth_fields.sql` - Database migration
- `docs/OAUTH_SETUP.md` - This file

### Modified:
- `server/database/schema/identity.ts` - Added OAuth fields to users table
- `server/repositories/identity.ts` - Added `findByOAuth` method
- `server/services/identity.ts` - Added `findOrCreateOAuthUser` method
- `app/pages/auth/signin.vue` - Added Google OAuth button handler
- `nuxt.config.ts` - Added OAuth configuration section
- `.dev.vars.example` - Already had OAuth placeholders (no changes needed)

## Support

For issues or questions:
- Check the error page for specific error codes and messages
- Review server logs for detailed error information
- Refer to Google OAuth documentation: https://developers.google.com/identity/protocols/oauth2
- Check nuxt-auth-utils documentation: https://github.com/atinux/nuxt-auth-utils
