import { Resend } from 'resend';

const FROM = 'DartMaster <noreply@yourdomain.com>'; // ← change to your verified domain

export async function sendWelcomeEmail({ name, email }) {
  if (!process.env.RESEND_API_KEY) return; // silently skip if not configured
  const resend = new Resend(process.env.RESEND_API_KEY); // lazy init — only when key exists
  try {
    await resend.emails.send({
      from: FROM,
      to: email,
      subject: 'Welcome to DartMaster 🎯',
      html: `
        <!DOCTYPE html>
        <html>
        <head><meta charset="UTF-8"></head>
        <body style="margin:0;padding:0;background:#111111;font-family:'Inter',sans-serif;color:#f0ede8;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#111111;padding:40px 16px;">
            <tr><td align="center">
              <table width="100%" style="max-width:480px;background:#181818;border-radius:16px;border:1px solid #2a2a2a;overflow:hidden;">

                <!-- Header -->
                <tr><td style="background:#e8293c;padding:32px 32px 24px;text-align:center;">
                  <div style="font-size:48px;margin-bottom:8px;">🎯</div>
                  <h1 style="margin:0;font-size:36px;font-weight:800;color:#ffffff;letter-spacing:1px;">DARTMASTER</h1>
                  <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.8);letter-spacing:0.1em;">501 · DOUBLE OUT · PLAY ANYWHERE</p>
                </td></tr>

                <!-- Body -->
                <tr><td style="padding:32px;">
                  <h2 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#f0ede8;">Welcome, ${name}! 👋</h2>
                  <p style="margin:0 0 20px;font-size:15px;color:#888899;line-height:1.6;">
                    Your DartMaster account is ready. Track your games, compete with friends and watch your average improve over time.
                  </p>

                  <!-- Stats preview boxes -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                    <tr>
                      <td width="33%" style="text-align:center;padding:12px 8px;background:#222232;border-radius:10px;">
                        <div style="font-size:22px;font-weight:800;color:#e8293c;">0</div>
                        <div style="font-size:10px;color:#505060;letter-spacing:0.1em;margin-top:2px;">GAMES</div>
                      </td>
                      <td width="2%"></td>
                      <td width="33%" style="text-align:center;padding:12px 8px;background:#222232;border-radius:10px;">
                        <div style="font-size:22px;font-weight:800;color:#2dcb75;">0%</div>
                        <div style="font-size:10px;color:#505060;letter-spacing:0.1em;margin-top:2px;">WIN RATE</div>
                      </td>
                      <td width="2%"></td>
                      <td width="33%" style="text-align:center;padding:12px 8px;background:#222232;border-radius:10px;">
                        <div style="font-size:22px;font-weight:800;color:#f0a030;">—</div>
                        <div style="font-size:10px;color:#505060;letter-spacing:0.1em;margin-top:2px;">AVG/DART</div>
                      </td>
                    </tr>
                  </table>

                  <p style="margin:0 0 24px;font-size:14px;color:#888899;line-height:1.6;">
                    Start by setting up your first game. Invite friends using the room code system — no account needed for them to join.
                  </p>

                  <!-- CTA -->
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr><td align="center">
                      <a href="${process.env.FRONTEND_URL || 'https://dartmaster.vercel.app'}"
                         style="display:inline-block;background:#e8293c;color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:10px;font-size:16px;font-weight:700;letter-spacing:0.05em;">
                        PLAY NOW 🎯
                      </a>
                    </td></tr>
                  </table>
                </td></tr>

                <!-- Footer -->
                <tr><td style="padding:20px 32px;border-top:1px solid #2a2a2a;text-align:center;">
                  <p style="margin:0;font-size:12px;color:#404050;">
                    You're receiving this because you created a DartMaster account.<br>
                    Your username: <strong style="color:#e8293c;">@${name.toLowerCase().replace(/\s+/g, '_')}</strong>
                  </p>
                </td></tr>

              </table>
            </td></tr>
          </table>
        </body>
        </html>
      `,
    });
  } catch (err) {
    // Never block registration if email fails
    console.error('Welcome email failed:', err.message);
  }
}