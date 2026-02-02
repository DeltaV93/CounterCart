# CounterCart Compliance Roadmap

## Executive Summary

**CounterCart is a redirect service, NOT a money transmitter.** All donations are processed by Every.org - CounterCart only generates URLs and tracks completion via webhooks. This significantly reduces compliance requirements.

---

## Current Compliance Status

### Minimum Launch Items - ALL COMPLETE

| Item | Status | Location |
|------|--------|----------|
| Privacy Policy | ✅ Complete | `/privacy` - `src/app/(legal)/privacy/page.tsx` |
| Terms of Service | ✅ Complete | `/terms` - `src/app/(legal)/terms/page.tsx` |
| Plaid Production Approval | ⏳ Pending | Requires application submission |
| Basic Security Practices | ✅ Documented | See "Security Implementation" below |
| CCPA-Compliant Data Handling | ✅ Complete | Export + Delete implemented |

---

## Donation Flow Architecture (Compliance-Relevant)

```
User Shops → Plaid syncs transaction → CounterCart matches merchant
    ↓
Creates PENDING donation record (database only)
    ↓
User clicks "Donate" → CounterCart generates Every.org URL
    ↓
Browser opens: https://www.every.org/{charity}#donate?amount=X
    ↓
User completes payment ON EVERY.ORG (not CounterCart)
    ↓
Every.org sends webhook → CounterCart marks donation COMPLETED
```

**Key Point**: Money never touches CounterCart servers. Every.org handles:
- Payment form display
- Credit card collection
- Payment processing
- PCI-DSS compliance
- Donation receipts

---

## Security Implementation (Already in Place)

### Encryption
- **Algorithm**: AES-256-GCM (authenticated encryption)
- **Usage**: Plaid access tokens encrypted at rest
- **Location**: `src/lib/encryption.ts`

### Webhook Verification
| Provider | Method | Location |
|----------|--------|----------|
| Plaid | JWT + body hash + timing-safe comparison | `src/lib/plaid-webhook.ts` |
| Every.org | HMAC-SHA256 + timing-safe comparison | `src/app/api/webhooks/everyorg/route.ts` |
| Stripe | Built-in SDK verification | `src/app/api/webhooks/stripe/route.ts` |

### Rate Limiting
- **Implementation**: Sliding window algorithm
- **Presets**: Standard (100/min), Auth (10/min), Webhooks (200/min), Expensive (20/min)
- **Locations**: `src/lib/rate-limit.ts` (in-memory), `src/lib/rate-limit-redis.ts` (distributed)

### Security Headers (via middleware)
| Header | Value |
|--------|-------|
| Strict-Transport-Security | max-age=63072000; includeSubDomains; preload |
| X-Frame-Options | SAMEORIGIN |
| X-Content-Type-Options | nosniff |
| Referrer-Policy | origin-when-cross-origin |
| Permissions-Policy | camera=(), microphone=(), geolocation=() |

### Input Validation
- All API endpoints use Zod schema validation
- No raw SQL queries (Prisma ORM prevents SQL injection)

### Authentication
- Supabase Auth (email/password)
- Middleware-based session management
- Protected routes require authentication

---

## CCPA/GDPR Compliance (Already Implemented)

### Data Subject Rights
| Right | Implementation | Endpoint |
|-------|---------------|----------|
| Access | Full data export | `GET /api/user/export` |
| Deletion | Complete account deletion | `DELETE /api/user/delete` |
| Portability | JSON download | Settings page |

### Privacy-Friendly Analytics
- **Tool**: Fathom Analytics (no cookies)
- **User IDs**: SHA-256 hashed (first 16 chars)
- **Donation amounts**: Bucketed for privacy (under_1, 1_to_5, etc.)

### Data Deletion Process
1. Cancel Stripe subscriptions
2. Disconnect Plaid items (revoke bank access)
3. Delete all user data (cascades to related records)
4. Remove from Supabase Auth
5. Sign out user

---

## Pre-Scaling Compliance Roadmap

### Phase 1: Plaid Production Access (Required for Launch)

**Timeline**: 2-4 weeks

**Steps**:
1. [ ] Complete Plaid production access application
2. [ ] Demonstrate security practices (encryption, webhook verification)
3. [ ] Provide privacy policy and terms of service URLs
4. [ ] Complete security questionnaire
5. [ ] Test with production credentials

**Documentation Needed**:
- Link to `/privacy` and `/terms`
- Description of data handling practices
- Security implementation overview

