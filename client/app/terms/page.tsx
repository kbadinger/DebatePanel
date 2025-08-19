export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-xl shadow-lg p-8 border border-slate-100">
          <h1 className="text-3xl font-bold text-slate-900 mb-6">Terms of Service</h1>
          <p className="text-slate-600 mb-8">Last updated: January 19, 2025</p>
          
          <div className="prose prose-slate max-w-none">
            <h2>1. Acceptance of Terms</h2>
            <p>
              By accessing and using DebatePanel ("the Service"), you accept and agree to be bound by the terms and provision of this agreement.
            </p>

            <h2>2. Description of Service</h2>
            <p>
              DebatePanel is an AI-powered platform that facilitates structured debates between multiple artificial intelligence models to help users explore different perspectives and reach informed conclusions on various topics.
            </p>

            <h2>3. User Accounts</h2>
            <p>
              To use certain features of the Service, you must register for an account. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.
            </p>

            <h2>4. Acceptable Use</h2>
            <p>You agree not to use the Service to:</p>
            <ul>
              <li>Engage in any illegal activities or promote harmful content</li>
              <li>Attempt to circumvent usage limits or payment requirements</li>
              <li>Interfere with or disrupt the Service or servers</li>
              <li>Use the Service for any commercial purpose without authorization</li>
              <li>Share account credentials with others</li>
            </ul>

            <h2>5. Content Policy</h2>
            <p>
              While DebatePanel encourages thoughtful discussion of complex and sometimes controversial topics for educational purposes, we prohibit content that:
            </p>
            <ul>
              <li>Promotes illegal activities or direct harm to individuals</li>
              <li>Contains explicit hate speech or harassment</li>
              <li>Involves exploitation of minors in any form</li>
              <li>Violates intellectual property rights</li>
            </ul>
            <p>
              Topics involving sensitive social, political, or cultural themes are permitted when discussed in good faith for educational purposes.
            </p>

            <h2>6. Subscription and Billing</h2>
            <p>
              Our Service offers both free and paid subscription plans. Paid subscriptions provide additional credits for AI model usage. All billing is handled securely through Stripe. You may cancel your subscription at any time.
            </p>

            <h2>7. Credits and Usage</h2>
            <p>
              Credits are used to pay for AI model usage during debates. Credits expire according to your subscription plan terms. Unused credits may roll over according to your plan limits.
            </p>

            <h2>8. Privacy and Data</h2>
            <p>
              Your privacy is important to us. Please review our Privacy Policy for information about how we collect, use, and protect your data.
            </p>

            <h2>9. AI-Generated Content</h2>
            <p>
              The Service uses third-party AI models to generate debate content. We do not guarantee the accuracy, completeness, or reliability of AI-generated responses. Users should verify important information independently.
            </p>

            <h2>10. Limitation of Liability</h2>
            <p>
              DebatePanel is provided "as is" without warranties of any kind. We shall not be liable for any damages arising from your use of the Service, including but not limited to direct, indirect, incidental, or consequential damages.
            </p>

            <h2>11. Termination</h2>
            <p>
              We may terminate or suspend your account at any time for violation of these terms. You may terminate your account at any time by contacting us or canceling your subscription.
            </p>

            <h2>12. Changes to Terms</h2>
            <p>
              We reserve the right to modify these terms at any time. Users will be notified of significant changes via email or through the Service.
            </p>

            <h2>13. Contact Information</h2>
            <p>
              For questions about these Terms of Service, please contact us at support@debatepanel.com.
            </p>

            <h2>14. Governing Law</h2>
            <p>
              These terms shall be governed by and construed in accordance with the laws of the United States and the State of Pennsylvania.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}