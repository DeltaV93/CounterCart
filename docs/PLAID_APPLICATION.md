# Plaid Production Access Application

Copy/paste these responses into the Plaid Dashboard application at:
**https://dashboard.plaid.com/team/api**

---

## Company Information

### Company Legal Name
```
[Your legal entity name - e.g., "CounterCart Inc." or your LLC name]
```

### Company Website
```
https://countercart.app
```
*(Replace with your actual production domain)*

### Company Description
```
CounterCart is a consumer fintech application that helps users turn everyday spending into charitable giving. When users shop at businesses, our app identifies those transactions and suggests "counter-donations" to related charitable causes. Users connect their bank accounts via Plaid for read-only transaction monitoring, then complete donations through Every.org's hosted checkout. We never process payments directly—all donations are handled by Every.org, a registered 501(c)(3) fiscal sponsor.
```

---

## Use Case Details

### What Plaid products will you use?
```
Transactions
```

### Which countries will you operate in?
```
United States only
```

### Describe your use case in detail
```
CounterCart uses Plaid's Transactions product to provide charitable donation matching for consumers. Here's how it works:

1. USER ONBOARDING: Users create an account and connect their bank account(s) through Plaid Link.

2. TRANSACTION MONITORING: We use the Transactions Sync API to receive transaction updates via webhooks. We store transaction metadata (merchant name, amount, date, category) to identify spending patterns.

3. MERCHANT MATCHING: Our matching engine compares normalized merchant names against a curated database of businesses. When a user shops at a matched business, we calculate a suggested donation amount (round-up to nearest dollar, multiplied by user's chosen multiplier).

4. DONATION SUGGESTION: We create a pending donation record and notify the user. The user reviews and approves donations on their dashboard.

5. DONATION COMPLETION: When users click "Donate," we redirect them to Every.org's hosted checkout page. Every.org processes the payment and sends us a webhook confirmation. We never handle payment processing.

Key points:
- READ-ONLY ACCESS: We only use transaction data for merchant matching. We never initiate transfers or access account credentials.
- NO PAYMENT PROCESSING: All donations are processed by Every.org. Money never flows through our systems.
- USER CONTROL: Users must explicitly approve each donation. We never auto-donate without consent.
- DATA MINIMIZATION: We only store transaction metadata needed for matching (merchant, amount, date). We do not store full transaction details.
```

### How will you use the data you receive from Plaid?
```
We use transaction data exclusively for merchant name matching to suggest charitable donations. Specifically:

DATA WE USE:
- Merchant name: Normalized and compared against our business mapping database
- Transaction amount: Used to calculate suggested donation (round-up + multiplier)
- Transaction date: Used for display and monthly limit tracking
- Category: Used for dashboard analytics only

DATA WE STORE:
- Normalized merchant name
- Transaction amount
- Transaction date
- Plaid transaction ID (for deduplication)
- Match status (matched/unmatched/donated)

DATA WE DO NOT USE OR STORE:
- Account numbers or routing numbers
- Account balances (beyond initial connection verification)
- User credentials (handled entirely by Plaid)
- Detailed transaction metadata
```

### What is your target user demographic?
```
US-based adults (18+) who want to offset their consumer spending with charitable giving. Our users are socially-conscious consumers who want an easy way to turn everyday purchases into positive impact without changing their shopping habits.
```

### Expected monthly active users (MAU)
```
[Enter your projection - e.g., "1,000-5,000 in first year, scaling to 25,000+ by year two"]
```

### Expected monthly API calls
```
[Enter your projection - e.g., "10,000-50,000 initial, scaling with user base"]
```

---

## Security Questionnaire

### How do you store Plaid access tokens?
```
Plaid access tokens are encrypted at rest using AES-256-GCM authenticated encryption. We use the following implementation:

- Algorithm: AES-256-GCM (authenticated encryption with associated data)
- Key derivation: scrypt with application-specific salt
- Storage: Encrypted tokens stored in PostgreSQL database
- Key management: Encryption key stored as environment variable, never committed to code

The encryption implementation generates a unique 16-byte IV for each token, includes a 16-byte authentication tag for integrity verification, and stores the combined IV + AuthTag + Ciphertext as a base64-encoded string.
```

