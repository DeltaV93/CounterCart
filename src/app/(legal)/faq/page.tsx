import { Metadata } from "next";

export const metadata: Metadata = {
  title: "FAQ - CounterCart",
  description: "Frequently asked questions about CounterCart",
};

const faqs = [
  {
    category: "Getting Started",
    questions: [
      {
        q: "What is CounterCart?",
        a: "CounterCart is a service that helps you offset your purchases with donations to causes you care about. When you shop at businesses that don't align with your values, we suggest a donation to a charity that supports the opposite cause.",
      },
      {
        q: "How does it work?",
        a: "Connect your bank account (read-only), choose the causes you care about, and set your preferences. We'll monitor your transactions and suggest donations based on your settings. You approve each donation before it's processed.",
      },
      {
        q: "Is it free?",
        a: "Yes! Our free tier includes 1 bank connection, 2 causes, and up to $25/month in suggested donations. Premium ($4.99/month) unlocks unlimited causes, auto-donations, and more.",
      },
    ],
  },
  {
    category: "Security & Privacy",
    questions: [
      {
        q: "Is my bank information secure?",
        a: "Absolutely. We use Plaid, the same service used by Venmo, Robinhood, and thousands of other apps. We only have read-only access to your transactions — we can never move money or make changes to your accounts.",
      },
      {
        q: "Do you store my bank login credentials?",
        a: "No. Your bank credentials are entered directly on Plaid's secure servers. We never see or store your username or password.",
      },
      {
        q: "Can I delete my data?",
        a: "Yes. You can export all your data and delete your account at any time from the Settings page. When you delete your account, all your data is permanently removed.",
      },
      {
        q: "Do you sell my data?",
        a: "Never. We don't sell your personal information to anyone. See our Privacy Policy for full details.",
      },
    ],
  },
  {
    category: "Donations",
    questions: [
      {
        q: "How are donations processed?",
        a: "All donations are processed through Every.org, a 501(c)(3) nonprofit. When you click 'Donate', you're redirected to Every.org to complete the donation with your own payment method.",
      },
      {
        q: "Are donations tax-deductible?",
        a: "Yes! All donations through Every.org are tax-deductible. You'll receive a tax receipt from Every.org for each donation. Premium users can also export a tax summary for the year.",
      },
      {
        q: "Can I cancel a donation?",
        a: "You can cancel pending donations before they're completed. Once a donation is processed through Every.org, it cannot be refunded through CounterCart. Contact the charity directly for refund requests.",
      },
      {
        q: "How is the donation amount calculated?",
        a: "By default, we round up each matched transaction to the nearest dollar. You can also set a multiplier (2x, 3x, 5x) to increase your impact. A $4.50 purchase would suggest a $0.50 donation at 1x, or $1.00 at 2x.",
      },
    ],
  },
  {
    category: "Matching & Causes",
    questions: [
      {
        q: "How do you match transactions to causes?",
        a: "We maintain a database of businesses and their associated causes. When you make a purchase at a matched business, we suggest a donation to a charity supporting the related cause. For example, a purchase at a company with poor labor practices might suggest a donation to a worker advocacy organization.",
      },
      {
        q: "Can I choose which charities receive my donations?",
        a: "Free users receive donations to our default charity for each cause. Premium users can select their preferred charity from our curated list for each cause they support.",
      },
      {
        q: "What if a transaction is matched incorrectly?",
        a: "You're always in control. If you don't want to offset a particular transaction, simply don't approve the suggested donation. We're constantly improving our matching accuracy.",
      },
    ],
  },
  {
    category: "Account & Billing",
    questions: [
      {
        q: "How do I upgrade to Premium?",
        a: "Go to Settings and click 'Upgrade to Premium'. You'll be redirected to Stripe to enter your payment information. Premium is $4.99/month and can be cancelled anytime.",
      },
      {
        q: "How do I cancel my subscription?",
        a: "Go to Settings and click 'Manage Subscription'. You'll be taken to the Stripe billing portal where you can cancel. You'll keep Premium access until the end of your current billing period.",
      },
      {
        q: "How do I disconnect my bank account?",
        a: "Go to Settings and find your connected bank account. Click the disconnect button to remove it. Note: This will stop transaction monitoring for that account.",
      },
    ],
  },
];

export default function FAQPage() {
  return (
    <div>
      <h1 className="text-4xl font-bold tracking-tight mb-4">
        Frequently Asked Questions
      </h1>
      <p className="text-muted-foreground mb-12">
        Find answers to common questions about CounterCart.
      </p>

      <div className="space-y-12">
        {faqs.map((section) => (
          <section key={section.category}>
            <h2 className="text-2xl font-semibold mb-6 pb-2 border-b">
              {section.category}
            </h2>
            <div className="space-y-6">
              {section.questions.map((faq, index) => (
                <div key={index}>
                  <h3 className="font-medium text-lg mb-2">{faq.q}</h3>
                  <p className="text-muted-foreground">{faq.a}</p>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="mt-16 p-6 bg-muted rounded-lg">
        <h2 className="text-xl font-semibold mb-2">Still have questions?</h2>
        <p className="text-muted-foreground">
          Contact us at{" "}
          <a
            href="mailto:support@countercart.app"
            className="text-primary hover:underline"
          >
            support@countercart.app
          </a>{" "}
          and we&apos;ll get back to you within 24 hours.
        </p>
      </div>
    </div>
  );
}
