import { Resend } from 'resend';

if (!process.env.RESEND_API_KEY) {
  console.warn('RESEND_API_KEY is not set - email functionality will be disabled');
}

export const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export const EMAIL_CONFIG = {
  from: process.env.EMAIL_FROM || 'DecisionForge <noreply@decisionforge.io>',
  replyTo: process.env.EMAIL_REPLY_TO || 'support@decisionforge.io',
  baseUrl: process.env.NEXTAUTH_URL || 'http://localhost:3000'
};

export async function sendPasswordResetEmail(email: string, token: string, name?: string) {
  if (!resend) {
    console.error('Resend not configured - cannot send password reset email');
    return { success: false, error: 'Email service not configured' };
  }

  const resetUrl = `${EMAIL_CONFIG.baseUrl}/reset-password?token=${token}`;
  
  try {
    const { data, error } = await resend.emails.send({
      from: EMAIL_CONFIG.from,
      to: [email],
      replyTo: EMAIL_CONFIG.replyTo,
      subject: 'Reset your DecisionForge password',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Reset Your Password</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">DecisionForge</h1>
              <p style="color: #e2e8f0; margin: 10px 0 0 0;">AI Decision Platform</p>
            </div>
            
            <div style="background: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              <h2 style="color: #1a202c; margin-top: 0;">Reset Your Password</h2>
              
              <p>Hi${name ? ` ${name}` : ''},</p>
              
              <p>You requested to reset your password for your DebatePanel account. Click the button below to create a new password:</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                  Reset Password
                </a>
              </div>
              
              <p>If the button doesn't work, copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #4a5568; background: #f7fafc; padding: 10px; border-radius: 4px; font-family: monospace;">
                ${resetUrl}
              </p>
              
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #718096; font-size: 14px;">
                <p><strong>Security Notice:</strong></p>
                <ul>
                  <li>This link will expire in 1 hour for security</li>
                  <li>If you didn't request this reset, you can safely ignore this email</li>
                  <li>For security, we never ask for passwords via email</li>
                </ul>
                
                <p style="margin-top: 20px;">
                  Need help? Contact us at <a href="mailto:${EMAIL_CONFIG.replyTo}" style="color: #667eea;">${EMAIL_CONFIG.replyTo}</a>
                </p>
              </div>
            </div>
          </body>
        </html>
      `,
      text: `
Reset Your DebatePanel Password

Hi${name ? ` ${name}` : ''},

You requested to reset your password for your DebatePanel account.

Click this link to reset your password: ${resetUrl}

This link will expire in 1 hour for security.

If you didn't request this reset, you can safely ignore this email.

Need help? Contact us at ${EMAIL_CONFIG.replyTo}

- The DebatePanel Team
      `
    });

    if (error) {
      console.error('Failed to send password reset email:', error);
      return { success: false, error: error.message };
    }

    console.log('Password reset email sent successfully:', data?.id);
    return { success: true, messageId: data?.id };
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return { success: false, error: 'Failed to send email' };
  }
}

export async function sendWelcomeEmail(email: string, name?: string) {
  if (!resend) {
    console.warn('Resend not configured - skipping welcome email');
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: EMAIL_CONFIG.from,
      to: [email],
      replyTo: EMAIL_CONFIG.replyTo,
      subject: 'Welcome to DebatePanel! Your $5 credits are ready',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Welcome to DebatePanel</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to DebatePanel!</h1>
              <p style="color: #e2e8f0; margin: 10px 0 0 0;">AI Consensus Engine</p>
            </div>
            
            <div style="background: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              <h2 style="color: #1a202c; margin-top: 0;">Your account is ready!</h2>
              
              <p>Hi${name ? ` ${name}` : ''},</p>
              
              <p>Welcome to DebatePanel! Your account has been created with <strong>$5 in free credits</strong> to get you started.</p>
              
              <div style="background: #f0fff4; border: 1px solid #9ae6b4; border-radius: 6px; padding: 20px; margin: 20px 0;">
                <h3 style="color: #276749; margin-top: 0;">What you can do with your credits:</h3>
                <ul style="color: #2d3748;">
                  <li>Run 5-15 debates with different AI models</li>
                  <li>Explore consensus-seeking vs adversarial debate styles</li>
                  <li>Get AI judge analysis on complex topics</li>
                  <li>Test controversial topics with our brave conversation system</li>
                </ul>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${EMAIL_CONFIG.baseUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                  Start Your First Debate
                </a>
              </div>
              
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #718096; font-size: 14px;">
                <p><strong>Quick Tips:</strong></p>
                <ul>
                  <li>Try both consensus-seeking (business mode) and adversarial (classical debate) styles</li>
                  <li>Our smart model selection helps you build balanced panels</li>
                  <li>Don't shy away from difficult topics - growth happens through hard conversations</li>
                </ul>
                
                <p style="margin-top: 20px;">
                  Questions? We're here to help: <a href="mailto:${EMAIL_CONFIG.replyTo}" style="color: #667eea;">${EMAIL_CONFIG.replyTo}</a>
                </p>
              </div>
            </div>
          </body>
        </html>
      `,
      text: `
Welcome to DebatePanel!

Hi${name ? ` ${name}` : ''},

Welcome to DebatePanel! Your account has been created with $5 in free credits to get you started.

What you can do with your credits:
- Run 5-15 debates with different AI models
- Explore consensus-seeking vs adversarial debate styles  
- Get AI judge analysis on complex topics
- Test controversial topics with our brave conversation system

Get started: ${EMAIL_CONFIG.baseUrl}

Quick Tips:
- Try both consensus-seeking (business mode) and adversarial (classical debate) styles
- Our smart model selection helps you build balanced panels
- Don't shy away from difficult topics - growth happens through hard conversations

Questions? We're here to help: ${EMAIL_CONFIG.replyTo}

- The DebatePanel Team
      `
    });

    if (error) {
      console.error('Failed to send welcome email:', error);
      return { success: false, error: error.message };
    }

    console.log('Welcome email sent successfully:', data?.id);
    return { success: true, messageId: data?.id };
  } catch (error) {
    console.error('Error sending welcome email:', error);
    return { success: false, error: 'Failed to send email' };
  }
}