### How do you handle Plaid webhooks?
```
We verify all Plaid webhooks using JWT signature verification:

1. Extract JWT from webhook body
2. Fetch Plaid's public keys from /webhook_verification_key/get endpoint (cached for 1 hour)
3. Verify JWT signature using ES256 algorithm
4. Validate body hash (SHA-256 of raw body must match claim in JWT)
5. Check token age (reject if older than 5 minutes)
6. Use timing-safe comparison to prevent timing attacks

Failed webhook verifications are logged and rejected with 401 Unauthorized.
```

### Do you have rate limiting implemented?
```
Yes. We implement sliding window rate limiting on all API endpoints:

- Standard endpoints: 100 requests/minute
- Authentication endpoints: 10 requests/minute
- Webhook endpoints: 200 requests/minute
- Expensive operations (token exchange): 20 requests/minute

Rate limiting is IP-based with support for x-forwarded-for headers. We return standard rate limit headers (X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, Retry-After).

We support both in-memory rate limiting (single instance) and Redis-based rate limiting (distributed deployment).
```

### What security headers do you implement?
```
We apply the following security headers via middleware:

- Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
- X-Frame-Options: SAMEORIGIN
- X-Content-Type-Options: nosniff
- Referrer-Policy: origin-when-cross-origin
- Permissions-Policy: camera=(), microphone=(), geolocation=()
- X-DNS-Prefetch-Control: on
```

### How do you handle user authentication?
```
We use Supabase Auth for user authentication:

- Email/password authentication with secure session management
- Session tokens stored in HTTP-only cookies
- Middleware validates session on every protected route
- Protected routes redirect unauthenticated users to login

All user-scoped API endpoints verify the authenticated user owns the requested resource.
```

### Do you have logging and monitoring?
```
Yes. We implement structured JSON logging with the following features:

- Severity levels: debug, info, warn, error
- Context includes: timestamp, level, message, metadata
- Stack traces excluded in production (security)
- Child loggers for request-scoped context (request ID, user ID)

Security-relevant events logged:
- Webhook verification failures
- Authentication failures
- Authorization failures
- Account deletions
- Data exports
```

### How do you handle data deletion requests?
```
Users can delete their account and all associated data from the Settings page. Our deletion process:

1. Cancel any active Stripe subscriptions
2. Call Plaid's /item/remove endpoint to revoke bank access
3. Delete user record from database (cascades to all related records)
4. Remove user from Supabase Auth
5. Sign out the user

All data is permanently deleted, not soft-deleted. This complies with CCPA and GDPR right to erasure.
```

### Do you have a privacy policy?
```
Yes. Our privacy policy is published at:
https://countercart.app/privacy

Key points:
- We explain exactly what data we collect and why
- We disclose all third-party integrations (Plaid, Stripe, Every.org, Resend)
- We state we never sell personal information
- We document user rights (access, correction, deletion, portability)
- We explain our security measures (AES-256 encryption, TLS)
```

### Do you have terms of service?
```
Yes. Our terms of service are published at:
https://countercart.app/terms

Key points relevant to Plaid:
- Section 4 explains bank account connection is read-only via Plaid
- Section 5 clarifies donations are voluntary and user-initiated
- Section 13 explains account deletion process
```

---

## Technical Details

### What is your webhook URL?
```
https://countercart.app/api/webhooks/plaid
```
*(Replace with your actual production domain)*

### What Plaid Link configuration do you use?
```javascript
{
  products: ["transactions"],
  country_codes: ["US"],
  language: "en"
}
```

### Database and infrastructure
```
- Database: PostgreSQL (via Prisma ORM)
- Hosting: Railway
- Framework: Next.js 16 with App Router
- Authentication: Supabase Auth
```

---

## Links to Include

| Document | URL |
|----------|-----|
| Privacy Policy | https://countercart.app/privacy |
| Terms of Service | https://countercart.app/terms |
| FAQ | https://countercart.app/faq |

---

## After Submission

### Expected Timeline
- Initial review: 1-2 weeks
- Follow-up questions: Common, respond promptly
- Total time to approval: 2-4 weeks

### Common Follow-up Questions
Plaid may ask for:
1. Demo video or screenshots of your app flow
2. Clarification on specific security implementations
3. Additional details about data retention
4. Proof of business registration

### After Approval
1. Get production credentials from Plaid dashboard
2. Update environment variables:
   ```
   PLAID_CLIENT_ID=<production_client_id>
   PLAID_SECRET=<production_secret>
   PLAID_ENV=production
   ```
3. Update webhook URL in Plaid dashboard
4. Test with real bank connections (use your own account first)
5. Monitor error rates in Plaid dashboard

---

*Document prepared for CounterCart Plaid production access application*
