import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy - CounterCart",
  description: "How CounterCart collects, uses, and protects your data",
};

export default function PrivacyPage() {
  return (
    <article className="prose prose-gray dark:prose-invert max-w-none">
      <h1>Privacy Policy</h1>
      <p className="lead">
        Last updated: {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
      </p>

      <p>
        CounterCart (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) is committed to protecting your privacy.
        This Privacy Policy explains how we collect, use, and safeguard your information when you use our service.
      </p>

      <h2>Information We Collect</h2>

      <h3>Account Information</h3>
      <p>When you create an account, we collect:</p>
      <ul>
        <li>Email address</li>
        <li>Name (optional)</li>
      </ul>

      <h3>Financial Information</h3>
      <p>
        When you connect your bank account through Plaid, we receive <strong>read-only</strong> access to:
      </p>
      <ul>
        <li>Transaction history (merchant names, amounts, dates)</li>
        <li>Account balances and metadata</li>
      </ul>
      <p>
        <strong>We never receive or store your bank login credentials.</strong> Plaid handles all authentication
        directly with your financial institution.
      </p>

      <h3>Payment Information</h3>
      <p>
        Payment processing is handled by Stripe. We do not store your credit card numbers.
        We receive only the last 4 digits for display purposes and subscription status.
      </p>

      <h2>How We Use Your Information</h2>
      <p>We use your information to:</p>
      <ul>
        <li>Identify transactions at businesses you&apos;ve chosen to offset</li>
        <li>Calculate and suggest donation amounts</li>
        <li>Process donations through Every.org</li>
        <li>Send you notifications about your account and donations</li>
        <li>Provide customer support</li>
        <li>Improve our service</li>
      </ul>

      <h2>Data Sharing</h2>
      <p>We share your information only with:</p>
      <ul>
        <li><strong>Plaid</strong> - to connect to your bank account</li>
        <li><strong>Stripe</strong> - to process subscription payments</li>
        <li><strong>Every.org</strong> - to process charitable donations</li>
        <li><strong>Resend</strong> - to send transactional emails</li>
      </ul>
      <p>We do not sell your personal information to third parties.</p>

      <h2>Data Security</h2>
      <p>We implement industry-standard security measures including:</p>
      <ul>
        <li>AES-256 encryption for sensitive data at rest</li>
        <li>TLS encryption for all data in transit</li>
        <li>Regular security audits</li>
        <li>Limited employee access to user data</li>
      </ul>

      <h2>Data Retention</h2>
      <p>
        We retain your data for as long as your account is active. You can request deletion of your
        account and all associated data at any time through the Settings page.
      </p>

      <h2>Your Rights</h2>
      <p>You have the right to:</p>
      <ul>
        <li><strong>Access</strong> - Export all your data from Settings</li>
        <li><strong>Correction</strong> - Update your information in Settings</li>
        <li><strong>Deletion</strong> - Delete your account and all data</li>
        <li><strong>Portability</strong> - Download your data in JSON format</li>
      </ul>

      <h2>Cookies</h2>
      <p>
        We use essential cookies for authentication and session management. We use Fathom Analytics
        for privacy-friendly, cookie-free analytics.
      </p>

      <h2>Children&apos;s Privacy</h2>
      <p>
        CounterCart is not intended for users under 18. We do not knowingly collect information
        from children.
      </p>

      <h2>Changes to This Policy</h2>
      <p>
        We may update this Privacy Policy from time to time. We will notify you of any material
        changes by email or through the app.
      </p>

      <h2>Contact Us</h2>
      <p>
        If you have questions about this Privacy Policy, please contact us at{" "}
        <a href="mailto:privacy@countercart.app">privacy@countercart.app</a>.
      </p>
    </article>
  );
}
