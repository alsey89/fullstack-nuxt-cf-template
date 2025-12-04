# Google OAuth Setup Guide

Complete guide for setting up and using Google OAuth authentication in this application.

## Overview

This application uses Google OAuth 2.0 as the primary authentication method. Email/password authentication is temporarily disabled until email delivery is implemented.

### Architecture

```
User → /auth/signin
  ↓ (clicks Google button)
Backend → /api/v1/auth/google/authorize
  ↓ (generates state token)
Google → accounts.google.com/o/oauth2/v2/auth
  ↓ (user authorizes)
Google → /api/v1/auth/google/callback?code=...&state=...
  ↓ (verifies, exchanges, creates user)
Backend → Sets session cookie
  ↓ (redirects)
User → / (logged in)
```

## Prerequisites

- Google Cloud Platform account
- Project with OAuth 2.0 configured
- Domain or localhost for redirect URIs

## Quick Start

### 1. Google Cloud Console

1. Go to https://console.cloud.google.com
2. Create OAuth credentials
3. Add redirect URI: `http://localhost:3000/api/v1/auth/google/callback`
4. Copy Client ID and Client Secret

### 2. Environment Variables

```bash
NUXT_OAUTH_GOOGLE_CLIENT_ID=your-client-id
NUXT_OAUTH_GOOGLE_CLIENT_SECRET=your-client-secret
NUXT_OAUTH_GOOGLE_REDIRECT_URI=http://localhost:3000/api/v1/auth/google/callback
```

### 3. Run Migration

```bash
npm run db:migrate:local:staging
```

### 4. Test

```bash
npm run dev
# Visit http://localhost:3000/auth/signin
```

See full documentation in file for detailed setup, troubleshooting, and production deployment.

---

**Last Updated**: 2025-11-12
