const getVerificationEmailTemplate = (firstName, verificationUrl) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Verify Your Email</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; color: #333; }
    .wrapper { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #C0392B 0%, #E74C3C 100%); padding: 48px 40px; text-align: center; }
    .header-icon { width: 72px; height: 72px; background: rgba(255,255,255,0.2); border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 20px; }
    .header h1 { color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px; }
    .header p { color: rgba(255,255,255,0.85); font-size: 15px; margin-top: 8px; }
    .body { padding: 48px 40px; }
    .greeting { font-size: 20px; font-weight: 600; color: #1a1a1a; margin-bottom: 16px; }
    .message { font-size: 15px; color: #555; line-height: 1.7; margin-bottom: 32px; }
    .btn-container { text-align: center; margin: 32px 0; }
    .btn { display: inline-block; background: linear-gradient(135deg, #C0392B 0%, #E74C3C 100%); color: #ffffff !important; text-decoration: none; padding: 16px 40px; border-radius: 12px; font-size: 16px; font-weight: 600; letter-spacing: 0.3px; }
    .divider { border: none; border-top: 1px solid #eee; margin: 32px 0; }
    .url-fallback { font-size: 13px; color: #777; line-height: 1.6; }
    .url-fallback a { color: #C0392B; word-break: break-all; }
    .footer { background: #f9f9f9; padding: 24px 40px; text-align: center; border-top: 1px solid #eee; }
    .footer p { font-size: 12px; color: #aaa; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <div class="header-icon">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.63A2 2 0 012 .18h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
        </svg>
      </div>
      <h1>Verify Your Email</h1>
      <p>One more step to complete your registration</p>
    </div>
    <div class="body">
      <p class="greeting">Hello, ${firstName}! 👋</p>
      <p class="message">
        Thank you for registering with the Learning Management System. To activate your account and start your learning journey, please verify your email address by clicking the button below.
      </p>
      <div class="btn-container">
        <a href="${verificationUrl}" class="btn">Verify My Email Address</a>
      </div>
      <p class="message" style="font-size:13px; color:#888;">
        This link will expire in <strong>24 hours</strong>. If you did not create an account, you can safely ignore this email.
      </p>
      <hr class="divider"/>
      <div class="url-fallback">
        <p>If the button above doesn't work, copy and paste this link into your browser:</p>
        <a href="${verificationUrl}">${verificationUrl}</a>
      </div>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} LMS System. All rights reserved.<br/>This is an automated message — please do not reply directly to this email.</p>
    </div>
  </div>
</body>
</html>
`;

module.exports = { getVerificationEmailTemplate };
