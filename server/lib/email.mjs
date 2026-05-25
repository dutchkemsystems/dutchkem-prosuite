import { Resend } from 'resend';

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const ALERT_EMAIL = process.env.ALERT_EMAIL || 'admin@dutchkem.com';
const FROM_EMAIL = process.env.FROM_EMAIL || 'security@dutchkem.com';

let resend = null;
if (RESEND_API_KEY) {
  resend = new Resend(RESEND_API_KEY);
}

function isConfigured() {
  return !!resend && !!RESEND_API_KEY;
}

/**
 * Send an email alert via Resend.
 * Falls back to console.log if Resend is not configured.
 */
async function sendAlert({ subject, html }) {
  if (!isConfigured()) {
    console.log(`[EMAIL-ALERT] ${subject}`);
    console.log(`[EMAIL-ALERT] To: ${ALERT_EMAIL}`);
    console.log(`[EMAIL-ALERT] Body: ${html.replace(/<[^>]*>/g, '').substring(0, 200)}...`);
    return { success: true, simulated: true, message: 'Resend not configured — logged to console' };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: `Dutchkem Security <${FROM_EMAIL}>`,
      to: [ALERT_EMAIL],
      subject,
      html,
    });

    if (error) {
      console.error('[EMAIL-ALERT] Resend error:', error);
      return { success: false, error: error.message };
    }

    console.log(`[EMAIL-ALERT] Sent: ${subject} (id: ${data?.id})`);
    return { success: true, id: data?.id };
  } catch (err) {
    console.error('[EMAIL-ALERT] Send failed:', err);
    return { success: false, error: err.message };
  }
}

// ── Alert Templates ──

export async function alertAdminLogin({ email, ip, userAgent, success }) {
  const status = success ? '✅ Successful' : '❌ Failed';
  const subject = `[Dutchkem] ${status} Admin Login — ${email}`;
  const html = `
    <h2>Admin Login ${success ? 'Successful' : 'Failed'}</h2>
    <table style="border-collapse:collapse;width:100%;max-width:500px;">
      <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Status</td>
          <td style="padding:8px;border:1px solid #ddd;">${status}</td></tr>
      <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Email</td>
          <td style="padding:8px;border:1px solid #ddd;">${email}</td></tr>
      <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">IP Address</td>
          <td style="padding:8px;border:1px solid #ddd;">${ip}</td></tr>
      <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">User Agent</td>
          <td style="padding:8px;border:1px solid #ddd;">${userAgent}</td></tr>
      <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Time</td>
          <td style="padding:8px;border:1px solid #ddd;">${new Date().toISOString()}</td></tr>
    </table>
    <p style="color:#666;font-size:12px;">Dutchkem Prosuite — Security Alert</p>
  `;
  return sendAlert({ subject, html });
}

export async function alertAdminLockout({ email, ip, failCount }) {
  const subject = `[Dutchkem] 🚨 Admin Account Locked — ${email}`;
  const html = `
    <h2 style="color:#d32f2f;">Admin Account Locked</h2>
    <p>An admin account has been locked due to excessive failed login attempts.</p>
    <table style="border-collapse:collapse;width:100%;max-width:500px;">
      <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Email</td>
          <td style="padding:8px;border:1px solid #ddd;">${email}</td></tr>
      <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">IP Address</td>
          <td style="padding:8px;border:1px solid #ddd;">${ip}</td></tr>
      <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Failed Attempts</td>
          <td style="padding:8px;border:1px solid #ddd;">${failCount}</td></tr>
      <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Lock Duration</td>
          <td style="padding:8px;border:1px solid #ddd;">60 minutes</td></tr>
      <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Time</td>
          <td style="padding:8px;border:1px solid #ddd;">${new Date().toISOString()}</td></tr>
    </table>
    <p style="color:#666;font-size:12px;">Dutchkem Prosuite — Security Alert</p>
  `;
  return sendAlert({ subject, html });
}

export async function alert2FABypass({ email, ip, userAgent }) {
  const subject = `[Dutchkem] ⚠️ 2FA Attempt — ${email}`;
  const html = `
    <h2>2FA Verification Attempt</h2>
    <table style="border-collapse:collapse;width:100%;max-width:500px;">
      <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Email</td>
          <td style="padding:8px;border:1px solid #ddd;">${email}</td></tr>
      <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">IP Address</td>
          <td style="padding:8px;border:1px solid #ddd;">${ip}</td></tr>
      <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">User Agent</td>
          <td style="padding:8px;border:1px solid #ddd;">${userAgent}</td></tr>
      <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Time</td>
          <td style="padding:8px;border:1px solid #ddd;">${new Date().toISOString()}</td></tr>
    </table>
    <p style="color:#666;font-size:12px;">Dutchkem Prosuite — Security Alert</p>
  `;
  return sendAlert({ subject, html });
}

export async function alertPasswordReset({ email, token }) {
  const resetUrl = `https://dutchkem.com/auth/reset-password?token=${token}`;
  const subject = `[Dutchkem] 🔐 Password Reset Request — ${email}`;
  const html = `
    <h2>Password Reset</h2>
    <p>We received a password reset request for your Dutchkem Prosuite account.</p>
    <p style="margin:24px 0;">
      <a href="${resetUrl}"
         style="background:#dc2626;color:#fff;padding:14px 28px;border-radius:12px;
                text-decoration:none;font-weight:bold;display:inline-block;">
        Reset Password
      </a>
    </p>
    <p>Or copy this link into your browser:</p>
    <p style="font-size:12px;color:#666;word-break:break-all;">${resetUrl}</p>
    <p style="color:#999;font-size:12px;margin-top:24px;">
      This link expires in 15 minutes. If you did not request this, ignore this email.
    </p>
    <p style="color:#666;font-size:12px;">Dutchkem Prosuite — Security Notice</p>
  `;
  return sendAlert({ subject, html });
}

export async function alertPasswordChange({ email, ip }) {
  const subject = `[Dutchkem] 🔑 Admin Password Changed — ${email}`;
  const html = `
    <h2>Admin Password Changed</h2>
    <table style="border-collapse:collapse;width:100%;max-width:500px;">
      <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Email</td>
          <td style="padding:8px;border:1px solid #ddd;">${email}</td></tr>
      <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">IP Address</td>
          <td style="padding:8px;border:1px solid #ddd;">${ip}</td></tr>
      <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Time</td>
          <td style="padding:8px;border:1px solid #ddd;">${new Date().toISOString()}</td></tr>
    </table>
    <p>If you did not make this change, contact your system administrator immediately.</p>
    <p style="color:#666;font-size:12px;">Dutchkem Prosuite — Security Alert</p>
  `;
  return sendAlert({ subject, html });
}
