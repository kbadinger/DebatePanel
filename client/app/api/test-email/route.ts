import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

export async function GET(req: NextRequest) {
  console.log('Testing email configuration...');
  
  // Check if API key exists
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      error: 'RESEND_API_KEY is not configured',
      hasKey: false,
      keyPreview: 'Not set'
    }, { status: 500 });
  }

  // Show first/last few chars of API key for verification (safely)
  const keyPreview = `${apiKey.substring(0, 7)}...${apiKey.substring(apiKey.length - 4)}`;
  
  try {
    // Initialize Resend
    const resend = new Resend(apiKey);
    
    // Try to send a test email
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'DecisionForge <noreply@app.decisionforge.io>',
      to: ['test@resend.dev'], // Resend's test email that always works
      subject: 'Test Email from DecisionForge',
      html: '<p>This is a test email to verify Resend is working correctly.</p>',
      text: 'This is a test email to verify Resend is working correctly.'
    });

    if (error) {
      console.error('Resend error:', error);
      return NextResponse.json({
        error: 'Failed to send test email',
        resendError: error,
        hasKey: true,
        keyPreview,
        emailFrom: process.env.EMAIL_FROM || 'DecisionForge <noreply@app.decisionforge.io>'
      }, { status: 500 });
    }

    console.log('Test email sent successfully:', data);
    return NextResponse.json({
      success: true,
      message: 'Test email sent successfully!',
      emailId: data?.id,
      hasKey: true,
      keyPreview,
      emailFrom: process.env.EMAIL_FROM || 'DecisionForge <noreply@app.decisionforge.io>',
      note: 'Check your Resend dashboard - you should see this email in the logs'
    });

  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json({
      error: 'Unexpected error while sending email',
      details: error.message,
      hasKey: true,
      keyPreview,
      emailFrom: process.env.EMAIL_FROM || 'DecisionForge <noreply@app.decisionforge.io>'
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    console.log('Attempting to send test email to:', email);
    
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        error: 'RESEND_API_KEY is not configured'
      }, { status: 500 });
    }

    const resend = new Resend(apiKey);
    
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'DecisionForge <noreply@app.decisionforge.io>',
      to: [email],
      subject: 'Test Email from DecisionForge',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Test Email Successful!</h2>
          <p>This is a test email from your DecisionForge installation.</p>
          <p>If you're seeing this, your email configuration is working correctly.</p>
          <hr />
          <p style="color: #666; font-size: 12px;">
            Configuration details:<br/>
            From: ${process.env.EMAIL_FROM || 'DecisionForge <noreply@app.decisionforge.io>'}<br/>
            Reply-To: ${process.env.EMAIL_REPLY_TO || 'support@app.decisionforge.io'}<br/>
            Base URL: ${process.env.NEXTAUTH_URL || 'http://localhost:3000'}
          </p>
        </div>
      `,
      text: 'Test Email Successful! This is a test email from your DecisionForge installation.'
    });

    if (error) {
      console.error('Failed to send test email:', error);
      return NextResponse.json({
        error: 'Failed to send test email',
        details: error
      }, { status: 500 });
    }

    console.log('Test email sent successfully to:', email, 'ID:', data?.id);
    return NextResponse.json({
      success: true,
      message: `Test email sent to ${email}!`,
      emailId: data?.id,
      checkResend: 'Check your Resend dashboard for delivery status'
    });

  } catch (error: any) {
    console.error('Unexpected error in test email:', error);
    return NextResponse.json({
      error: 'Unexpected error',
      details: error.message
    }, { status: 500 });
  }
}






