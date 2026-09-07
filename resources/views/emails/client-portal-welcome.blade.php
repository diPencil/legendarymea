<p style="margin:0 0 16px 0;">Dear {{ $user->name }},</p>

<p style="margin:0 0 16px 0;">
  Your Legendary Management MEA Client Portal account for
  <strong style="color:#081d60;">{{ $company->name }}</strong>
  has been created successfully.
</p>

<p style="margin:0 0 20px 0;">
  You can now access your private portal to review company information, contracts,
  quotations, invoices, service updates, requests, documents, and notifications.
</p>

<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;margin:22px 0;background:#f7f3ea;border:1px solid #dfd2b8;border-radius:12px;">
  <tr>
    <td style="padding:18px 20px;">
      <div style="font-size:12px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:#b69338;margin-bottom:10px;">Portal login details</div>
      <p style="margin:0 0 8px 0;"><strong style="color:#081d60;">Portal:</strong> <a href="{{ $portalUrl }}" style="color:#081d60;text-decoration:none;">{{ $portalUrl }}</a></p>
      <p style="margin:0 0 8px 0;"><strong style="color:#081d60;">Username:</strong> <span style="direction:ltr;unicode-bidi:bidi-override;">{{ $user->username }}</span></p>
      <p style="margin:0;"><strong style="color:#081d60;">Temporary password:</strong> <span style="direction:ltr;unicode-bidi:bidi-override;">{{ $temporaryPassword }}</span></p>
    </td>
  </tr>
</table>

<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 24px 0;">
  <tr>
    <td style="background:#081d60;border-radius:10px;">
      <a href="{{ $portalUrl }}" style="display:inline-block;padding:14px 24px;color:#ffffff;text-decoration:none;font-weight:700;">Open Client Portal</a>
    </td>
  </tr>
</table>

<p style="margin:0 0 16px 0;">
  For your security, you will be asked to change this temporary password the first
  time you sign in.
</p>

<p style="margin:24px 0 8px 0;">Warm regards,</p>
<p style="margin:0;">
  <strong style="color:#081d60;">Legendary Management MEA</strong><br>
  <span style="color:#b69338;font-weight:700;">Corporate Travel, Hospitality &amp; Business Mobility Solutions</span><br>
  <a href="mailto:info@legendarymea.com" style="color:#081d60;text-decoration:none;">info@legendarymea.com</a>
  <span style="color:#b69338;"> | </span>
  <a href="https://legendarymea.com" style="color:#081d60;text-decoration:none;">www.legendarymea.com</a>
</p>