### Phase 2: SOC 2 Type I (Before Major Scaling)

**Timeline**: 3-6 months
**Estimated Cost**: $20,000-$50,000

**Why Needed**:
- Enterprise customers require it
- B2B partnerships (employer matching programs)
- Investor due diligence

**Scope**:
- Security
- Availability
- Confidentiality

**Preparation Checklist**:
- [ ] Document all security policies formally
- [ ] Implement change management procedures
- [ ] Set up access logging and audit trails
- [ ] Establish incident response plan
- [ ] Create employee security training program
- [ ] Implement vendor risk management

### Phase 3: SOC 2 Type II (After Type I)

**Timeline**: Additional 6-12 months after Type I
**Estimated Cost**: $30,000-$100,000

**Why Needed**:
- Proves controls are operating effectively over time
- Required for large enterprise deals
- Higher trust level with partners

### Phase 4: Penetration Testing

**Timeline**: Before major launch or after significant changes
**Estimated Cost**: $5,000-$25,000

**Scope**:
- [ ] Web application testing (OWASP Top 10)
- [ ] API security testing
- [ ] Authentication/authorization testing
- [ ] Third-party integration security

**Recommended Vendors**:
- HackerOne
- Bugcrowd
- Cobalt

### Phase 5: Bug Bounty Program (Optional)

**Timeline**: After penetration testing
**Cost**: Variable (bounty payouts)

**Platforms**:
- HackerOne
- Bugcrowd

---

## Compliance NOT Required

### Money Transmitter Licenses
**Status**: NOT REQUIRED

CounterCart does not:
- Accept money from users
- Hold funds
- Transfer money between parties
- Process payments

Every.org handles all payment processing and holds appropriate licenses.

### PCI-DSS Compliance
**Status**: NOT REQUIRED (handled by Every.org and Stripe)

CounterCart never:
- Collects credit card numbers
- Stores payment information
- Processes transactions

### State-by-State Nonprofit Registration
**Status**: NOT REQUIRED

Every.org is the registered nonprofit platform. CounterCart is a referral service.

---

## Recommended Security Enhancements

### High Priority (Before Scaling)

1. **Content-Security-Policy Header**
   - Currently missing from security headers
   - Prevents XSS and injection attacks
   - Add to `src/middleware.ts`

2. **Fail-Secure Webhook Verification**
   - Every.org webhook returns true if secret not configured
   - Should fail if secret is missing
   - Location: `src/app/api/webhooks/everyorg/route.ts`

3. **Error Message Sanitization**
   - Zod validation errors exposed in responses
   - Sanitize detailed errors in production

### Medium Priority

4. **Audit Logging**
   - Track data exports and account deletions
   - Log admin access to user data
   - Useful for SOC 2 compliance

5. **Consent Tracking**
   - Store terms acceptance date per user
   - Track privacy policy version accepted
   - Required for full GDPR compliance

6. **Data Retention Policy**
   - Define retention periods for different data types
   - Implement automated cleanup for inactive accounts

### Low Priority

7. **Data Processing Agreements**
   - Document DPAs with Plaid, Stripe, Every.org
   - Required for full GDPR compliance if serving EU users

---

## Third-Party Compliance Dependencies

| Partner | Their Compliance | Your Requirement |
|---------|-----------------|------------------|
| Plaid | SOC 2 Type II, PCI-DSS | Production access approval |
| Every.org | 501(c)(3) fiscal sponsor, PCI-DSS | Partner agreement |
| Stripe | SOC 2 Type II, PCI-DSS Level 1 | Standard integration |
| Supabase | SOC 2 Type II | Standard usage |

---

## Launch Checklist

### Minimum Viable Compliance (MVP Launch)

- [x] Privacy Policy published
- [x] Terms of Service published
- [x] Data export functionality
- [x] Account deletion functionality
- [x] Webhook signature verification
- [x] Rate limiting
- [x] Security headers
- [x] Encrypted sensitive data
- [x] Structured logging
- [ ] Plaid production access approved
- [ ] Every.org partner agreement finalized

### Before Significant Scale

- [ ] SOC 2 Type I certification
- [ ] Penetration testing completed
- [ ] Incident response plan documented
- [ ] Content-Security-Policy header added
- [ ] Audit logging implemented

---

## Contact Information

For compliance questions:
- **Privacy**: privacy@countercart.app
- **Legal**: legal@countercart.app
- **Security**: (add security@countercart.app)

---

*Last Updated: February 2026*
