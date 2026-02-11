import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Building2,
  Users,
  TrendingUp,
  Shield,
  FileText,
  Sparkles,
  Check,
} from "lucide-react";

const benefits = [
  {
    icon: Users,
    title: "TEAM ENGAGEMENT",
    description:
      "Unite your team around shared values. Employees join with their work email and start making an impact together.",
  },
  {
    icon: TrendingUp,
    title: "CSR REPORTING",
    description:
      "Automatic tracking of team donations. Export quarterly or annual reports for stakeholders and ESG compliance.",
  },
  {
    icon: Shield,
    title: "PREMIUM FOR ALL",
    description:
      "Every team member gets Premium features included. Unlimited causes, auto-donations, and full tax documentation.",
  },
  {
    icon: FileText,
    title: "SIMPLE ADMINISTRATION",
    description:
      "One dashboard to manage your team. Invite members, track participation, and see aggregate impact in real-time.",
  },
];

const faqs = [
  {
    q: "How does team billing work?",
    a: "We bill monthly based on active seats. $3 per employee per month, billed to one company card. No individual billing required.",
  },
  {
    q: "Can employees choose their own causes?",
    a: "Absolutely. Each employee maintains their own cause preferences and charity selections. The company sees aggregate data, not individual choices.",
  },
  {
    q: "What about tax documentation?",
    a: "Each employee receives their own tax-deductible donation receipts. The company receives aggregate reporting for CSR purposes.",
  },
  {
    q: "How do employees join?",
    a: "You get a unique invite link. Share it with your team, and they can sign up or link their existing CounterCart account. They automatically get Premium access.",
  },
];

