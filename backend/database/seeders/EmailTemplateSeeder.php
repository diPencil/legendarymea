<?php

namespace Database\Seeders;

use App\Models\EmailTemplate;
use Illuminate\Database\Seeder;

class EmailTemplateSeeder extends Seeder
{
    public function run(): void
    {
        EmailTemplate::query()->updateOrCreate(
            ['key' => 'professional-b2b-cold-outreach-legendary'],
            [
                'name' => 'Professional B2B Cold Outreach - Legendary',
                'subject' => 'Streamline Your Corporate Travel & Hotel Bookings with LEGENDARY MANAGEMENT MEA',
                'subject_en' => 'Streamline Your Corporate Travel & Hotel Bookings with LEGENDARY MANAGEMENT MEA',
                'subject_ar' => 'طوّر حجوزات السفر والفنادق لشركتك مع LEGENDARY MANAGEMENT MEA',
                'body' => self::bodyEn(),
                'body_en' => self::bodyEn(),
                'body_ar' => self::bodyAr(),
                'is_active' => true,
            ]
        );
    }

    private static function bodyEn(): string
    {
        return <<<'HTML'
<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f4f1eb;font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;color:#081d60;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#f4f1eb;margin:0;padding:0;">
      <tr>
        <td align="center" style="padding:28px 14px;">
          <table role="presentation" width="640" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:640px;background:#ffffff;border:1px solid #ded8ce;border-radius:14px;overflow:hidden;">
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
                      <p style="margin:0 0 16px 0;">Dear [Client Name]</p>
                      <p style="margin:0 0 16px 0;">I hope this email finds you well.</p>
                      <p style="margin:0 0 16px 0;">Managing corporate travel requires speed, cost-efficiency, and absolute reliability. At Legendary Management MEA&mdash;part of the global Legendary Group ecosystem&mdash;we empower organisations to optimise their business travel seamlessly through our advanced Legendary Management MEA B2B Platform.</p>
                      <p style="margin:0 0 22px 0;">Whether you are booking domestic travel within KSA or international trips across the globe, Legendary Management MEA connects your business directly to thousands of hotels, private transport, and group travel solutions with exclusive corporate rates.</p>

                      <h2 style="margin:0 0 14px 0;font-size:18px;line-height:1.35;color:#081d60;">Why Leading Corporates Partner with Us:</h2>
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;border-collapse:separate;border-spacing:0 8px;">
                        <tr>
                          <td style="width:18px;vertical-align:top;padding-top:8px;"><span style="display:block;width:7px;height:7px;border-radius:50%;background:#b69338;">&nbsp;</span></td>
                          <td style="padding:10px 12px;background:#faf8f3;border:1px solid #eee7dc;border-radius:10px;font-size:14px;line-height:1.65;color:#24345f;"><strong style="color:#081d60;">Exclusive Corporate Rates:</strong> Direct savings on worldwide hotel bookings and customised packages.</td>
                        </tr>
                        <tr>
                          <td style="width:18px;vertical-align:top;padding-top:8px;"><span style="display:block;width:7px;height:7px;border-radius:50%;background:#b69338;">&nbsp;</span></td>
                          <td style="padding:10px 12px;background:#faf8f3;border:1px solid #eee7dc;border-radius:10px;font-size:14px;line-height:1.65;color:#24345f;"><strong style="color:#081d60;">Instant B2B Booking &amp; Confirmation:</strong> Easy-to-use portal with multi-user access and real-time availability.</td>
                        </tr>
                        <tr>
                          <td style="width:18px;vertical-align:top;padding-top:8px;"><span style="display:block;width:7px;height:7px;border-radius:50%;background:#b69338;">&nbsp;</span></td>
                          <td style="padding:10px 12px;background:#faf8f3;border:1px solid #eee7dc;border-radius:10px;font-size:14px;line-height:1.65;color:#24345f;"><strong style="color:#081d60;">Complete Travel Ecosystem:</strong> From hotel accommodations and ground transfers to commercial and private jet charters through our aviation network.</td>
                        </tr>
                        <tr>
                          <td style="width:18px;vertical-align:top;padding-top:8px;"><span style="display:block;width:7px;height:7px;border-radius:50%;background:#b69338;">&nbsp;</span></td>
                          <td style="padding:10px 12px;background:#faf8f3;border:1px solid #eee7dc;border-radius:10px;font-size:14px;line-height:1.65;color:#24345f;"><strong style="color:#081d60;">Financial Flexibility:</strong> Consolidated monthly invoicing and flexible credit terms.</td>
                        </tr>
                        <tr>
                          <td style="width:18px;vertical-align:top;padding-top:8px;"><span style="display:block;width:7px;height:7px;border-radius:50%;background:#b69338;">&nbsp;</span></td>
                          <td style="padding:10px 12px;background:#faf8f3;border:1px solid #eee7dc;border-radius:10px;font-size:14px;line-height:1.65;color:#24345f;"><strong style="color:#081d60;">Dedicated 24/7 Account Management:</strong> A specialised travel consultant assigned to support your team around the clock.</td>
                        </tr>
                      </table>

                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;margin:22px 0;background:#f7f3ea;border:1px solid #dfd2b8;border-radius:12px;">
                        <tr>
                          <td style="padding:18px 20px;font-size:15px;line-height:1.7;color:#24345f;">We would love to provide you with a complimentary trial account or a short 10-minute demo to show you how much Legendary Management MEA can optimise your travel budget and administrative time.</td>
                        </tr>
                      </table>

                      <p style="margin:0 0 18px 0;">Are you available for a brief call or a quick meeting this week?</p>

                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 28px 0;">
                        <tr>
                          <td bgcolor="#081d60" style="border-radius:8px;">
                            <a href="https://wa.me/966530363444" style="display:inline-block;padding:13px 22px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:8px;">Schedule a Quick Call</a>
                          </td>
                        </tr>
                      </table>

                      <p style="margin:0 0 6px 0;">Warm regards,</p>
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;margin-top:18px;border-top:1px solid #e6e0d6;">
                        <tr>
                          <td style="padding-top:18px;">
                            <div style="font-size:17px;font-weight:700;color:#081d60;">[Your Name]</div>
                            <div style="font-size:13px;color:#b69338;font-weight:700;margin-top:3px;">[Your Title]</div>
                            <div style="font-size:14px;color:#24345f;margin-top:8px;">Legendary Management MEA</div>
                            <div style="font-size:13px;color:#5c6375;margin-top:7px;">[Phone Number] | <a href="mailto:[Official Email]" style="color:#081d60;text-decoration:none;">[Official Email]</a></div>
                            <div style="font-size:13px;margin-top:4px;"><a href="[Website URL]" style="color:#081d60;text-decoration:none;">[Website URL]</a></div>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="background:#081d60;padding:22px 32px;text-align:center;color:#ffffff;">
                <div style="font-size:15px;font-weight:700;">Legendary Management MEA</div>
                <div style="font-size:12px;line-height:1.6;color:#d8c27c;margin-top:6px;">Corporate Travel, Hospitality &amp; Business Mobility Solutions</div>
                <div style="font-size:12px;line-height:1.7;color:#dfe5f6;margin-top:10px;">[Official Email] &nbsp;|&nbsp; [Phone Number] &nbsp;|&nbsp; [Website URL]</div>
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

    private static function bodyAr(): string
    {
        return <<<'HTML'
<!doctype html>
<html lang="ar" dir="rtl">
  <body style="margin:0;padding:0;background:#f4f1eb;font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;color:#081d60;direction:rtl;text-align:right;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#f4f1eb;margin:0;padding:0;">
      <tr>
        <td align="center" style="padding:28px 14px;">
          <table role="presentation" width="640" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:640px;background:#ffffff;border:1px solid #ded8ce;border-radius:14px;overflow:hidden;">
            <tr>
              <td style="height:5px;background:#b69338;font-size:0;line-height:0;">&nbsp;</td>
            </tr>
            <tr>
              <td style="padding:28px 32px 20px 32px;text-align:center;">
                <img src="https://legendarymea.com/legendary-management.png" width="190" alt="Legendary Management MEA" style="display:block;margin:0 auto 14px auto;width:190px;max-width:80%;height:auto;border:0;">
                <div style="font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#b69338;">حلول السفر المؤسسي والضيافة وتنقل الأعمال</div>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 26px 32px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;border-top:1px solid #e6e0d6;">
                  <tr>
                    <td style="padding-top:26px;font-size:15px;line-height:1.9;color:#24345f;direction:rtl;text-align:right;">
                      <p style="margin:0 0 16px 0;">عزيزي/عزيزتي [اسم العميل]</p>
                      <p style="margin:0 0 16px 0;">نأمل أن تصلكم رسالتنا وأنتم بخير.</p>
                      <p style="margin:0 0 16px 0;">إدارة سفر الشركات تحتاج إلى سرعة، وكفاءة في التكلفة، وموثوقية كاملة. في Legendary Management MEA، وضمن منظومة Legendary Group العالمية، نساعد المؤسسات على تحسين إدارة رحلات الأعمال بسهولة من خلال منصة Legendary Management MEA B2B المتقدمة.</p>
                      <p style="margin:0 0 22px 0;">سواء كانت حجوزاتكم داخل المملكة العربية السعودية أو رحلات دولية حول العالم، تربط Legendary Management MEA شركتكم مباشرة بآلاف الفنادق وخدمات النقل الخاص وحلول سفر المجموعات بأسعار مؤسسية حصرية.</p>

                      <h2 style="margin:0 0 14px 0;font-size:18px;line-height:1.35;color:#081d60;">لماذا تختار الشركات الرائدة العمل معنا؟</h2>
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;border-collapse:separate;border-spacing:0 8px;">
                        <tr>
                          <td style="width:18px;vertical-align:top;padding-top:8px;"><span style="display:block;width:7px;height:7px;border-radius:50%;background:#b69338;">&nbsp;</span></td>
                          <td style="padding:10px 12px;background:#faf8f3;border:1px solid #eee7dc;border-radius:10px;font-size:14px;line-height:1.8;color:#24345f;"><strong style="color:#081d60;">أسعار مؤسسية حصرية:</strong> توفير مباشر في حجوزات الفنادق العالمية والباقات المصممة حسب احتياجكم.</td>
                        </tr>
                        <tr>
                          <td style="width:18px;vertical-align:top;padding-top:8px;"><span style="display:block;width:7px;height:7px;border-radius:50%;background:#b69338;">&nbsp;</span></td>
                          <td style="padding:10px 12px;background:#faf8f3;border:1px solid #eee7dc;border-radius:10px;font-size:14px;line-height:1.8;color:#24345f;"><strong style="color:#081d60;">حجز وتأكيد فوري عبر B2B:</strong> بوابة سهلة الاستخدام تدعم تعدد المستخدمين وتوفر الأسعار والتوافر لحظيًا.</td>
                        </tr>
                        <tr>
                          <td style="width:18px;vertical-align:top;padding-top:8px;"><span style="display:block;width:7px;height:7px;border-radius:50%;background:#b69338;">&nbsp;</span></td>
                          <td style="padding:10px 12px;background:#faf8f3;border:1px solid #eee7dc;border-radius:10px;font-size:14px;line-height:1.8;color:#24345f;"><strong style="color:#081d60;">منظومة سفر متكاملة:</strong> من الإقامة الفندقية والنقل الأرضي إلى الرحلات الجماعية وخدمات الطيران التجاري والخاص عبر شبكتنا.</td>
                        </tr>
                        <tr>
                          <td style="width:18px;vertical-align:top;padding-top:8px;"><span style="display:block;width:7px;height:7px;border-radius:50%;background:#b69338;">&nbsp;</span></td>
                          <td style="padding:10px 12px;background:#faf8f3;border:1px solid #eee7dc;border-radius:10px;font-size:14px;line-height:1.8;color:#24345f;"><strong style="color:#081d60;">مرونة مالية:</strong> فواتير شهرية مجمعة وشروط ائتمان مرنة وفق الاتفاق التجاري.</td>
                        </tr>
                        <tr>
                          <td style="width:18px;vertical-align:top;padding-top:8px;"><span style="display:block;width:7px;height:7px;border-radius:50%;background:#b69338;">&nbsp;</span></td>
                          <td style="padding:10px 12px;background:#faf8f3;border:1px solid #eee7dc;border-radius:10px;font-size:14px;line-height:1.8;color:#24345f;"><strong style="color:#081d60;">إدارة حساب مخصصة على مدار الساعة:</strong> مستشار سفر متخصص لدعم فريقكم ومتابعة احتياجاتكم التشغيلية.</td>
                        </tr>
                      </table>

                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;margin:22px 0;background:#f7f3ea;border:1px solid #dfd2b8;border-radius:12px;">
                        <tr>
                          <td style="padding:18px 20px;font-size:15px;line-height:1.8;color:#24345f;">يسعدنا توفير حساب تجريبي مجاني أو عرض قصير لمدة 10 دقائق لنوضح لكم كيف يمكن لـ Legendary Management MEA تحسين ميزانية السفر وتقليل الوقت الإداري.</td>
                        </tr>
                      </table>

                      <p style="margin:0 0 18px 0;">هل يناسبكم إجراء مكالمة قصيرة أو اجتماع سريع هذا الأسبوع؟</p>

                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 28px 0;">
                        <tr>
                          <td bgcolor="#081d60" style="border-radius:8px;">
                            <a href="https://wa.me/966530363444" style="display:inline-block;padding:13px 22px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:8px;">احجز مكالمة سريعة</a>
                          </td>
                        </tr>
                      </table>

                      <p style="margin:0 0 6px 0;">مع خالص التحية،</p>
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;margin-top:18px;border-top:1px solid #e6e0d6;">
                        <tr>
                          <td style="padding-top:18px;">
                            <div style="font-size:17px;font-weight:700;color:#081d60;">[اسمك]</div>
                            <div style="font-size:13px;color:#b69338;font-weight:700;margin-top:3px;">[المسمى الوظيفي]</div>
                            <div style="font-size:14px;color:#24345f;margin-top:8px;">Legendary Management MEA</div>
                            <div style="font-size:13px;color:#5c6375;margin-top:7px;">[رقم الهاتف] | <a href="mailto:[البريد الرسمي]" style="color:#081d60;text-decoration:none;">[البريد الرسمي]</a></div>
                            <div style="font-size:13px;margin-top:4px;"><a href="[رابط الموقع]" style="color:#081d60;text-decoration:none;">[رابط الموقع]</a></div>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="background:#081d60;padding:22px 32px;text-align:center;color:#ffffff;">
                <div style="font-size:15px;font-weight:700;">Legendary Management MEA</div>
                <div style="font-size:12px;line-height:1.6;color:#d8c27c;margin-top:6px;">حلول السفر المؤسسي والضيافة وتنقل الأعمال</div>
                <div style="font-size:12px;line-height:1.7;color:#dfe5f6;margin-top:10px;">[البريد الرسمي] &nbsp;|&nbsp; [رقم الهاتف] &nbsp;|&nbsp; [رابط الموقع]</div>
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
