// API endpoint for handling password reset requests with Azure AD B2C
import { azureConfig } from '../../../lib/config/azure-config';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  try {
    // Azure AD B2C password reset flow
    const resetUrl = await initiatePasswordReset(email);
    
    // Log the password reset attempt (for security monitoring)
    console.log(`Password reset initiated for email: ${email}`);
    
    return res.status(200).json({ 
      message: 'Password reset email sent successfully',
      resetUrl: resetUrl // In production, this would be sent via email
    });
  } catch (error) {
    console.error('Password reset error:', error);
    
    // Don't reveal whether the email exists or not for security
    return res.status(200).json({ 
      message: 'If an account with that email exists, a password reset link has been sent.'
    });
  }
}

async function initiatePasswordReset(email) {
  try {
    // Azure AD B2C password reset policy endpoint
    const tenantName = process.env.AZURE_AD_B2C_TENANT_NAME;
    const policyName = process.env.AZURE_AD_B2C_PASSWORD_RESET_POLICY || 'B2C_1_password_reset';
    const clientId = process.env.AZURE_AD_B2C_CLIENT_ID;
    const redirectUri = process.env.NEXTAUTH_URL + '/auth/reset-password-callback';

    // Construct the password reset URL
    const resetUrl = `https://${tenantName}.b2clogin.com/${tenantName}.onmicrosoft.com/${policyName}/oauth2/v2.0/authorize?` +
      `client_id=${clientId}&` +
      `response_type=code&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_mode=query&` +
      `scope=openid&` +
      `state=${generateState()}&` +
      `login_hint=${encodeURIComponent(email)}`;

    // In a real implementation, you would:
    // 1. Send an email with the reset link
    // 2. Store the reset token in your database with expiration
    // 3. Return success without revealing the actual URL

    // For now, we'll simulate sending an email
    await sendPasswordResetEmail(email, resetUrl);
    
    return resetUrl;
  } catch (error) {
    console.error('Error initiating password reset:', error);
    throw new Error('Failed to initiate password reset');
  }
}

async function sendPasswordResetEmail(email, resetUrl) {
  // In production, integrate with Azure Communication Services or SendGrid
  // For now, we'll just log the email content
  
  const emailContent = {
    to: email,
    subject: 'Reset Your Movie Inferno Password',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #1f2937 0%, #111827 100%); padding: 30px; border-radius: 10px; text-align: center;">
          <h1 style="color: #ef4444; margin: 0 0 20px 0; font-size: 32px;">Movie Inferno</h1>
          <h2 style="color: #ffffff; margin: 0 0 30px 0;">Reset Your Password</h2>
          
          <div style="background: #374151; padding: 25px; border-radius: 8px; margin: 20px 0;">
            <p style="color: #d1d5db; margin: 0 0 20px 0; font-size: 16px;">
              We received a request to reset your password for your Movie Inferno account.
            </p>
            
            <a href="${resetUrl}" 
               style="display: inline-block; background: #ef4444; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0;">
              Reset Password
            </a>
            
            <p style="color: #9ca3af; margin: 20px 0 0 0; font-size: 14px;">
              This link will expire in 24 hours for security reasons.
            </p>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #4b5563;">
            <p style="color: #9ca3af; margin: 0; font-size: 14px;">
              If you didn't request this password reset, please ignore this email or contact support if you have concerns.
            </p>
            <p style="color: #6b7280; margin: 10px 0 0 0; font-size: 12px;">
              This is an automated message, please do not reply to this email.
            </p>
          </div>
        </div>
        
        <div style="text-align: center; margin-top: 20px;">
          <p style="color: #6b7280; font-size: 12px; margin: 0;">
            © 2024 Movie Inferno. All rights reserved.
          </p>
        </div>
      </body>
      </html>
    `,
    text: `
      Movie Inferno - Reset Your Password
      
      We received a request to reset your password for your Movie Inferno account.
      
      Click the following link to reset your password:
      ${resetUrl}
      
      This link will expire in 24 hours for security reasons.
      
      If you didn't request this password reset, please ignore this email or contact support if you have concerns.
      
      © 2024 Movie Inferno. All rights reserved.
    `
  };

  // Log email content for development
  console.log('Password reset email would be sent:', emailContent);
  
  // TODO: Integrate with actual email service
  // Example with Azure Communication Services:
  /*
  const { EmailClient } = require('@azure/communication-email');
  const emailClient = new EmailClient(process.env.AZURE_COMMUNICATION_CONNECTION_STRING);
  
  await emailClient.beginSend({
    senderAddress: process.env.AZURE_COMMUNICATION_SENDER_EMAIL,
    content: {
      subject: emailContent.subject,
      html: emailContent.html,
      plainText: emailContent.text
    },
    recipients: {
      to: [{ address: email }]
    }
  });
  */
  
  return true;
}

function generateState() {
  // Generate a random state parameter for CSRF protection
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

// Rate limiting helper (implement with Redis in production)
const resetAttempts = new Map();

function checkRateLimit(email) {
  const now = Date.now();
  const attempts = resetAttempts.get(email) || [];
  
  // Remove attempts older than 1 hour
  const recentAttempts = attempts.filter(time => now - time < 3600000);
  
  // Allow max 3 attempts per hour
  if (recentAttempts.length >= 3) {
    return false;
  }
  
  recentAttempts.push(now);
  resetAttempts.set(email, recentAttempts);
  
  return true;
}