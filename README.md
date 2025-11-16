# WipTracker

NOTE: This repository has been converted to use Google Single Sign-On (SSO) exclusively.

Older OTP-based signup/login endpoints and Redis-backed OTP storage have been deprecated. The app now uses Google OAuth for authentication; the frontend is updated to load a Google-only sign-in UI.

## Redis / Upstash (deprecated)

Redis/Upstash was previously used for OTP storage. That flow is deprecated and Redis is no longer required for authentication. If you still run the old OTP endpoints (they will respond with 410), you can ignore Redis configuration.

## Google OAuth

To enable Google OAuth sign-in, set the following environment variables:

- `CLIENT_ID` - Google OAuth client ID (e.g. the value you provided)
- `CLIENT_SECRET` - Google OAuth client secret
- `REDIRECT_URI` - Must match the redirect URI configured in Google Cloud Console (e.g. `http://localhost:3000/api/auth/callback/google`)

Endpoints added:
- `GET /api/auth/login-google` — redirects the browser to Google's OAuth consent screen
- `GET /api/auth/callback/google` — handles the OAuth callback, creates/updates the user, sets the `auth_token` cookie and redirects to `/view-wips`

Notes:
- The server uses the email address returned by Google as the user's `email` and as the `username` for uniqueness.
- Make sure `JWT_SECRET` is set so the server can sign session cookies.

Deprecated OTP code backup
-------------------------
I moved a safe backup of the OTP-related handlers into `deprecated/otp/` so you can restore the old behavior if needed. The files included are:

- `deprecated/otp/login-start.js`
- `deprecated/otp/login-verify.js`
- `deprecated/otp/signup.js`
- `deprecated/otp/redisClient.js`

The active endpoints in `api/auth/` return HTTP 410 and clearly indicate that OTP flow is deprecated. If you'd rather fully delete the files or restore the backups as active endpoints, tell me and I'll do it on a branch.
