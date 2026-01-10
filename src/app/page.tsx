import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Heart,
  CreditCard,
  TrendingUp,
  Shield,
  ArrowRight,
  Leaf,
  Users,
  Sparkles,
} from "lucide-react";

const features = [
  {
    icon: CreditCard,
    title: "Automatic Detection",
    description:
      "Connect your bank and we'll automatically detect purchases at businesses that conflict with your values.",
  },
  {
    icon: Heart,
    title: "Offset with Purpose",
    description:
      "Turn every purchase into a force for good by donating to charities that support your chosen causes.",
  },
  {
    icon: TrendingUp,
    title: "Track Your Impact",
    description:
      "See exactly how much you've donated and the difference you're making with detailed impact reports.",
  },
  {
    icon: Shield,
    title: "Secure & Private",
    description:
      "Your data is protected with bank-level security. We use read-only access and never store your credentials.",
  },
];

const causes = [
  { name: "LGBTQ+ Rights", icon: Heart, color: "bg-pink-500" },
  { name: "Climate Action", icon: Leaf, color: "bg-green-500" },
  { name: "Racial Justice", icon: Users, color: "bg-orange-500" },
];

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary">
              <Heart className="h-4 w-4 text-white" />
            </div>
            <span className="font-semibold text-lg">CounterCart</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost">Sign in</Button>
            </Link>
            <Link href="/signup">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center max-w-3xl">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            Offset Your Purchases with{" "}
            <span className="text-primary">Purpose</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Automatically donate to causes you care about when you shop at
            businesses that don&apos;t align with your values. Turn every purchase
            into a force for good.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/signup">
              <Button size="lg" className="w-full sm:w-auto">
                Start Donating
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="#how-it-works">
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                Learn More
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Causes Preview */}
      <section className="py-12 px-4 bg-muted/50">
        <div className="container mx-auto text-center">
          <p className="text-sm text-muted-foreground mb-4">
            Support causes that matter to you
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            {causes.map((cause) => (
              <div
                key={cause.name}
                className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 rounded-full shadow-sm"
              >
                <div
                  className={`flex h-6 w-6 items-center justify-center rounded-full ${cause.color}`}
                >
                  <cause.icon className="h-3 w-3 text-white" />
                </div>
                <span className="font-medium text-sm">{cause.name}</span>
              </div>
            ))}
            <span className="text-muted-foreground">and more...</span>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mx-auto mb-4">
                <span className="text-xl font-bold text-primary">1</span>
              </div>
              <h3 className="font-semibold mb-2">Connect Your Bank</h3>
              <p className="text-muted-foreground">
                Securely link your bank account using Plaid. We only need read
                access to your transactions.
              </p>
            </div>
            <div className="text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mx-auto mb-4">
                <span className="text-xl font-bold text-primary">2</span>
              </div>
              <h3 className="font-semibold mb-2">Choose Your Causes</h3>
              <p className="text-muted-foreground">
                Select the causes you care about. We&apos;ll match businesses to
                relevant charities automatically.
              </p>
            </div>
            <div className="text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mx-auto mb-4">
                <span className="text-xl font-bold text-primary">3</span>
              </div>
              <h3 className="font-semibold mb-2">Donate Weekly</h3>
              <p className="text-muted-foreground">
                Each week, review and approve your offset donations. Premium users
                can automate this.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 bg-muted/50">
        <div className="container mx-auto max-w-5xl">
          <h2 className="text-3xl font-bold text-center mb-12">Features</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {features.map((feature) => (
              <Card key={feature.title}>
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <feature.icon className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold text-center mb-4">Simple Pricing</h2>
          <p className="text-center text-muted-foreground mb-12">
            Start free, upgrade when you&apos;re ready for more
          </p>
          <div className="grid md:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <CardTitle>Free</CardTitle>
                <CardDescription>Perfect for getting started</CardDescription>
                <div className="text-3xl font-bold">$0</div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <Heart className="h-4 w-4 text-primary" />
                    1 bank connection
                  </li>
                  <li className="flex items-center gap-2">
                    <Heart className="h-4 w-4 text-primary" />2 causes
                  </li>
                  <li className="flex items-center gap-2">
                    <Heart className="h-4 w-4 text-primary" />
                    $25/month limit
                  </li>
                  <li className="flex items-center gap-2">
                    <Heart className="h-4 w-4 text-primary" />
                    Manual donation approval
                  </li>
                </ul>
                <Link href="/signup" className="block mt-6">
                  <Button className="w-full" variant="outline">
                    Get Started Free
                  </Button>
                </Link>
              </CardContent>
            </Card>
            <Card className="border-primary">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CardTitle>Premium</CardTitle>
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
                <CardDescription>For maximum impact</CardDescription>
                <div className="text-3xl font-bold">
                  $4.99<span className="text-lg font-normal">/month</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <Heart className="h-4 w-4 text-primary" />3 bank connections
                  </li>
                  <li className="flex items-center gap-2">
                    <Heart className="h-4 w-4 text-primary" />
                    Unlimited causes
                  </li>
                  <li className="flex items-center gap-2">
                    <Heart className="h-4 w-4 text-primary" />
                    No monthly limit
                  </li>
                  <li className="flex items-center gap-2">
                    <Heart className="h-4 w-4 text-primary" />
                    Auto-weekly donations
                  </li>
                  <li className="flex items-center gap-2">
                    <Heart className="h-4 w-4 text-primary" />
                    Tax summary export
                  </li>
                </ul>
                <Link href="/signup" className="block mt-6">
                  <Button className="w-full">Start Premium Trial</Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-primary text-primary-foreground">
        <div className="container mx-auto text-center max-w-2xl">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Make a Difference?
          </h2>
          <p className="text-lg opacity-90 mb-8">
            Join thousands of people turning their everyday purchases into
            positive change.
          </p>
          <Link href="/signup">
            <Button size="lg" variant="secondary">
              Create Your Account
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 px-4">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary">
              <Heart className="h-3 w-3 text-white" />
            </div>
            <span className="font-semibold">CounterCart</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} CounterCart. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
