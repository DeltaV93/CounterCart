# CounterCart

**Offset Your Purchases with Purpose**

CounterCart is a "round-up for charity" web app that automatically matches purchases at specific businesses to counter-donations to related charitable causes. When you shop at businesses with questionable practices, the app suggests donations to opposing charities.

## Features

- **Bank Integration** - Connect your bank via Plaid to automatically track purchases
- **Smart Matching** - Transactions are matched against a database of business-to-cause mappings
- **Round-Up Donations** - Automatically calculate round-up amounts with customizable multipliers
- **Choose Your Causes** - Select causes you care about (LGBTQ+ Rights, Climate Action, etc.)
- **Pick Your Charities** - Choose which nonprofits receive your donations via Every.org
- **Tax Summaries** - Export donation history for tax purposes (Premium)
- **Dark Mode** - Full dark mode support

## Tech Stack

- **Framework**: Next.js 16 with App Router (React 19)
- **Database**: PostgreSQL with Prisma ORM
- **Auth**: Supabase Auth
- **Banking**: Plaid API
- **Donations**: Every.org API
- **Payments**: Stripe (subscriptions)
- **Email**: Resend
- **Styling**: Tailwind CSS + shadcn/ui
- **Analytics**: Fathom Analytics

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL database
- Accounts with: Supabase, Plaid, Stripe, Every.org, Resend

### Installation

```bash
# Clone the repository
git clone https://github.com/DeltaV93/CounterCart.git
cd CounterCart

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Set up your environment variables (see below)

# Push database schema
npm run db:push

# Seed the database with causes and mappings
npm run db:seed

# Start development server
npm run dev
```

### Environment Variables

See `.env.example` for all required variables. Key ones include:

```env
# Database
DATABASE_URL=postgresql://...

# Supabase Auth
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx

# Plaid
PLAID_CLIENT_ID=xxx
PLAID_SECRET=xxx
PLAID_ENV=sandbox

# Stripe
STRIPE_SECRET_KEY=xxx
STRIPE_WEBHOOK_SECRET=xxx

# Every.org
EVERYORG_API_KEY=xxx

# Security
ENCRYPTION_SECRET=xxx  # openssl rand -base64 32
```

## Scripts

```bash
npm run dev          # Start development server (port 3007)
npm run build        # Build for production
npm run lint         # Run ESLint
npm run db:push      # Push schema changes to database
npm run db:migrate   # Run migrations
npm run db:seed      # Seed database
npm run db:studio    # Open Prisma Studio
```

## Deployment

The app is configured for Railway deployment. See `CLAUDE.md` for detailed deployment instructions.

```bash
# Deploy to Railway
railway up
```

### Webhook URLs

After deployment, configure these webhook URLs:
- **Plaid**: `https://your-app.railway.app/api/webhooks/plaid`
- **Stripe**: `https://your-app.railway.app/api/webhooks/stripe`
- **Every.org**: `https://your-app.railway.app/api/webhooks/everyorg`

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Login/signup pages
│   ├── (dashboard)/       # Main app pages
│   ├── (legal)/           # Privacy, terms, FAQ
│   ├── api/               # API routes
│   └── onboarding/        # Onboarding flow
├── components/            # React components
│   └── ui/               # shadcn/ui components
├── lib/                   # Utilities and services
├── config/               # App configuration
└── services/             # Business logic services
```

## License

MIT
