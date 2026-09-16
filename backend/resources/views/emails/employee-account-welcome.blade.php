<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <style>
    @media only screen and (max-width: 600px) {
      .lm-email-shell { padding: 16px 8px !important; }
      .lm-email-card { width: 100% !important; max-width: 100% !important; border-radius: 10px !important; }
      .lm-email-header { padding: 24px 18px 16px !important; }
      .lm-email-content { padding: 0 18px 22px !important; font-size: 15px !important; line-height: 1.65 !important; }
      .lm-email-button { display: block !important; width: auto !important; text-align: center !important; }
      .lm-email-footer { padding: 20px 18px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#f4f1eb;font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;color:#081d60;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f1eb;padding:28px 12px;">
    <tr>
      <td class="lm-email-shell" align="center" style="padding:0;">
        <table class="lm-email-card" role="presentation" width="620" cellspacing="0" cellpadding="0" style="max-width:620px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e2d8c4;">
          <tr><td style="height:5px;background:#a07f31;font-size:0;line-height:0;">&nbsp;</td></tr>
          <tr>
            <td class="lm-email-header" style="padding:30px 34px 20px;text-align:center;">
              <img src="https://legendarymea.com/legendary-management.png" alt="Legendary Management MEA" width="210" style="display:block;margin:0 auto 18px;max-width:78%;height:auto;border:0;">
              <p style="margin:0;color:#a07f31;font-size:12px;font-weight:700;letter-spacing:3px;text-transform:uppercase;">Internal Dashboard Access</p>
              <h1 style="margin:10px 0 0;font-size:25px;line-height:1.35;color:#081d60;">Welcome to Legendary Management MEA</h1>
            </td>
          </tr>
          <tr>
            <td class="lm-email-content" style="padding:0 34px 24px;font-size:16px;line-height:1.75;color:#081d60;word-break:break-word;overflow-wrap:anywhere;">
              <p style="margin:0 0 14px;">Dear {{ $employee->name ?: $user->name }},</p>
              <p style="margin:0 0 18px;">Your internal dashboard account has been prepared. Please sign in with the temporary password below, then change it before using the workspace.</p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#fbfaf7;border:1px solid #e2d8c4;border-radius:10px;margin:0 0 22px;">
                <tr><td style="padding:18px 20px;">
                  <p style="margin:0 0 8px;"><strong>Employee:</strong> {{ $employee->name ?: $user->name }}</p>
                  <p style="margin:0 0 8px;"><strong>Login email:</strong> <span style="word-break:break-all;overflow-wrap:anywhere;">{{ $user->email }}</span></p>
                  <p style="margin:0 0 8px;"><strong>Username:</strong> <span style="word-break:break-all;overflow-wrap:anywhere;">{{ $user->username }}</span></p>
                  <p style="margin:0;"><strong>Temporary password:</strong> <span style="direction:ltr;unicode-bidi:bidi-override;word-break:break-all;overflow-wrap:anywhere;">{{ $temporaryPassword }}</span></p>
                </td></tr>
              </table>
              <p style="margin:0 0 24px;text-align:center;">
                <a class="lm-email-button" href="{{ $loginUrl }}" style="display:inline-block;background:#081d60;color:#ffffff;text-decoration:none;border-radius:8px;padding:14px 22px;font-weight:700;">Access Internal Dashboard</a>
              </p>
              <p style="margin:0 0 18px;color:#626968;">For security, do not forward this email. Legendary will never ask you to share your password outside the secure login flow.</p>
              <p style="margin:0;">Warm regards,<br><strong>Legendary Management MEA</strong></p>
            </td>
          </tr>
          <tr>
            <td class="lm-email-footer" style="background:#081d60;padding:22px 28px;text-align:center;color:#ffffff;">
              <strong style="display:block;font-size:17px;margin-bottom:8px;">Legendary Management MEA</strong>
              <span style="color:#f0ce72;font-size:13px;">Corporate Travel, Hospitality & Business Mobility Solutions</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
