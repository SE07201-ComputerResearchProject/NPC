import nodemailer from 'nodemailer';

// Lazy singleton — created on first use so dotenv has already loaded by then.
let _transporter = null;
function getTransporter() {
  if (!_transporter) {
    _transporter = nodemailer.createTransport({
      service: 'gmail',
      pool: true,
      maxConnections: 3,
      maxMessages: 100,
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }
  return _transporter;
}

export async function warmUpEmailTransport() {
  const user = String(process.env.EMAIL_USER || '').trim();
  const pass = String(process.env.EMAIL_PASS || '').trim();
  if (!user || !pass) {
    return false;
  }

  try {
    await getTransporter().verify();
    return true;
  } catch (error) {
    console.warn('Email transport warm-up failed:', error.message);
    return false;
  }
}

export async function sendOtpEmail(toEmail, otp) {
  const issuer = String(process.env.MFA_ISSUER || 'Breaking Bad Builder').trim();

  await getTransporter().sendMail({
    from: `"${issuer}" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: `[${issuer}] Your Login Verification Code`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;">
        <h2 style="color:#0d6efd;margin-bottom:8px;">${issuer}</h2>
        <p style="color:#333;margin-bottom:16px;">Your login verification code is:</p>
        <div style="font-size:36px;font-weight:bold;letter-spacing:10px;color:#0d6efd;padding:16px 24px;background:#f0f4ff;border-radius:8px;display:inline-block;margin-bottom:16px;">${otp}</div>
        <p style="color:#666;font-size:13px;">This code expires in <strong>10 minutes</strong>.</p>
        <p style="color:#999;font-size:12px;">If you did not attempt to sign in, please ignore this email.</p>
      </div>
    `,
  });
}
