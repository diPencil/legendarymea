<?php

namespace App\Services;

class EmailLayoutWrapper
{
    /**
     * Wrap the inner HTML content with the global email layout.
     * If the content already contains an HTML doctype or body tag (legacy), it returns it as-is.
     */
    public static function wrap(string $content, string $locale = 'en'): string
    {
        // Don't wrap if it's already a full HTML document (legacy templates)
        if (stripos($content, '<!doctype html>') !== false || stripos($content, '<body') !== false) {
            return $content;
        }

        $dir = $locale === 'ar' ? 'rtl' : 'ltr';
        $fontFamily = $locale === 'ar' 
            ? "Arial,'Helvetica Neue',Helvetica,sans-serif" 
            : "Arial,'Helvetica Neue',Helvetica,sans-serif";
            
        $align = $locale === 'ar' ? 'right' : 'left';

        return <<<HTML
<!doctype html>
<html lang="{$locale}" dir="{$dir}">
  <head>
    <meta charset="utf-8">
  </head>
  <body style="margin:0;padding:0;background:#f4f1eb;font-family:{$fontFamily};color:#081d60;direction:{$dir};text-align:{$align};">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#f4f1eb;margin:0;padding:0;">
      <tr>
        <td align="center" style="padding:28px 14px;">
          <table role="presentation" width="640" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:640px;background:#ffffff;border:1px solid #ded8ce;border-radius:14px;overflow:hidden;direction:{$dir};text-align:{$align};">
            <tr>
              <td style="height:5px;background:#b69338;font-size:0;line-height:0;">&nbsp;</td>
            </tr>
            <tr>
              <td style="padding:28px 32px 20px 32px;text-align:center;">
                <img src="https://legendarymea.com/legendary-management.png" width="190" alt="Legendary Management MEA" style="display:block;margin:0 auto 14px auto;width:190px;max-width:80%;height:auto;border:0;">
                <div style="font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#b69338;">Corporate Travel, Hospitality &amp; Business Mobility Solutions</div>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 26px 32px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;border-top:1px solid #e6e0d6;">
                  <tr>
                    <td style="padding-top:26px;font-size:15px;line-height:1.75;color:#24345f;">
                      {$content}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
          <table role="presentation" width="640" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:640px;margin-top:16px;direction:{$dir};text-align:center;">
            <tr>
              <td style="font-size:12px;color:#8f8c85;line-height:1.6;">
                &copy; Legendary Management MEA. All rights reserved.<br>
                <a href="https://legendarymea.com" style="color:#b69338;text-decoration:none;">www.legendarymea.com</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
HTML;
    }
}
