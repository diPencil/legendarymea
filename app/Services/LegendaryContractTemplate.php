<?php

namespace App\Services;

class LegendaryContractTemplate
{
    public static function getDefaultTemplate(): array
    {
        $pages = [
            [
                'page' => 1,
                'sections' => [
                    [
                        'key' => 'parties',
                        'title_en' => 'Contract Agreement (SILVER System)',
                        'title_ar' => 'عقد اتفاق (النظام الفضي)',
                        'clauses' => [
                            [
                                'en' => "This contract concluded on:\nbetween:\n\nFirst Party: Legendary Management MEA\n\nCommercial Reg. No.: (255715)\n23 Alquds Road, Nasher Commercial Building\n– Southern Ring Road (Alruwaishan Roundabout)\nSana`a – Yemen\nLegal Representative: AHMED MOHAMED HAIDER \nALSHALABI\nin his capacity as the Yemen region official in Legendary Management MEA\n\nSecond Party: Athka Holidays\n\nCommercial Reg. No.: (239154)\nAddress: End of algeria St. Next to Exceed language \ncenter\nTel. No.: 00967 1 206166\nLegal Representative: MR. (Osama abdulrahman \njamil al mazgahy)\nin his/her capacity as (Director General) who is in \ncharge of any branches or offices of the Second \nParty.",
                                'ar' => "تم إبرام هذا العقد يوم\nبين كلاً من:\n\nالطرف الأول: شركة ليجينداري مانجمنت مي إي إيه\n\nرقم السجل التجاري: (255715)\n23 شارع القدس، بناية ناشر التجارية – الدائري الجنوبي\n(جولة الرويشان)\nصنعاء - اليمن\nوممثلها القانوني: (أحمد محمد حيدر الشلبي) بصفته \nمسؤول منطقة اليمن في شركة ليجينداري مانجمنت مي إي إيه\n\nالطرف الثاني: شركة اذكى هوليديز للخدمات \nالتجارية والسفريات\n\nرقم السجل التجاري: (239154)\nالعنـــــــوان: نــــهـــاية شـــــــارع الجزائر بــــجـــوار مــعــهــد اكــســيــد.\nهــــاتـــف رقـــــــم: 00967 1 206166\nومـمـثـلها القانــونـي: السيـــد (اســـامة عـبـدالـرحمن جـمـيـل \nالمذجــحـي) بـصـفـته (الـمـدير العام) وهــو المسـؤـول في \nهــذا العقــد عن فــروع او مـكـاتب الطرف الثانــي."
                            ]
                        ]
                    ],
                    [
                        'key' => 'preamble',
                        'title_en' => 'Preamble',
                        'title_ar' => 'تمهيد',
                        'clauses' => [
                            [
                                'en' => "This contract specifies the general terms and \nconditions between the first and the second parties \nprovided that the first party provide services \nrepresented in reservations to hotels and resorts \naround the world and all related to tourism and \ntravel services provided by the first party. The second \nparty uses the online booking system represented \nby the following website: (ONLINE.LEGENDARYMEA.COM) or \nthrough a formal application via this E. MAIL \n(reservations@legendarymea.com).\n\nThis preamble is part and parcel hereof, and both \nparties, willingly, agreed to the following terms:\n\nwww.legendarymea.com",
                                'ar' => "يحدد هذا العقد البنود والشروط العامة بين الطرف الأول \nوالطرف الثاني على ان يقوم الطرف الاول بتقديم خدمات \nممثلة في حجوزات فنادق ومنتجعات حول العالم وكل ما \nيتعلق بخدمات السياحة والسفر التي يقدمها الطرف الأول \nعلى ان يستخدم الطرف الثاني نظام الحجز المباشر عبر الإنترنت \nالممثل بالموقع التالي:\n\n(ONLINE.LEGENDARYMEA.COM)\n\nاو بطلب رسمي عبر البريد الإلكتروني وهو:\n\n(reservations@legendarymea.com)\n\nحيث ان هذا التمهيد هو جزء لا يتجزأ من العقد. وقد اتفق \nالطرفان وبكامل ارادتهما على الشروط التالي ذكرها:"
                            ]
                        ]
                    ]
                ]
            ],
            [
                'page' => 2,
                'sections' => [
                    [
                        'key' => 'handling_mechanism',
                        'title_en' => '-1 Handling Mechanism:',
                        'title_ar' => '-1 آلية التعامل:',
                        'clauses' => [
                            [
                                'en' => "• The first party provides the second party with a \nusername and password to the Legendary Online \nBooking System (ONLINE.LEGENDARYMEA.COM) for \n250$/YEAR (only US Dollar two hundred and fifty \nYearly) per user in exchange for agent prices, Active \nsupport, training, and marketing, and the right to \nadd the second party›s logo, and the right to \nestablish sub-accounts at cost.\n• The user names and password shall not be \ntransferred or revealed to third party representing \ncompetitions for the First Party or even the \nrepresentatives of the First Party in order to \nmaintain the quality of business.\n• The second party is fully responsible for changing \nits password to ensure the confidentiality and \nsecurity of its account whenever required.\n• Misuse of this system in a way that results in \ndamage such as long-term bookings for the \npurpose of extracting visa or cancellations in excess \nof %10 of the total bookings may result in the \nsuspension of the Company account and shall pay \nfor all consequential damages.",
                                'ar' => "• يقوم الطرف الأول بتزويد الطرف الثاني بإسم مستخدم \nوكلمة مرور إلى «نظام الحجوزات المباشر لشركة ليجينداري مانجمنت مي إي إيه عبر \nالإنترنت (COM.LEGENDARYMEA.ONLINE (مقابل 250 دولار/سنويا \n(فقط مائتين وخمسين دولار أمريكي لا غير تدفع سنويا) \nللمستخدم الواحد في مقابل حصول الطرف الثاني على أسعار \nالوكيل وخدمة الدعم والتدريب والتسويق النشط وحق \nإضافة شعاره وحق انشاء حسابات فرعية بالكلفة.\n•لا يمكن تحويل أو إفشاء اي اسم مستخدم او كلمة مرور الى \nأطراف أخرى منافسة للطرف الأول أو حتى ممثلي الطرف الاول \nحفاظا على جودة العملية التجارية.\n• يعتبر الطرف الثاني مسؤول مسؤولية كاملة عن تغيير كلمة \nالمرور الخاصة به للتأكد من سرية وأمان الحساب الخاص به \nمتى تطلب ذلك.\n• إساءة استعمال هذا النظام بشكل يترتب عليه ضررا مثل \nالحجوزات طويلة المدة لغرض استخراج الفيزا أو الإلغاءات \nالزائدة عن نسبة %10 من اجمالي الحجوزات قد يؤدي الى \nايقاف الحساب الخاص بالشركة مع تحمل كافة الأضرار المترتبة \nعلى ذلك."
                            ]
                        ]
                    ],
                    [
                        'key' => 'sale_policies',
                        'title_en' => '-2 Sale Policies:',
                        'title_ar' => '-2 السياسات البيعية:',
                        'clauses' => [
                            [
                                'en' => "• The Second Party shall bear direct liability for all \nbookings made under their user name and \npassword.\n• Official currency used for services payment shall be \nUS Dollar (USD).\n• Provided sale prices are only permitted within the \nlocal market of the Second Party.\n• Prices and the possibility of first-party services are \n“special-offers” that have been discussed with \nservice providers\n• Prices provided by the First Party are confidential \nand shall not be disclosed to competitors or sold to \nmediators.\n• Prices offered by the First Party are net prices (Not \nsubject to commissions).\n• Group trips requests and private requests are \nsubject to payment items and cancellation and \nconfirmation terms that shall be agreed upon by \nthe parties in writing upon booking confirmation.",
                                'ar' => "• يتحمل الطرف الثاني وطرف عمله المسئولية المباشرة عن \nكافة الحجوزات التي تتم باسم المستخدم وكلمة المرور \nالخاصة بهم.\n• العملة الرسمية المستخدمة للخدمات ستكون بالدولار \nوالرمز USD.\n• أسعار البيع المقدمة مصرح بها فقط في السوق المحلي \nالخاص بالطرف الثاني.\n• تعتبر الأسعار وإمكانية الخدمات المتوفرة من الطرف الأول \nعروض خاصة خضعت للنقاش مع مقدمي الخدمات.\n• الأسعار المقدمة من قبل الطرف الأول تعتبر سرية، ولا يجوز \nإفشائها للمنافسين أو بيعها للوسطاء.\n• الأسعار المعروضة من قبل الطرف الأول تعتبر أسعار صافية \n(غير قابلة لإضافة عمولات).\n• تخضع طلبات الرحلات الجماعية والطلبات الخاصة لبنود \nسداد وشروط إلغاء وتأكيد منفصلة يتم الاتفاق عليها بين \nالطرفين كتابيا عند تأكيد الحجز."
                            ]
                        ]
                    ]
                ]
            ],
            [
                'page' => 3,
                'sections' => [
                    [
                        'key' => 'confirmation_of_services',
                        'title_en' => '-3 Confirmation of Services and \nSale Voucher:',
                        'title_ar' => '-3 تأكيد الخدمات وقسائم البيع:',
                        'clauses' => [
                            [
                                'en' => "• All bookings can be made via online direct booking \nwebsite in (pending status) as long as the booking is \nprior to free cancelation date.\n\n• The First Party shall send a weekly e-mail to all \n(pending) bookings to remind the Second Party \nbefore cancellation due date and the Second Party \nshall either conform or cancel the booking. In case \nthe Second Party did not respond, Booking System \nshall make a spontaneous cancellation without any \nliability upon the First Party.\n\n• Upon issuing vouchers, the Second Party shall \nmention the detailed information as recorded on \nthe receipts issued by Online Direct System of the \nFirst Party; therefore the Second Party shall bear any \nliability in respect of any inconvenience or problem \nmade to the end customer due to not following this \nStep.\n\n• Requested booking made via e-mail or indirect \nsystem shall only be confirmed whenever the First \nparty receives copy of the service receipt of the \nSecond Party from the service provider.\n\n• The First Party is liable for any confirmed bookings \nmade by him while providing the services, \nexcluding some bookings that are already under \ndemand and subject to the capacity of service \nprovider upon the arrival of end customer.\n\n• If the service or booking were not available upon \nthe arrival of end customer to the service provider, \nthat were already confirmed via Online Direct \nBooking System and fees were deducted from the \nSecond Party balance, the First Party shall provide a \nsimilar alternative, and if not possible, the First party \nshall refund the unavailable service value to the \nSecond Party.",
                                'ar' => "• يمكن عمل جميع الحجوزات عن طريق موقع الحجز المباشر \nبحالة (الانتظار) مادام الحجز ما يزال قبل تاريخ الإلغاء المجاني.\n\n• على الطرف الأول ارسال بريد اسبوعي لجميع حجوزات (حالة \nالانتظار) لتذكير الطرف الثاني قبل الدخول في تاريخ الإلغاء، \nوعلى الطرف الثاني التأكيد او الإلغاء، وفي حالة عدم الرد من \nقبل الطرف الثاني يتم الإلغاء التلقائي من نظام الحجز دون أي \nمسؤولية على الطرف الأول.\n\n• عند إصدار الطرف الثاني لقسائمه الخاصة، يتعين عليه أن \nيذكر المعلومات بشكل دقيق كما هو منصوص عليها في \nالقسيمة الصادرة من نظام الحجز المباشر للطرف الأول، \nوبذلك يتحمل الطرف الثاني المسؤولية عن أي إزعاج أو \nمشكلة للعميل النهائي بسبب عدم إتباع ذلك.\n\n• الحجوزات المطلوبة عن طريق البريد الالكتروني او بالنظام \nالغير مباشر، يتم تأكيدها فقط عند استلام الطرف الأول صورة \nمن قسيمة الخدمة الخاصة بالطرف الثاني من مزود الخدمة.\n\n• الطرف الأول مسؤول عن أي حجوزات مؤكدة من طرفه \nخلال تقديم الخدمات باستثناء بعض الحجوزات التي تكون \nأصلا تحت الطلب وخاضعة لإمكانية مزود الخدمة عند \nوصول العميل النهائي.\n\n• إن كانت الخدمة او الحجز غير موجود في حالة وصول العميل \nالنهائي لمزود الخدمة وهي بالأساس مؤكدة تأكيدا نهائيا على \nنظام الحجز المباشر ومخصومة من رصيد الطرف الثاني، فإن \nالطرف الأول ملزم بتقديم بديل مماثل للحصول على الخدمة، \nوإن لم يتوفر هذا الخيار فالطرف الأول ملزم برد مبلغ الخدمة \nالمفقودة للطرف الثاني"
                            ],
                            [
                                'en' => "Receipt given by the Second Party to end \ncustomer shall contain the following information:\nBooking confirmation number of the First Party as \nrecorded in Online Direct Booking System.\nFull name of service provider or (hotel) to avoid \nsimilarity in names of hotels located within the \nsame city, which are usually affiliated to parent \noperating company.\nName(s) of customers as confirmed in pre-booking \nsystem.\nDate of check-in and check-out and/or period of \nservice.\nBooking service description and quantity.\nName of local representative at head office.\nReceipt given by the Second Party to end \ncustomer shall contain the following information:\nBooking confirmation number of the First Party as \nrecorded in Online Direct Booking System.\nFull name of service provider or (hotel) to avoid \nsimilarity in names of hotels located within the \nsame city, which are usually affiliated to parent \noperating company.\nName(s) of customers as confirmed in pre-booking \nsystem.\nDate of check-in and check-out and/or period of \nservice.\nBooking service description and quantity.\nName of local representative at head office.",
                                'ar' => "يتعين بأن تذكر قسيمة الطرف الثاني الممنوحة \nللعميل النهائي المعلومات التالية.:\n▪ رقــم تأكيد حجز الطــرف الأول كمافينظام الحجز\nالمباشر.\n▪ اســم مــزود الخدمــة أو اســم (الفنــدق) كاملا\nلتفــادي التقارب بأســماء الفنــادق الواقعة أحيانا\nفينفــسالمدينة وعادة تكونمن نفسالشركة\nالأم المشغلة.\n▪ اســم أو (أســماء) العــملاء كمــا هــو مؤكــد في\nنظام الحجز مسبقا.\n▪ تاريخ الدخول وتاريخ الخروج و/ أو مدة الخدمة.\n▪ وصف وكمية الخدمة المحجوزة.\n▪ اسم الممثل المحلي في المقر.\n▪ رقــم تأكيد حجز الطــرف الأول كمافينظام الحجز\nالمباشر.\n▪ اســم مــزود الخدمــة أو اســم (الفنــدق) كاملا\nلتفــادي التقارب بأســماء الفنــادق الواقعة أحيانا\nفينفــسالمدينة وعادة تكونمن نفسالشركة\nالأم المشغلة.\n▪ اســم أو (أســماء) العــملاء كمــا هــو مؤكــد في\nنظام الحجز مسبقا.\n▪ تاريخ الدخول وتاريخ الخروج و/ أو مدة الخدمة.\n▪ وصف وكمية الخدمة المحجوزة.\n▪ اسم الممثل المحلي في المقر."
                            ]
                        ]
                    ]
                ]
            ],
            [
                'page' => 4,
                'sections' => [
                    [
                        'key' => 'cancellation_policy',
                        'title_en' => '-4 Cancellation and Amendment Policy:',
                        'title_ar' => '-4 سياسة الإلغاء والتغيير:',
                        'clauses' => [
                            [
                                'en' => "• All services and bookings are subject to different \ncancellation and amendment policy provided by \nMain Service Provider.\n\n• The First Party is a mediator between Main Service \nProvider and the Second Party. Cancellation and \nAmendment Policy shall be provided to the Second \nParty as received from Service Provider.\n\n• Booking or service may be cancelled or amended \nwithout fine only prior to the cancellation date \nprovided by Main Service Provider to the First Party \nand subsequently to the Second Party.\n\n• In case the service was cancelled or amended by \nthe Second Party after cancellation permitted \nperiod, the service shall be subject to the terms and \nconditions stipulated in booking system provided \nby Service Provider.\n\n• In order to provide the best service possible, the \nSecond Party shall severally be liable for confirming \nhotel booking that the address mentioned in Hotel \nDescription Page on the First Part website is the \ncorrect location requested by the customer and \ndoes not rely on the searched area. The First Party \nshall not be liable in case the supplier contacting \nBooking System didn’t mention any location details, \nand that is for technical reasons beyond the control \nof the First Party.\n\n• Any correspondences or invoices exchanged \nbetween the parties hereto are confidential and \ncannot be disclosed to any third party.\n\n• The Second Party shall not under any circumstance \ndisclose any contacts or information related to the \nFirst Party to end customer utilizing the Second \nParty services.",
                                'ar' => "• جميع الخدمات والحجوزات خاضعة لسياسة إلغاء وتغيير \nمختلفة وتكون بناء عن مزود الخدمة الأساسي.\n\n• الطرف الأول هو وسيط ما بين مزود الخدمة الرئيسي \nوالطرف الثاني، وسياسة الإلغاء والتغيير يتم تزويدها للطرف \nالثاني كما هي من مزود الخدمة.\n\n• يجوز إلغاء الحجز أو الخدمة أو حتى التعديل دون غرامة فقط \nقبل تاريخ الإلغاء الممنوح من قبل مزود الخدمة الى الطرف \nالأول وبالتالي الى الطرف الثاني.\n\n• في حالة طلب إلغاء او تعديل الخدمة من الطرف الثاني بعد \nانقضاء المدة الزمنية المسموح بها للإلغاء فإن الخدمة \nتخضع لشروط وأحكام المنصوص بها في نظام الحجز من \nقبل مزود الخدمة.\n\n• بعض الخدمات لا يمكن تعديلها قبل تاريخ الإلغاء وذلك \n• لتأمين أفضل خدمة ممكنة، يعتبر من المسؤولية المنفردة \nللطرف الثاني التأكد عند حجز فندق من أن العنوان في صفحة \nوصف الفندق في موقع الطرف الأول هو الموقع الصحيح \nالذي يطلبه العميل، ولا يعتمد بشكل منفرد على المنطقة \nالتي يتم البحث عنها. لا يتحمل الطرف الأول المسئولية عن \nعدم ذكر المورد المتصل مع نظام الحجز اي تفاصيل عن \nالموقع، ترجع هذه النقطة لأسباب فنية خارجة عن إرادة \nالطرف الأول.\n\n• المراسلات او الفواتير المتبادلة بين الطرفين تعتبر سرية وغير \nقابلة للإفصاح عنها لأي جهة ثالثة.\n\n• يلتزم الطرف الثاني بعدم الإفصاح عن جهات الاتصال او \nالمعلومات الخاصة بالطرف الأول للعميل النهائي المستفيد \nمن خدمات الطرف الثاني تحت أي ظرف."
                            ]
                        ]
                    ]
                ]
            ],
            [
                'page' => 5,
                'sections' => [
                    [
                        'key' => 'payment_and_credit',
                        'title_en' => '-5 Payment and Credit \nSystem Conditions:',
                        'title_ar' => '-5 أحكام الدفع ونظام الائتمان:',
                        'clauses' => [
                            [
                                'en' => "• The second party must open a balance with the \nfirst party by transferring or paying in cash to \ncomplete its reservations and the balance is \napparent in the second party›s account.\n\n• The first party can allocate (USD 1000) to the \nsecond party account through Debit or Deferral \nPayment System In exchange for a cheque \nacceptable payment or bank guarantee so as to \nfacilitate the service.\n\n• Invoices/ Receipts shall be fully paid within one \nweeks.\n\n• In case of no balance, the First Party shall not \nconfirm the booking until full payment is made in \norder to resume booking process.\n\n• There are some events or period falls beyond the \ncontrol of the First Party and subsequently the First \nParty shall not be liable to refund or amend \nbooking, namely, but not limited to: closure dates, \nspecial seasons and holidays, conferences, events or \nother positions such as political decisions or laws \nand legislation. The First Party is entitled to claim \nprior payment from the Second Party for any \nbooking made during any of these events, and the \npostpaid system is not applicable to this item.) In \nthis case, Legendary Management MEA will attempt to refund / amend the \nbooking (if possible and will not incur any liability if \nnot).\n\n• Debit or Deferral Payment System applies only on \nservices provided via Online Direct Payment \nSystem.\n\ncontinuation\ncauses Service Provider damages and losses, but in \ncase the end customer secured written approval \nfrom the Service Provider/ Hotel directly, the \nremaining value of service may be refunded having \nbeen recovered from the Service Provider.",
                                'ar' => "• يتوجب على الطرف الثاني فتح رصيد له لدى الطرف الاول عن \nطريق التحويل او الدفع نقدا لإتمام الحجوزات الخاصة به \nويكون الرصيد ظاهر في حساب الطرف الثاني.\n\n• يمكن للطرف الأول تخصيص مبلغ (1000) دولار لحساب \nالطرف الثاني عن طريق نظام الدين أو (الدفع الأجل) مقابل \nضمان بنكي او شيك مقبول الدفع وذلك لتسهيل تقديم \nالخدمة.\n\n• الفواتير/ القسائم الصادرة تسدد بشكل كامل خلال اسبوع \nكحد أقصى.\n\n• في حالة عدم وجود رصيد لا يلتزم الطرف الاول بتأكيد الحجز \nالا إذا تم السداد كاملا للسماح باستكمال الحجز.\n\n• هناك بعض الاحداث او الفترات التي لا يد للطرف الاول فيها \nوبالتالي تنعدم مسئوليته من استرجاع قيمة الحجز او تعديله، \nوهي على سبيل المثال لا الحصر: مواعيد الإغلاق، والمواسم \nوالأعياد الخاصة، والمؤتمرات، والأحداث أو المواقف الأخرى \nمثل القرارات السياسية أو القوانين والتشريعات. وللطرف الأول \nالحق في طلب السداد المسبق لأي حجز خلال هذه الفترات \nوالأحداث من الطرف الثاني، ونظام الدفع الآجل غير مطبق \nعلى هذا البند. (وفي هذه الحالة ستحاول شركة ليجينداري مانجمنت مي إي إيه \nاستعادة / تعديل الحجز ان امكن ذلك ولا تتحمل اي مسؤولية \nفي حال عدمه)\n\n• نظام الدين او الدفع الآجل قابل للتطبيق فقط على \nالخدمات المتوفرة عبر نظام الحجز المباشر (الموقع \nالإلكتروني).\n\n• في حالة تغيير او فقد ملكية الجهة الخاصة بالطرف الثاني لأي \nسبب حتى ولو كان قهريا يحق للطرف الاول تتبع الدين المعلق \nفي اي يد يكون، كما يتوجب على الطرف الثاني اخطار الطرف \nالاول عن اي تغيير يتم في البيانات الاساسية مثل: اسم الشركة \nاو مقرها وبيانات الاتصال.\n\n• لا يسمح بأي تعديلات أو استقطاعات من قبل الطرف الثاني \nمن كشف الحساب من تلقاء نفسه، وفي حالة وجود أي \nاعتراض على الكشف يتوجب إبلاغ الطرف الأول به بشكل \nتفصيلي ورسمي خلال 15 يوم من تاريخ...\n\nاستكمال الفقرة السابقة:\nعلى موافقة خطية من مزود الخدمة / الفندق مباشرة يمكن \nاسترجاع باقي قيمة الخدمة المتبقية وذلك بعد استردادها \nمن مزود الخدمة."
                            ]
                        ]
                    ]
                ]
            ],
            [
                'page' => 6,
                'sections' => [
                    [
                        'key' => 'payment_continuation',
                        'title_en' => 'Payment and Credit Continuation',
                        'title_ar' => 'تابع أحكام الدفع',
                        'clauses' => [
                            [
                                'en' => "• In case of property transfer or loss, for any reason \nwhatsoever even if force majeure, the First Party is \nentitled to track outstanding debit to reach the \nperson liable, the Second Party shall inform the First \nParty of any change in main information such as \nname of company or head office and contact \ndetails.\n\n• No discounts shall be made on statement of \naccount by the Second Party spontaneously, and in \ncase of objection raised upon the statement, the \nFirst Party shall be officially informed of all detailed \ninformation within 15 days as of issue date, and after \nthe said period no complaint or plea shall be \nconsidered.\n\n• The payment shall be made immediately in case of \nexceeding credit limit.\n\n• The contract is valid for one year as of signing \nhereof and shall be spontaneously renewed. In case \nthe Second Party did not respect invoices payment \ndates, the contract shall be spontaneously \nterminated, and the First Party is entitled to claim \namounts payable upon the Second Party.\n\n• Payment shall be made in same currency recorded \nin the invoice in any of the following way: In cash, \nbank transfer or exchange offices.",
                                'ar' => "إصدار الكشف، ولن يتم النظر لأي شكوى أو تظلم بعد \nانقضاء تلك المدة.\n\n• يتطلب السداد بشكل فوري في حالة تجاوز حد الائتمان.\n\n• يتطلب السداد بشكل فوري في حالة تجاوز حد الائتمان.\n\n• العقد ساري لمدة سنه من تاريخ توقيعه ويجدد تلقائيا وفى \nحالة عدم التزام الطرف الثاني بمواعيد سداد الفواتير أو بنود \nهذا العقد يعتبر العقد لاغي من تلقاء نفسه ويحق للطرف \nالاول المطالبة بكل المديونية المتبقية لدى الطرف الثاني.\n\n• يتعين أن يتم السداد بالعملة المحددة في الفاتورة عبر أحد \nالأشكال الآتية: نقداً أو تحويل بنكي او تحويل عبر الصرافات."
                            ]
                        ]
                    ]
                ]
            ],
            [
                'page' => 7,
                'sections' => [
                    [
                        'key' => 'bank_details',
                        'title_en' => 'Bank Details',
                        'title_ar' => 'البيانات البنكية',
                        'clauses' => [
                            [
                                'en' => "Egypt\nBank Name: National bank of Egypt\nBank City: CAIRO\nBank Country: EGYPT\nBeneficiary Name: Legendary Management MEA\nAccount Number: 0633171511298202022\nCurrency: USD\n\nDubai\nBank Name: Mashreq Bank\nBank Branch: Dubai\nBank City: Dubai\nBank Country: United Arab Emirates\nBeneficiary Name: Trip In Click Tourism L.L.C\nAccount Number: 019101265273\nCurrency: AED\nSwift Code: ABDIAEAD\nIBAN Number: AE270500000000019043207\n\nYemen\nBank Name: Exchange\nBank Branch: Haddah\nBank City: Sana’a\nBank Country: Yemen\nBeneficiary Name: Ahmed mohamed haider \nalshalabi\nCurrency: YR – USD - SAR",
                                'ar' => "Egypt\nالبنك العربي الأفريقي الدولي AAIB :Name Bank\nBank City: CAIRO\nBank Country: EGYPT\nBeneficiary Name: Legendary Management MEA\nAccount Number: 1107077410010201\nCurrency: EGP\n\nDubai\nBank Name: Mashreq Bank\nBank Branch: Dubai\nBank City: Dubai\nBank Country: United Arab Emirates\nBeneficiary Name: Trip In Click Tourism L.L.C\nAccount Number: 019101265273\nCurrency: AED\nSwift Code: ABDIAEAD\nIBAN Number: AE270500000000019043207\n\nYemen\nBank Name: ALKURAIMI BANK\nBank Branch: HADDA\nBank City: SANAA\nBank Country: YEMEN\nBeneficiary Name: Ahmed Mohamed Haider \nAlshalabi\nMUMAIAZ NO: 22591310\nCurrency: YR – USD – SAR"
                            ]
                        ]
                    ],
                    [
                        'key' => 'final_acknowledgement',
                        'title_en' => 'Final Acknowledgement',
                        'title_ar' => 'الإقرار النهائي',
                        'clauses' => [
                            [
                                'en' => "By signing this contract, the Second Party hereby \nagrees to all the terms and conditions contained \ntherein, pledges to respect all payment items, \nand acknowledges that he reviewed and \nunquestionably fully understands it.",
                                'ar' => "بتوقيع هذا العقد، يوافق الطرفان على كافة البنود والشروط\nوالأحكام الواردة فيه، ويتعهد الطرف الثاني بالالتزام بجميع\nبنود السداد، ويقر بأنه قد أطلع عليها وفهمها بشكل كامل\nغير قابل للجدال فيما بعد"
                            ]
                        ]
                    ],
                    [
                        'key' => 'signatures',
                        'title_en' => 'Signatures',
                        'title_ar' => 'التوقيعات',
                        'clauses' => [
                            [
                                'en' => "First Party\nName:\nDate:\nSign:\n\nSecond Party\nName:\nDate:\nSign:",
                                'ar' => "الطرف الأول\nالاسم\nالتوقيع\nالتاريخ\n\nالطرف الثاني\nالاسم\nالتوقيع\nالتاريخ"
                            ]
                        ]
                    ]
                ]
            ]
        ];

        $sections = [];

        foreach ($pages as $page) {
            foreach ($page['sections'] as $section) {
                $section['page'] = $page['page'];
                $section['kind'] ??= self::inferKind((string) ($section['key'] ?? ''));
                $sections[] = $section;
            }
        }

        return $sections;
    }

    public static function normalize(?array $content): array
    {
        $content ??= self::getDefaultTemplate();

        $sections = [];

        foreach ($content as $index => $entry) {
            if (isset($entry['sections']) && is_array($entry['sections'])) {
                foreach ($entry['sections'] as $section) {
                    $section['page'] ??= $entry['page'] ?? ($index + 1);
                    $section['kind'] ??= self::inferKind((string) ($section['key'] ?? ''));
                    $sections[] = $section;
                }

                continue;
            }

            $entry['page'] ??= intdiv($index, 2) + 1;
            $entry['kind'] ??= self::inferKind((string) ($entry['key'] ?? ''));
            $sections[] = $entry;
        }

        return $sections;
    }

    private static function inferKind(string $key): string
    {
        return match ($key) {
            'parties' => 'intro',
            'preamble' => 'preamble',
            'bank_details', 'banking_information' => 'banking',
            'final_acknowledgement' => 'acknowledgement',
            'signatures' => 'signatures',
            default => str_contains($key, 'continuation') ? 'continuation' : 'terms',
        };
    }
}
