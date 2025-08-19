export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-xl shadow-lg p-8 border border-slate-100">
          <h1 className="text-3xl font-bold text-slate-900 mb-6">Privacy Policy</h1>
          <p className="text-slate-600 mb-8">Last updated: January 19, 2025</p>
          
          <div className="prose prose-slate max-w-none">
            <h2>1. Information We Collect</h2>
            
            <h3>Account Information</h3>
            <p>When you create an account, we collect:</p>
            <ul>
              <li>Email address</li>
              <li>Name (optional)</li>
              <li>Password (encrypted)</li>
              <li>OAuth provider information (if using Google/GitHub login)</li>
            </ul>

            <h3>Usage Data</h3>
            <p>We automatically collect:</p>
            <ul>
              <li>Debate topics and descriptions you create</li>
              <li>AI model selections and configuration preferences</li>
              <li>Usage statistics and credit consumption</li>
              <li>Technical logs for service improvement</li>
            </ul>

            <h3>Payment Information</h3>
            <p>
              Payment processing is handled by Stripe. We do not store your credit card information directly. 
              We receive limited information from Stripe including customer ID and subscription status.
            </p>

            <h2>2. How We Use Your Information</h2>
            <p>We use your information to:</p>
            <ul>
              <li>Provide and maintain the DecisionForge service</li>
              <li>Process subscription payments and manage accounts</li>
              <li>Send important service announcements and updates</li>
              <li>Improve our service through usage analytics</li>
              <li>Provide customer support</li>
            </ul>

            <h2>3. AI Model Integration</h2>
            <p>
              Your debate topics and content are sent to third-party AI providers (OpenAI, Anthropic, Google, etc.) 
              to generate responses. Each provider has their own privacy policies and data handling practices. 
              We recommend reviewing their policies if you have concerns about specific content.
            </p>

            <h2>4. Data Sharing</h2>
            <p>We do not sell or rent your personal information. We may share data in limited circumstances:</p>
            <ul>
              <li><strong>AI Providers:</strong> Debate content is sent to selected AI providers for processing</li>
              <li><strong>Service Providers:</strong> Stripe for payment processing, hosting providers for infrastructure</li>
              <li><strong>Legal Requirements:</strong> If required by law or to protect our rights</li>
            </ul>

            <h2>5. Data Security</h2>
            <p>
              We implement appropriate security measures to protect your information, including:
            </p>
            <ul>
              <li>Encrypted password storage</li>
              <li>Secure HTTPS connections</li>
              <li>Regular security audits</li>
              <li>Limited access to personal data by staff</li>
            </ul>

            <h2>6. Data Retention</h2>
            <p>
              We retain your account information as long as your account is active. Debate history is retained 
              to provide you access to past discussions. You may request deletion of your data by contacting us.
            </p>

            <h2>7. Your Rights</h2>
            <p>You have the right to:</p>
            <ul>
              <li>Access and review your personal data</li>
              <li>Correct inaccurate information</li>
              <li>Request deletion of your account and data</li>
              <li>Export your debate history</li>
              <li>Opt out of non-essential communications</li>
            </ul>

            <h2>8. Cookies and Tracking</h2>
            <p>
              We use essential cookies for authentication and service functionality. We do not use tracking 
              cookies for advertising purposes. You may disable cookies in your browser, though this may 
              affect service functionality.
            </p>

            <h2>9. Third-Party Services</h2>
            <p>Our service integrates with:</p>
            <ul>
              <li><strong>Stripe:</strong> Payment processing (subject to Stripe's privacy policy)</li>
              <li><strong>AI Providers:</strong> OpenAI, Anthropic, Google, etc. (subject to their respective policies)</li>
              <li><strong>OAuth Providers:</strong> Google, GitHub for authentication (subject to their policies)</li>
            </ul>

            <h2>10. International Users</h2>
            <p>
              DebatePanel is operated from the United States. If you are accessing the service from outside 
              the US, your information may be transferred to and processed in the United States.
            </p>

            <h2>11. Children's Privacy</h2>
            <p>
              Our service is not intended for children under 13. We do not knowingly collect personal 
              information from children under 13. If you become aware that a child has provided us with 
              personal information, please contact us.
            </p>

            <h2>12. Changes to Privacy Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify users of significant 
              changes via email or through the service.
            </p>

            <h2>13. Contact Us</h2>
            <p>
              If you have questions about this Privacy Policy or our data practices, please contact us at:
              <br />
              Email: privacy@debatepanel.com
              <br />
              Address: [Your Business Address]
            </p>

            <h2>14. Effective Date</h2>
            <p>
              This Privacy Policy is effective as of January 19, 2025.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}