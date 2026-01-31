import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service - CounterCart",
  description: "Terms and conditions for using CounterCart",
};

export default function TermsPage() {
  return (
    <article className="prose prose-gray dark:prose-invert max-w-none">
      <h1>Terms of Service</h1>
      <p className="lead">
        Last updated: {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
      </p>

      <p>
        Please read these Terms of Service (&quot;Terms&quot;) carefully before using CounterCart.
        By using our service, you agree to be bound by these Terms.
      </p>

      <h2>1. Description of Service</h2>
      <p>
        CounterCart is a service that helps users offset their purchases by suggesting donations
        to charitable organizations. We connect to your bank account (read-only) to identify
        transactions and calculate suggested donation amounts based on your preferences.
      </p>

      <h2>2. Eligibility</h2>
      <p>To use CounterCart, you must:</p>
      <ul>
        <li>Be at least 18 years old</li>
        <li>Have a valid bank account</li>
        <li>Reside in the United States</li>
        <li>Provide accurate account information</li>
      </ul>

      <h2>3. Account Registration</h2>
      <p>
        You are responsible for maintaining the confidentiality of your account and for all
        activities that occur under your account. You agree to notify us immediately of any
        unauthorized use.
      </p>

      <h2>4. Bank Account Connection</h2>
      <p>
        By connecting your bank account through Plaid, you authorize us to retrieve your
        transaction data for the purpose of identifying offset opportunities. This access is
        read-only — we cannot initiate transactions or transfers from your account.
      </p>

      <h2>5. Donations</h2>
      <p>
        <strong>Donations are voluntary.</strong> CounterCart suggests donations based on your
        settings, but you choose when and whether to complete each donation.
      </p>
      <p>
        Donations are processed through Every.org, a 501(c)(3) organization. All donations are
        tax-deductible to the extent allowed by law. Tax receipts are provided by Every.org.
      </p>
      <p>
        <strong>Donations are final.</strong> Once a donation is completed through Every.org,
        it cannot be refunded through CounterCart. Contact the recipient charity directly for
        refund requests.
      </p>

      <h2>6. Subscription and Billing</h2>
      <p>
        CounterCart offers free and premium subscription tiers. Premium subscriptions are billed
        monthly through Stripe. You can cancel your subscription at any time from the Settings page.
      </p>
      <p>
        Subscription fees are non-refundable except as required by law. If you cancel, you&apos;ll
        retain premium access until the end of your current billing period.
      </p>

      <h2>7. User Conduct</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Use the service for any illegal purpose</li>
        <li>Attempt to gain unauthorized access to our systems</li>
        <li>Interfere with or disrupt the service</li>
        <li>Create multiple accounts to abuse free tier limits</li>
        <li>Use automated means to access the service without permission</li>
      </ul>

      <h2>8. Intellectual Property</h2>
      <p>
        CounterCart and its original content, features, and functionality are owned by us and
        are protected by copyright, trademark, and other intellectual property laws.
      </p>

      <h2>9. Third-Party Services</h2>
      <p>
        CounterCart integrates with third-party services including Plaid, Stripe, and Every.org.
        Your use of these services is subject to their respective terms and privacy policies.
      </p>

      <h2>10. Disclaimer of Warranties</h2>
      <p>
        THE SERVICE IS PROVIDED &quot;AS IS&quot; WITHOUT WARRANTIES OF ANY KIND. WE DO NOT GUARANTEE
        THAT THE SERVICE WILL BE UNINTERRUPTED, SECURE, OR ERROR-FREE.
      </p>
      <p>
        We are not a financial advisor. Transaction matching and donation suggestions are based on
        automated pattern matching and may not be 100% accurate.
      </p>

      <h2>11. Limitation of Liability</h2>
      <p>
        TO THE MAXIMUM EXTENT PERMITTED BY LAW, COUNTERCART SHALL NOT BE LIABLE FOR ANY INDIRECT,
        INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE OF THE SERVICE.
      </p>

      <h2>12. Indemnification</h2>
      <p>
        You agree to indemnify and hold harmless CounterCart from any claims, damages, or expenses
        arising from your use of the service or violation of these Terms.
      </p>

      <h2>13. Termination</h2>
      <p>
        We may terminate or suspend your account at any time for violation of these Terms. You may
        delete your account at any time from the Settings page.
      </p>

      <h2>14. Changes to Terms</h2>
      <p>
        We may update these Terms from time to time. We will notify you of material changes by
        email or through the app. Continued use after changes constitutes acceptance.
      </p>

      <h2>15. Governing Law</h2>
      <p>
        These Terms are governed by the laws of the State of Delaware, without regard to conflict
        of law principles.
      </p>

      <h2>16. Contact</h2>
      <p>
        For questions about these Terms, contact us at{" "}
        <a href="mailto:legal@countercart.app">legal@countercart.app</a>.
      </p>
    </article>
  );
}
