# OAuth2 Setup Guide for llmsecurity.dev

This guide covers the OAuth2 configuration required for llmsecurity.dev to support:
- After Dark Systems Central Login (already implemented)
- GitHub OAuth2
- Google OAuth2
- Discord OAuth2

## Current Status

### After Dark SSO (Implemented)
The AfterDark client is already implemented in `/internal/auth/afterdark.go`.
- ValidateToken: Working
- GetOAuthURL: Working
- ExchangeCode: Stub (needs completion)
- RefreshToken: Stub (needs completion)

---

## GitHub OAuth2 Setup

### 1. Create GitHub OAuth App

1. Go to: https://github.com/settings/developers
2. Click "New OAuth App"
3. Fill in:
   - **Application name**: LLMSecurity.dev
   - **Homepage URL**: https://llmsecurity.dev
   - **Authorization callback URL**: https://llmsecurity.dev/auth/callback/github

4. After creation, note down:
   - Client ID
   - Client Secret (generate one)

### 2. Environment Variables
```bash
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret
GITHUB_REDIRECT_URI=https://llmsecurity.dev/auth/callback/github
```

### 3. Scopes Required
- `user:email` - Access user email
- `read:user` - Read user profile

---

## Google OAuth2 Setup

### 1. Create Google OAuth Credentials

1. Go to: https://console.cloud.google.com/apis/credentials
2. Create a new project or select existing
3. Click "Create Credentials" > "OAuth client ID"
4. Application type: "Web application"
5. Fill in:
   - **Name**: LLMSecurity.dev
   - **Authorized JavaScript origins**: https://llmsecurity.dev
   - **Authorized redirect URIs**: https://llmsecurity.dev/auth/callback/google

6. Note down:
   - Client ID
   - Client Secret

### 2. Enable APIs
- Enable "Google+ API" or "People API" for user info

### 3. Environment Variables
```bash
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=https://llmsecurity.dev/auth/callback/google
```

### 4. Scopes Required
- `openid`
- `email`
- `profile`

---

## Discord OAuth2 Setup

### 1. Create Discord Application

1. Go to: https://discord.com/developers/applications
2. Click "New Application"
3. Name it: LLMSecurity.dev
4. Go to "OAuth2" section
5. Add redirect:
   - https://llmsecurity.dev/auth/callback/discord

6. Note down:
   - Client ID
   - Client Secret (under OAuth2 > General)

### 2. Environment Variables
```bash
DISCORD_CLIENT_ID=your_client_id
DISCORD_CLIENT_SECRET=your_client_secret
DISCORD_REDIRECT_URI=https://llmsecurity.dev/auth/callback/discord
```

### 3. Scopes Required
- `identify` - Access username, avatar
- `email` - Access email address

---

## Implementation Checklist

### Backend Changes Required

1. **Create OAuth handler file**: `/internal/auth/oauth_providers.go`
   ```go
   // Implement GitHubClient, GoogleClient, DiscordClient
   // Following the same pattern as AfterDarkClient
   ```

2. **Add routes in API gateway**: `/cmd/api-gateway/main.go`
   ```go
   r.Get("/auth/login/{provider}", handleOAuthLogin)
   r.Get("/auth/callback/{provider}", handleOAuthCallback)
   ```

3. **Update configuration**: `/cmd/api-gateway/main.go`
   - Add environment variable loading for each provider

### Database Changes

Add `auth_provider` column to users table if not exists:
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(20) DEFAULT 'afterdark';
ALTER TABLE users ADD COLUMN IF NOT EXISTS external_id VARCHAR(255);
CREATE INDEX IF NOT EXISTS idx_users_external_id ON users(auth_provider, external_id);
```

---

## Testing OAuth Flows

### GitHub
```bash
# Start flow
curl https://llmsecurity.dev/auth/login/github

# After callback, verify token
curl -H "Authorization: Bearer $TOKEN" https://llmsecurity.dev/api/v1/me
```

### Google
```bash
curl https://llmsecurity.dev/auth/login/google
```

### Discord
```bash
curl https://llmsecurity.dev/auth/login/discord
```

---

## Security Considerations

1. **State Parameter**: Always use CSRF protection via state parameter
2. **Token Storage**: Store refresh tokens encrypted
3. **PKCE**: Consider implementing PKCE for enhanced security
4. **Token Expiry**: Implement proper token refresh logic
5. **Rate Limiting**: Add rate limiting to auth endpoints

---

## Quick Reference: OAuth2 Endpoints

| Provider | Authorization URL | Token URL | User Info URL |
|----------|------------------|-----------|---------------|
| GitHub | https://github.com/login/oauth/authorize | https://github.com/login/oauth/access_token | https://api.github.com/user |
| Google | https://accounts.google.com/o/oauth2/v2/auth | https://oauth2.googleapis.com/token | https://www.googleapis.com/oauth2/v2/userinfo |
| Discord | https://discord.com/api/oauth2/authorize | https://discord.com/api/oauth2/token | https://discord.com/api/users/@me |

---

## Next Steps for Developer

1. Create OAuth apps on each platform (GitHub, Google, Discord)
2. Add credentials to `.env` file
3. Implement the OAuth client code (follow AfterDarkClient pattern)
4. Add callback handlers
5. Test each flow
6. Update llmsecurity.dev frontend with login buttons

*Last Updated: 2025-12-24*
