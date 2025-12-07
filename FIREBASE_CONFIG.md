# Firebase Configuration

## Setup Instructions

This project uses environment variables to store Firebase configuration keys securely.

### Local Development

1. **Copy the example file:**
   ```bash
   cp .env.example .env
   ```

2. **Fill in your Firebase keys** in the `.env` file (already done for you)

3. **Start the dev server:**
   ```bash
   npm run dev
   ```

### Deployment (Firebase Hosting)

Firebase Hosting needs the environment variables configured:

```bash
firebase functions:config:set \
  firebase.api_key="YOUR_API_KEY" \
  firebase.auth_domain="YOUR_AUTH_DOMAIN"
```

Or use the Firebase Console → Hosting → Environment Configuration

### Security Note

**Firebase API keys are safe to expose in client-side code.** The real security comes from:
- Firebase Security Rules (configured in Firebase Console)
- App Check (optional, for production)
- Domain restrictions (configured in Firebase Console)

However, using environment variables:
- ✅ Keeps GitHub happy (no secret scanning alerts)
- ✅ Makes key rotation easier
- ✅ Allows different configs for dev/staging/prod

### Files

- `.env` - Your actual keys (gitignored, never commit this!)
- `.env.example` - Template for other developers
- `src/firebase.js` - Reads from environment variables