export default function ForTeamsPage() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[var(--counter-cream)] border-b-2 border-primary">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-accent border-2 border-primary flex items-center justify-center font-mono font-bold text-primary">
              ↻
            </div>
            <span className="headline text-foreground text-xl tracking-wider">
              COUNTERCART
            </span>
          </Link>
          <nav className="flex items-center gap-4 md:gap-8">
            <Link
              href="/"
              className="hidden md:block text-primary-foreground text-sm hover:text-accent transition-colors"
            >
              For Individuals
            </Link>
            <Link href="/signup?source=teams">
              <Button size="sm">GET STARTED</Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="min-h-screen pt-32 pb-20 px-4 md:px-8 flex items-center">
        <div className="container mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 bg-accent text-accent-foreground px-4 py-2 text-sm font-display uppercase tracking-wider border-2 border-primary mb-6">
              <Building2 className="h-4 w-4" />
              FOR TEAMS
            </div>
            <h1 className="headline text-5xl md:text-6xl lg:text-7xl mb-6">
              <span className="block animate-slide-up" style={{ animationDelay: "0s" }}>
                CORPORATE
              </span>
              <span
                className="block animate-slide-up"
                style={{ animationDelay: "0.15s" }}
              >
                SOCIAL
              </span>
              <span
                className="block text-accent animate-slide-up"
                style={{ animationDelay: "0.3s" }}
              >
                RESPONSIBILITY.
              </span>
            </h1>
            <p
              className="text-muted-foreground text-lg mb-8 max-w-md animate-fade-in opacity-0"
              style={{ animationDelay: "0.5s" }}
            >
              Give your team a meaningful benefit. CounterCart for Teams lets
              employees offset their purchases with donations to causes they care
              about. You get automated CSR reporting. They get Premium access.
            </p>
            <Link
              href="/signup?source=teams&plan=team"
              className="inline-flex items-center gap-4 bg-primary text-primary-foreground px-8 py-4 headline text-xl tracking-wider border-[3px] border-primary hover:bg-accent hover:border-accent hover:text-accent-foreground transition-all animate-fade-in opacity-0 group"
              style={{ animationDelay: "0.7s" }}
            >
              START YOUR TEAM
              <ArrowRight className="h-6 w-6 group-hover:translate-x-1 transition-transform" />
            </Link>
            <p
              className="mt-4 animate-fade-in opacity-0"
              style={{ animationDelay: "0.9s" }}
            >
              <span className="text-accent font-bold">$3/seat/month</span>
              <span className="text-muted-foreground"> | Premium features for everyone</span>
            </p>
          </div>
          <div className="hidden lg:flex justify-center items-center">
            <div className="relative">
              {/* Team visualization */}
              <div className="grid grid-cols-3 gap-4">
                {[...Array(9)].map((_, i) => (
                  <div
                    key={i}
                    className="w-20 h-20 bg-card border-2 border-primary flex items-center justify-center headline text-2xl hover:bg-accent transition-colors"
                    style={{ animationDelay: `${0.1 * i}s` }}
                  >
                    {["$", "12", "$", "8", "$", "15", "$", "5", "$"][i]}
                  </div>
                ))}
              </div>
              {/* Impact stamp */}
              <div className="absolute -bottom-6 -right-6 bg-accent px-6 py-4 headline text-xl tracking-wider border-4 border-primary shadow-brutal-lg -rotate-6">
                $40 THIS WEEK
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
                MEANINGFUL EMPLOYEE BENEFIT <span className="text-sm">◆</span>
              </span>
              <span className="headline text-xl px-8 whitespace-nowrap flex items-center gap-4">
                AUTOMATED CSR TRACKING <span className="text-sm">◆</span>
              </span>
              <span className="headline text-xl px-8 whitespace-nowrap flex items-center gap-4">
                TAX-DEDUCTIBLE GIVING <span className="text-sm">◆</span>
              </span>
              <span className="headline text-xl px-8 whitespace-nowrap flex items-center gap-4">
                VALUES-DRIVEN WORKPLACE <span className="text-sm">◆</span>
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 px-4 md:px-8">
        <div className="container mx-auto">
          <div className="mb-16">
            <span className="text-muted-foreground text-sm tracking-widest">
              Why Teams Love It
            </span>
            <h2 className="headline text-4xl md:text-5xl mt-2">
              BENEFITS FOR EVERYONE
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl">
            {benefits.map((benefit) => (
              <div
                key={benefit.title}
                className="p-8 bg-card border-2 border-primary hover:shadow-brutal transition-all hover:-translate-y-1"
              >
                <div className="w-12 h-12 bg-accent border-2 border-primary flex items-center justify-center mb-4">
                  <benefit.icon className="h-6 w-6" />
                </div>
                <h3 className="headline text-xl mb-3">{benefit.title}</h3>
                <p className="text-muted-foreground">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 px-4 md:px-8 bg-primary text-primary-foreground">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <span className="text-accent text-sm tracking-widest">
              Simple Pricing
            </span>
            <h2 className="headline text-4xl md:text-5xl mt-2">
              ONE PLAN. PER SEAT.
            </h2>
          </div>

          <div className="max-w-lg mx-auto">
            <div className="bg-white/5 border border-white/10 p-8">
              <div className="flex items-baseline gap-2 mb-4">
                <span className="headline text-6xl text-accent">$3</span>
                <span className="text-muted-gray">/seat/month</span>
              </div>

              <ul className="space-y-4 mb-8">
                <li className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-accent flex items-center justify-center">
                    <Check className="h-4 w-4 text-accent-foreground" />
                  </div>
                  <span>Premium features for every team member</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-accent flex items-center justify-center">
                    <Check className="h-4 w-4 text-accent-foreground" />
                  </div>
                  <span>Unlimited bank connections</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-accent flex items-center justify-center">
                    <Check className="h-4 w-4 text-accent-foreground" />
                  </div>
                  <span>Auto-donation capabilities</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-accent flex items-center justify-center">
                    <Check className="h-4 w-4 text-accent-foreground" />
                  </div>
                  <span>Company admin dashboard</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-accent flex items-center justify-center">
                    <Check className="h-4 w-4 text-accent-foreground" />
                  </div>
                  <span>Quarterly CSR reports</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-accent flex items-center justify-center">
                    <Check className="h-4 w-4 text-accent-foreground" />
                  </div>
                  <span>Priority support</span>
                </li>
              </ul>

              <Link
                href="/signup?source=teams&plan=team"
                className="block w-full text-center bg-accent text-accent-foreground px-8 py-4 headline tracking-wider border-2 border-primary hover:translate-y-0.5 transition-all"
              >
                START YOUR TEAM
              </Link>

              <p className="text-center text-muted-gray text-sm mt-4">
                14-day free trial. Cancel anytime.
              </p>
            </div>
          </div>

          <div className="text-center mt-8">
            <p className="text-muted-gray">
              Enterprise needs? <Link href="mailto:teams@countercart.com" className="text-accent hover:underline">Contact us</Link> for custom pricing and features.
            </p>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-20 px-4 md:px-8">
        <div className="container mx-auto">
          <div className="mb-16">
            <span className="text-muted-foreground text-sm tracking-widest">
              Getting Started
            </span>
            <h2 className="headline text-4xl md:text-5xl mt-2">HOW IT WORKS</h2>
          </div>

          <div className="grid md:grid-cols-4 gap-6 max-w-5xl">
            <div className="p-6 bg-card border-2 border-primary">
              <div className="headline text-5xl text-accent mb-4">01</div>
              <h3 className="headline text-xl mb-2">CREATE TEAM</h3>
              <p className="text-muted-foreground text-sm">
                Sign up and create your organization. Takes 2 minutes.
              </p>
            </div>

            <div className="p-6 bg-card border-2 border-primary md:mt-8">
              <div className="headline text-5xl text-accent mb-4">02</div>
              <h3 className="headline text-xl mb-2">INVITE TEAM</h3>
              <p className="text-muted-foreground text-sm">
                Share your invite link. Employees join with their email.
              </p>
            </div>

            <div className="p-6 bg-card border-2 border-primary md:mt-16">
              <div className="headline text-5xl text-accent mb-4">03</div>
              <h3 className="headline text-xl mb-2">THEY CHOOSE</h3>
              <p className="text-muted-foreground text-sm">
                Each person picks causes that matter to them.
              </p>
            </div>

            <div className="p-6 bg-card border-2 border-primary md:mt-24">
              <div className="headline text-5xl text-accent mb-4">04</div>
              <h3 className="headline text-xl mb-2">YOU REPORT</h3>
              <p className="text-muted-foreground text-sm">
                Export aggregate impact data for CSR reporting.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-4 md:px-8 bg-muted border-y-[3px] border-primary">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <span className="text-muted-foreground text-sm tracking-widest">
              Common Questions
            </span>
            <h2 className="headline text-4xl md:text-5xl mt-2">FAQ</h2>
          </div>

          <div className="max-w-2xl mx-auto space-y-6">
            {faqs.map((faq, i) => (
              <div
                key={i}
                className="bg-card border-2 border-primary p-6 hover:shadow-brutal-sm transition-all"
              >
                <h3 className="headline text-lg mb-2">{faq.q}</h3>
                <p className="text-muted-foreground">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-4 md:px-8 text-center">
        <div className="container mx-auto max-w-2xl">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="h-6 w-6 text-accent" />
            <span className="text-sm uppercase tracking-wider text-muted-foreground">
              Values-Driven Culture
            </span>
          </div>
          <h2 className="headline text-5xl md:text-6xl mb-4">
            MAKE GIVING PART OF WORK.
          </h2>
          <p className="text-muted-foreground text-lg mb-10">
            Start your team today. Premium access for everyone, CSR reporting for you.
          </p>
          <Link
            href="/signup?source=teams&plan=team"
            className="inline-flex items-center gap-4 bg-accent text-accent-foreground px-10 py-5 headline text-xl tracking-wider border-[3px] border-primary shadow-brutal hover:translate-x-1 hover:translate-y-1 hover:shadow-brutal-sm transition-all group"
          >
            START YOUR TEAM
            <ArrowRight className="h-6 w-6 group-hover:translate-x-1 transition-transform" />
          </Link>
          <p className="mt-6 text-muted-foreground text-sm">
            $3/seat/month. 14-day free trial. Cancel anytime.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-primary text-primary-foreground py-10 px-4 md:px-8">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left">
            <div className="headline text-xl tracking-wider mb-1">COUNTERCART</div>
            <p className="text-muted-gray text-sm">
              Corporate giving, <span className="text-accent">simplified.</span>
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-6">
            <Link href="/" className="text-sm hover:text-accent transition-colors">
              For Individuals
            </Link>
            <Link
              href="/for-teams"
              className="text-sm text-accent"
            >
              For Teams
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
