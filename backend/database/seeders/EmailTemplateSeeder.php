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

        EmailTemplate::query()->updateOrCreate(
            ['key' => 'follow-up-b2b-legendary'],
            [
                'name' => 'Follow-up B2B - Legendary',
                'subject' => 'Unlock Premium Corporate Travel Rates with LEGENDARY MANAGEMENT MEA',
                'subject_en' => 'Unlock Premium Corporate Travel Rates with LEGENDARY MANAGEMENT MEA',
                'subject_ar' => 'احصل على أفضل أسعار سفر الشركات مع LEGENDARY MANAGEMENT MEA',
                'body' => self::bodyEnAlt(),
                'body_en' => self::bodyEnAlt(),
                'body_ar' => self::bodyArAlt(),
                'is_active' => true,
            ]
        );
    }

    private static function bodyEn(): string
    {
        return <<<'HTML'
<p style="margin:0 0 16px 0;">Dear [Client Name]</p>
<p style="margin:0 0 16px 0;">I hope this email finds you well.</p>
<p style="margin:0 0 16px 0;">Managing corporate travel requires speed, cost-efficiency, and absolute reliability. At Legendary Management MEA&mdash;part of the global Legendary Group ecosystem&mdash;we empower organisations to optimise their business travel seamlessly through our advanced Legendary Management MEA B2B Platform.</p>
<p style="margin:0 0 22px 0;">Whether you are booking domestic travel within KSA or international trips across the globe, Legendary Management MEA connects your business directly to thousands of hotels, private transport, and group travel solutions with exclusive corporate rates.</p>

<h2 style="margin:0 0 14px 0;font-size:18px;line-height:1.35;color:#081d60;">Why Leading Corporates Partner with Us:</h2>
<ul style="margin:0;padding:0 0 0 20px;">
  <li style="margin-bottom:10px;"><strong style="color:#081d60;">Exclusive Corporate Rates:</strong> Direct savings on worldwide hotel bookings and customised packages.</li>
  <li style="margin-bottom:10px;"><strong style="color:#081d60;">Instant B2B Booking &amp; Confirmation:</strong> Easy-to-use portal with multi-user access and real-time availability.</li>
  <li style="margin-bottom:10px;"><strong style="color:#081d60;">Complete Travel Ecosystem:</strong> From hotel accommodations and ground transfers to commercial and private jet charters through our aviation network.</li>
  <li style="margin-bottom:10px;"><strong style="color:#081d60;">Financial Flexibility:</strong> Consolidated monthly invoicing and flexible credit terms.</li>
  <li style="margin-bottom:10px;"><strong style="color:#081d60;">Dedicated 24/7 Account Management:</strong> A specialised travel consultant assigned to support your team around the clock.</li>
</ul>

<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;margin:22px 0;background:#f7f3ea;border:1px solid #dfd2b8;border-radius:12px;">
  <tr><td style="padding:18px 20px;font-size:15px;line-height:1.7;color:#24345f;">I would appreciate the opportunity to schedule a brief 10-minute introduction call next week to demonstrate how our platform can significantly reduce your travel expenditure while elevating your team&rsquo;s travel experience.</td></tr>
</table>

<p style="margin:0 0 16px 0;">Please let me know a day and time that works best for you, or feel free to reply directly to this email.</p>
<p style="margin:0 0 16px 0;">I look forward to exploring a mutually beneficial partnership.</p>
<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:24px 0;">
  <tr>
    <td style="border-radius:6px;background:#081d60;">
      <a href="https://wa.me/966530363444" style="display:inline-block;padding:14px 24px;color:#ffffff;text-decoration:none;font-weight:700;">Schedule a Quick Call</a>
    </td>
  </tr>
</table>
<p style="margin:0;">Best regards,</p>
<hr style="border:0;border-top:1px solid #dfd2b8;margin:24px 0;">
<p style="margin:0 0 8px 0;"><strong style="color:#081d60;">[Your Name]</strong></p>
<p style="margin:0 0 12px 0;"><strong style="color:#b69335;">[Your Title]</strong></p>
<p style="margin:0 0 12px 0;">Legendary Management MEA</p>
<p style="margin:0 0 8px 0;"><a href="tel:[Phone Number]" style="color:#081d60;text-decoration:none;">[Phone Number]</a> | <a href="mailto:[Official Email]" style="color:#081d60;text-decoration:none;">[Official Email]</a></p>
<p style="margin:0;"><a href="[Website URL]" style="color:#081d60;text-decoration:none;">[Website URL]</a></p>
HTML;
    }

    private static function bodyAr(): string
    {
        return <<<'HTML'
<!doctype html>
<html lang="ar" dir="rtl">
<body style="margin:0;padding:0;direction:rtl;text-align:right;">
<p style="margin:0 0 16px 0;">السيد / السيدة [اسم العميل]</p>
<p style="margin:0 0 16px 0;">أتمنى أن تكونوا بأفضل حال.</p>
<p style="margin:0 0 16px 0;">إدارة سفر الشركات تتطلب السرعة، كفاءة التكلفة، والموثوقية المطلقة. في Legendary Management MEA &mdash; جزء من منظومة مجموعة Legendary العالمية &mdash; نمكّن المؤسسات من تحسين برامج سفر الأعمال الخاصة بهم بسلاسة تامة من خلال منصتنا المتطورة المخصصة لقطاع الأعمال (B2B).</p>
<p style="margin:0 0 22px 0;">سواء كنتم تحجزون لرحلات داخلية في المملكة العربية السعودية أو رحلات دولية حول العالم، تربطكم Legendary Management MEA مباشرة بآلاف الفنادق، خدمات النقل الخاص، وحلول سفر المجموعات بأسعار حصرية للشركات.</p>

<h2 style="margin:0 0 14px 0;font-size:18px;line-height:1.35;color:#081d60;">لماذا تختار الشركات الرائدة العمل معنا؟</h2>
<ul style="margin:0;padding:0 20px 0 0;">
  <li style="margin-bottom:10px;"><strong style="color:#081d60;">أسعار حصرية للشركات:</strong> توفير مباشر في حجوزات الفنادق العالمية والباقات المخصصة.</li>
  <li style="margin-bottom:10px;"><strong style="color:#081d60;">حجوزات فورية عبر منصة B2B:</strong> بوابة سهلة الاستخدام تدعم حسابات متعددة للموظفين مع تأكيد فوري للحجوزات.</li>
  <li style="margin-bottom:10px;"><strong style="color:#081d60;">منظومة سفر متكاملة:</strong> من حجوزات الفنادق والتنقلات البرية إلى الطيران التجاري والخاص عبر شبكتنا الجوية.</li>
  <li style="margin-bottom:10px;"><strong style="color:#081d60;">مرونة مالية:</strong> فواتير شهرية مجمعة وتسهيلات ائتمانية مرنة.</li>
  <li style="margin-bottom:10px;"><strong style="color:#081d60;">إدارة حسابات على مدار الساعة:</strong> مستشار سفر مخصص لدعم فريقكم طوال أيام الأسبوع.</li>
</ul>

<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;margin:22px 0;background:#f7f3ea;border:1px solid #dfd2b8;border-radius:12px;">
  <tr><td style="padding:18px 20px;font-size:15px;line-height:1.7;color:#24345f;">أقدر جداً إتاحة الفرصة لتحديد مكالمة تعريفية قصيرة لمدة 10 دقائق الأسبوع القادم لاستعراض كيف يمكن لمنصتنا تقليل نفقات السفر بشكل ملحوظ مع الارتقاء بتجربة سفر فريقكم.</td></tr>
</table>

<p style="margin:0 0 16px 0;">يرجى إعلامي باليوم والوقت الأنسب لكم، أو يمكنكم الرد مباشرة على هذا البريد الإلكتروني.</p>
<p style="margin:0 0 16px 0;">أتطلع إلى بناء شراكة مثمرة وناجحة.</p>
<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:24px 0 24px auto;">
  <tr>
    <td style="border-radius:6px;background:#081d60;">
      <a href="https://wa.me/966530363444" style="display:inline-block;padding:14px 24px;color:#ffffff;text-decoration:none;font-weight:700;">احجز مكالمة سريعة</a>
    </td>
  </tr>
</table>
<p style="margin:0;">أطيب التحيات،</p>
<hr style="border:0;border-top:1px solid #dfd2b8;margin:24px 0;">
<p style="margin:0 0 8px 0;"><strong style="color:#081d60;">[اسمك]</strong></p>
<p style="margin:0 0 12px 0;"><strong style="color:#b69335;">[المسمى الوظيفي]</strong></p>
<p style="margin:0 0 12px 0;">Legendary Management MEA</p>
<p style="margin:0 0 8px 0;"><a href="tel:[رقم الهاتف]" style="color:#081d60;text-decoration:none;">[رقم الهاتف]</a> | <a href="mailto:[البريد الرسمي]" style="color:#081d60;text-decoration:none;">[البريد الرسمي]</a></p>
<p style="margin:0;"><a href="[رابط الموقع]" style="color:#081d60;text-decoration:none;">[رابط الموقع]</a></p>
</body>
</html>
HTML;
    }

    private static function bodyEnAlt(): string
    {
        return <<<'HTML'
<p style="margin:0 0 16px 0;">Dear [Client Name]</p>
<p style="margin:0 0 16px 0;">Following up on our recent communication, I am pleased to share an exclusive update regarding Legendary Management MEA's corporate travel solutions.</p>
<p style="margin:0 0 16px 0;">We have recently expanded our global inventory, unlocking unprecedented rates and access to premium hospitality services designed specifically for enterprise clients.</p>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;margin:22px 0;background:#f7f3ea;border:1px solid #dfd2b8;border-radius:12px;">
  <tr><td style="padding:18px 20px;font-size:15px;line-height:1.7;color:#24345f;">I would love to walk you through our updated B2B platform capabilities. Are you available for a brief call this Thursday?</td></tr>
</table>
<p style="margin:0;">Best regards,</p>
HTML;
    }

    private static function bodyArAlt(): string
    {
        return <<<'HTML'
<p style="margin:0 0 16px 0;">السيد / السيدة [اسم العميل]</p>
<p style="margin:0 0 16px 0;">إلحاقاً لتواصلنا الأخير، يسعدني أن أشارككم تحديثاً حصرياً حول حلول سفر الشركات من Legendary Management MEA.</p>
<p style="margin:0 0 16px 0;">لقد قمنا مؤخراً بتوسيع شبكتنا العالمية، مما يوفر أسعاراً استثنائية وإمكانية الوصول إلى خدمات ضيافة فاخرة مصممة خصيصاً لعملائنا من الشركات.</p>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;margin:22px 0;background:#f7f3ea;border:1px solid #dfd2b8;border-radius:12px;">
  <tr><td style="padding:18px 20px;font-size:15px;line-height:1.7;color:#24345f;">أود استعراض قدرات منصتنا المحدثة معكم. هل يتوفر لديكم وقت لمكالمة قصيرة يوم الخميس القادم؟</td></tr>
</table>
<p style="margin:0;">أطيب التحيات،</p>
HTML;
    }
}
