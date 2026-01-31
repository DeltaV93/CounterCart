import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const causes = [
  "Local Food Banks",
  "Veterans Support",
  "Environmental",
  "Faith-Based",
  "Animal Welfare",
  "Education",
  "Healthcare",
  "Disaster Relief",
  "Youth Programs",
  "Arts & Culture",
  "Housing & Homelessness",
  "Mental Health",
  "First Responders",
  "Any 501(c)(3)",
];

const features = [
  {
    icon: "🔒",
    title: "BANK-LEVEL SECURITY",
    description:
      "Read-only access via Plaid. We never store credentials or touch your money directly.",
  },
  {
    icon: "📊",
    title: "IMPACT DASHBOARD",
    description:
      "See exactly where your money goes. Track donations, view reports, export for taxes.",
  },
  {
    icon: "⚡",
    title: "AUTOMATIC DETECTION",
    description:
      "We identify your spending patterns and suggest offset opportunities. You approve.",
  },
  {
    icon: "🎛️",
    title: "FULL CONTROL",
    description:
      "Set spending triggers, choose percentages, pause anytime. Your rules, always.",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-primary border-b-[3px] border-accent">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-accent flex items-center justify-center text-primary">
              ↺
            </div>
            <span className="headline text-primary-foreground text-xl tracking-wider">
              COUNTERCART
            </span>
          </Link>
          <nav className="flex items-center gap-4 md:gap-8">
            <Link
              href="#how-it-works"
              className="hidden md:block text-primary-foreground text-sm hover:text-accent transition-colors"
            >
              How It Works
            </Link>
            <Link
              href="#causes"
              className="hidden md:block text-primary-foreground text-sm hover:text-accent transition-colors"
            >
              Causes
            </Link>
            <Link
              href="#pricing"
              className="hidden md:block text-primary-foreground text-sm hover:text-accent transition-colors"
            >
              Pricing
            </Link>
            <Link href="/signup">
              <Button variant="accent" size="sm" className="headline tracking-widest">
                GET STARTED
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="min-h-screen pt-32 pb-20 px-4 md:px-8 flex items-center">
        <div className="container mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <div className="relative z-10">
            <h1 className="headline text-5xl md:text-6xl lg:text-7xl mb-6">
              <span className="block animate-slide-up" style={{ animationDelay: "0s" }}>
                TURN SPENDING
              </span>
              <span
                className="block animate-slide-up"
                style={{ animationDelay: "0.15s" }}
              >
                HABITS INTO
              </span>
              <span
                className="block text-accent animate-slide-up"
                style={{ animationDelay: "0.3s" }}
              >
                GIVING HABITS.
              </span>
            </h1>
            <p
              className="text-muted-foreground text-lg mb-8 max-w-md animate-fade-in opacity-0"
              style={{ animationDelay: "0.5s" }}
            >
              Maybe it&apos;s a guilty pleasure. Maybe it&apos;s a company that
              doesn&apos;t share your values. Either way — CounterCart lets you offset
              your spending with donations to causes you choose.
            </p>
            <Link
              href="/signup"
              className="inline-flex items-center gap-4 bg-primary text-primary-foreground px-8 py-4 headline text-xl tracking-wider border-[3px] border-primary hover:bg-accent hover:border-accent hover:text-accent-foreground transition-all animate-fade-in opacity-0 group"
              style={{ animationDelay: "0.7s" }}
            >
              START FOR FREE
              <ArrowRight className="h-6 w-6 group-hover:translate-x-1 transition-transform" />
            </Link>
            <p
              className="mt-4 animate-fade-in opacity-0"
              style={{ animationDelay: "0.9s" }}
            >
              <Link
                href="#how-it-works"
                className="text-muted-foreground hover:text-accent border-b border-muted-foreground hover:border-accent transition-colors"
              >
                See how it works →
              </Link>
            </p>
          </div>
          <div className="hidden lg:flex justify-center items-center">
            <div className="relative w-[400px] h-[400px]">
              {/* Rotating circle text */}
              <svg
                className="absolute w-[300px] h-[300px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-rotate"
                viewBox="0 0 300 300"
              >
                <defs>
                  <path
                    id="circlePath"
                    d="M 150, 150 m -120, 0 a 120,120 0 1,1 240,0 a 120,120 0 1,1 -240,0"
                  />
                </defs>
                <text
                  fill="currentColor"
                  className="text-foreground"
                  fontFamily="var(--font-mono)"
                  fontSize="12"
                  letterSpacing="4"
                >
                  <textPath href="#circlePath">
                    SPEND • OFFSET • GIVE BACK • FEEL GOOD • SPEND • OFFSET • GIVE
                    BACK •
                  </textPath>
                </text>
              </svg>
              {/* Center stamp */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-12 bg-accent px-8 py-6 headline text-2xl tracking-wider border-4 border-primary shadow-brutal-lg">
                BALANCED
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Marquee */}
      <section className="bg-accent py-4 border-y-[3px] border-primary overflow-hidden">
        <div className="flex animate-marquee">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="flex shrink-0">
              <span className="headline text-xl px-8 whitespace-nowrap flex items-center gap-4">
                $47,293 DONATED THIS MONTH <span className="text-sm">◆</span>
              </span>
              <span className="headline text-xl px-8 whitespace-nowrap flex items-center gap-4">
                YOUR SPENDING, YOUR CAUSES <span className="text-sm">◆</span>
              </span>
              <span className="headline text-xl px-8 whitespace-nowrap flex items-center gap-4">
                BALANCE IS BEAUTIFUL <span className="text-sm">◆</span>
              </span>
              <span className="headline text-xl px-8 whitespace-nowrap flex items-center gap-4">
                SET IT AND FORGET IT <span className="text-sm">◆</span>
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Use Cases */}
      <section className="bg-primary text-primary-foreground py-20 px-4 md:px-8">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <span className="text-accent text-sm tracking-widest">Real Examples</span>
            <h2 className="headline text-4xl md:text-5xl mt-2">
              HOW PEOPLE USE COUNTERCART
            </h2>
            <p className="text-muted-gray max-w-xl mx-auto mt-4">
              Whether it&apos;s a guilty habit or a company that doesn&apos;t share your
              values — you decide what to offset and where the money goes.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Values-based column */}
            <div className="p-6 bg-white/5 border border-white/10">
              <h3 className="headline text-xl text-accent flex items-center gap-2 mb-2">
                <span>⚖️</span> OFFSET BY VALUES
              </h3>
              <p className="text-muted-gray text-sm mb-6 pb-4 border-b border-dashed border-white/20">
                Shop somewhere that doesn&apos;t align with your beliefs? Offset it.
              </p>

              <div className="space-y-6">
                <div className="py-4 border-b border-white/5">
                  <p className="text-xs text-muted-gray tracking-wider mb-1">
                    YOU SHOP AT
                  </p>
                  <h4 className="headline text-2xl mb-2">A BIG BOX RETAILER</h4>
                  <p className="text-accent headline text-lg mb-1">↓</p>
                  <p className="text-accent font-medium">Worker Advocacy Orgs</p>
                  <p className="text-sm text-primary-foreground/80">
                    Support labor rights with every purchase.
                  </p>
                </div>

                <div className="py-4 border-b border-white/5">
                  <p className="text-xs text-muted-gray tracking-wider mb-1">
                    YOU SHOP AT
                  </p>
                  <h4 className="headline text-2xl mb-2">A FAST FOOD CHAIN</h4>
                  <p className="text-accent headline text-lg mb-1">↓</p>
                  <p className="text-accent font-medium">LGBTQ+ Organizations</p>
                  <p className="text-sm text-primary-foreground/80">
                    Counter corporate stances you disagree with.
                  </p>
                </div>

                <div className="py-4">
                  <p className="text-xs text-muted-gray tracking-wider mb-1">
                    YOU SHOP AT
                  </p>
                  <h4 className="headline text-2xl mb-2">A TECH GIANT</h4>
                  <p className="text-accent headline text-lg mb-1">↓</p>
                  <p className="text-accent font-medium">Privacy & Digital Rights</p>
                  <p className="text-sm text-primary-foreground/80">
                    Fund the causes they won&apos;t.
                  </p>
                </div>
              </div>
            </div>

            {/* Habit-based column */}
            <div className="p-6 bg-white/5 border border-white/10">
              <h3 className="headline text-xl text-accent flex items-center gap-2 mb-2">
                <span>🔄</span> OFFSET BY HABIT
              </h3>
              <p className="text-muted-gray text-sm mb-6 pb-4 border-b border-dashed border-white/20">
                Spending a little too much on something? Balance it out.
              </p>

              <div className="space-y-6">
                <div className="py-4 border-b border-white/5">
                  <p className="text-xs text-muted-gray tracking-wider mb-1">
                    YOU SPEND ON
                  </p>
                  <h4 className="headline text-2xl mb-2">TOO MUCH DOORDASH</h4>
                  <p className="text-accent headline text-lg mb-1">↓</p>
                  <p className="text-accent font-medium">Local Food Banks</p>
                  <p className="text-sm text-primary-foreground/80">
                    Every delivery feeds someone else too.
                  </p>
                </div>

                <div className="py-4 border-b border-white/5">
                  <p className="text-xs text-muted-gray tracking-wider mb-1">
                    YOU SPEND ON
                  </p>
                  <h4 className="headline text-2xl mb-2">DAILY COFFEE RUNS</h4>
                  <p className="text-accent headline text-lg mb-1">↓</p>
                  <p className="text-accent font-medium">Clean Water Projects</p>
                  <p className="text-sm text-primary-foreground/80">
                    Your latte habit funds wells worldwide.
                  </p>
                </div>

                <div className="py-4">
                  <p className="text-xs text-muted-gray tracking-wider mb-1">
                    YOU SPEND ON
                  </p>
                  <h4 className="headline text-2xl mb-2">GAS & TRAVEL</h4>
                  <p className="text-accent headline text-lg mb-1">↓</p>
                  <p className="text-accent font-medium">Environmental Orgs</p>
                  <p className="text-sm text-primary-foreground/80">
                    Offset your carbon footprint automatically.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <p className="text-center mt-10 text-lg">
            You pick the trigger. You pick the cause.{" "}
            <span className="text-accent">We just make it automatic.</span>
          </p>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 px-4 md:px-8">
        <div className="container mx-auto">
          <div className="mb-16">
            <span className="text-muted-foreground text-sm tracking-widest">
              The Process
            </span>
            <h2 className="headline text-4xl md:text-5xl mt-2">HOW IT WORKS</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="p-8 bg-card border-2 border-primary hover:shadow-brutal transition-all hover:-translate-y-2">
              <div className="headline text-6xl text-accent mb-4">01</div>
              <h3 className="headline text-2xl mb-3">CONNECT</h3>
              <p className="text-muted-foreground">
                Securely link your bank with Plaid. Read-only access — we just see
                transactions, never touch your money.
              </p>
            </div>

            <div className="p-8 bg-card border-2 border-primary hover:shadow-brutal transition-all hover:-translate-y-2 md:mt-12">
              <div className="headline text-6xl text-accent mb-4">02</div>
              <h3 className="headline text-2xl mb-3">CHOOSE</h3>
              <p className="text-muted-foreground">
                Pick your causes. Veterans? Food banks? Environment? Faith-based? Your
                values, your choice.
              </p>
            </div>

            <div className="p-8 bg-card border-2 border-primary hover:shadow-brutal transition-all hover:-translate-y-2 md:mt-24">
              <div className="headline text-6xl text-accent mb-4">03</div>
              <h3 className="headline text-2xl mb-3">OFFSET</h3>
              <p className="text-muted-foreground">
                Set your percentage. Each week, review and approve your donations.
                Premium users automate it completely.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Causes */}
      <section
        id="causes"
        className="py-20 px-4 md:px-8 bg-muted border-y-[3px] border-primary"
      >
        <div className="container mx-auto">
          <div className="text-center mb-10">
            <span className="text-muted-foreground text-sm tracking-widest">
              Support What Matters
            </span>
            <h2 className="headline text-4xl md:text-5xl mt-2">CHOOSE YOUR CAUSES</h2>
            <p className="text-muted-foreground max-w-lg mx-auto mt-4">
              We don&apos;t tell you what to care about. You pick the causes that align
              with your values.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-3 max-w-4xl mx-auto">
            {causes.map((cause) => (
              <span
                key={cause}
                className="bg-card border-2 border-primary px-4 py-2 text-sm hover:bg-accent hover:-translate-y-0.5 transition-all cursor-default"
              >
                {cause}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Quotes */}
      <section className="py-20 px-4 md:px-8 bg-primary text-primary-foreground relative overflow-hidden">
        <div className="absolute top-0 left-12 headline text-[300px] text-warm-gray/10 leading-none">
          &ldquo;
        </div>
        <div className="container mx-auto relative z-10">
          <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16 max-w-5xl mx-auto">
            <div className="flex-1 text-center md:text-left max-w-md">
              <p className="headline text-2xl md:text-3xl leading-tight mb-4">
                &ldquo;I DOORDASH WAY TOO MUCH.
                <br />
                NOW EVERY ORDER <span className="text-accent">
                  FEEDS SOMEONE ELSE
                </span>{" "}
                TOO.&rdquo;
              </p>
              <p className="text-muted-gray">
                — Sarah, <span className="text-accent">Austin TX</span>
              </p>
            </div>

            <div className="hidden md:block text-accent text-2xl opacity-50">◆</div>

            <div className="flex-1 text-center md:text-left max-w-md">
              <p className="headline text-2xl md:text-3xl leading-tight mb-4">
                &ldquo;I STILL SHOP AT AMAZON.
                <br />
                BUT NOW I <span className="text-accent">FUND WORKER ADVOCACY</span>
                <br />
                EVERY TIME I DO.&rdquo;
              </p>
              <p className="text-muted-gray">
                — Marcus, <span className="text-accent">Brooklyn NY</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 md:px-8">
        <div className="container mx-auto">
          <div className="mb-12">
            <span className="text-muted-foreground text-sm tracking-widest">
              What You Get
            </span>
            <h2 className="headline text-4xl md:text-5xl mt-2">FEATURES</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {features.map((feature) => (
              <div key={feature.title} className="flex gap-5">
                <div className="flex-shrink-0 w-12 h-12 bg-accent border-2 border-primary flex items-center justify-center text-xl">
                  {feature.icon}
                </div>
                <div>
                  <h3 className="headline text-xl mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section
        id="pricing"
        className="py-20 px-4 md:px-8 bg-muted border-t-[3px] border-primary"
      >
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <span className="text-muted-foreground text-sm tracking-widest">
              Simple Pricing
            </span>
            <h2 className="headline text-4xl md:text-5xl mt-2">
              START FREE, UPGRADE WHEN READY
            </h2>
            <p className="text-muted-foreground mt-4">
              No tricks. No hidden fees. Cancel anytime.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {/* Free tier */}
            <div className="bg-card border-2 border-primary p-8">
              <h3 className="headline text-2xl mb-2">FREE</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Perfect for getting started
              </p>
              <p className="headline text-5xl mb-6">$0</p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="text-accent font-bold">✓</span> 1 bank connection
                </li>
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="text-accent font-bold">✓</span> 2 causes
                </li>
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="text-accent font-bold">✓</span> $25/month offset limit
                </li>
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="text-accent font-bold">✓</span> Weekly manual approval
                </li>
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="text-accent font-bold">✓</span> Basic impact reports
                </li>
              </ul>
              <Link href="/signup" className="block">
                <Button variant="outline" className="w-full headline tracking-wider">
                  GET STARTED FREE
                </Button>
              </Link>
            </div>

            {/* Premium tier */}
            <div className="bg-card border-[3px] border-primary p-8 shadow-brutal relative">
              <div className="absolute -top-3 right-5 bg-accent text-accent-foreground headline text-xs tracking-wider px-3 py-1 rotate-3">
                POPULAR
              </div>
              <h3 className="headline text-2xl mb-2">PREMIUM</h3>
              <p className="text-muted-foreground text-sm mb-4">For maximum impact</p>
              <p className="headline text-5xl mb-6">
                $4.99<span className="text-lg text-muted-foreground">/month</span>
              </p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="text-accent font-bold">✓</span> 3 bank connections
                </li>
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="text-accent font-bold">✓</span> Unlimited causes
                </li>
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="text-accent font-bold">✓</span> No monthly limit
                </li>
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="text-accent font-bold">✓</span> Auto-weekly donations
                </li>
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="text-accent font-bold">✓</span> Tax summary export
                </li>
              </ul>
              <Link href="/signup" className="block">
                <Button className="w-full headline tracking-wider">
                  START PREMIUM TRIAL
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section id="get-started" className="py-24 px-4 md:px-8 text-center">
        <div className="container mx-auto max-w-2xl">
          <h2 className="headline text-5xl md:text-6xl mb-4">READY TO BALANCE?</h2>
          <p className="text-muted-foreground text-lg mb-10">
            Turn your spending habits into giving habits. It takes 2 minutes.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-4 bg-accent text-accent-foreground px-10 py-5 headline text-xl tracking-wider border-[3px] border-primary shadow-brutal hover:translate-x-1 hover:translate-y-1 hover:shadow-brutal-sm transition-all group"
          >
            CREATE YOUR ACCOUNT
            <ArrowRight className="h-6 w-6 group-hover:translate-x-1 transition-transform" />
          </Link>
          <p className="mt-6 text-muted-foreground text-sm">
            Free forever. No credit card required.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-primary text-primary-foreground py-10 px-4 md:px-8">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left">
            <div className="headline text-xl tracking-wider mb-1">COUNTERCART</div>
            <p className="text-muted-gray text-sm">
              Spend. <span className="text-accent">Offset. Give back.</span>
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-6">
            <Link
              href="#how-it-works"
              className="text-sm hover:text-accent transition-colors"
            >
              How It Works
            </Link>
            <Link href="#causes" className="text-sm hover:text-accent transition-colors">
              Causes
            </Link>
            <Link
              href="#pricing"
              className="text-sm hover:text-accent transition-colors"
            >
              Pricing
            </Link>
            <Link href="/faq" className="text-sm hover:text-accent transition-colors">
              FAQ
            </Link>
            <Link href="/privacy" className="text-sm hover:text-accent transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="text-sm hover:text-accent transition-colors">
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
