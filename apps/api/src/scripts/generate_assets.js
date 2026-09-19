const fs = require('fs');
const path = require('path');

const dirs = ['brochures', 'payments', 'catalog'];
for (const d of dirs) {
  const dirPath = path.resolve(__dirname, '../../uploads', d);
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

// 1. Packages Brochure SVG
const brochureSvg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 1000' width='800' height='1000'>
  <defs>
    <linearGradient id='bg' x1='0%' y1='0%' x2='100%' y2='100%'>
      <stop offset='0%' stop-color='#060911'/>
      <stop offset='50%' stop-color='#0c1424'/>
      <stop offset='100%' stop-color='#060911'/>
    </linearGradient>
  </defs>
  <rect width='100%' height='100%' fill='url(#bg)'/>
  <rect x='40' y='40' width='720' height='920' rx='28' fill='rgba(255,255,255,0.03)' stroke='rgba(255,255,255,0.08)' stroke-width='2'/>
  <text x='400' y='120' text-anchor='middle' fill='#10b981' font-family='sans-serif' font-size='24' font-weight='bold'>OMNIDESK AI ENTERPRISE</text>
  <text x='400' y='170' text-anchor='middle' fill='#ffffff' font-family='sans-serif' font-size='36' font-weight='800'>باقات الاشتراك والحلول الذكية</text>
  <text x='400' y='210' text-anchor='middle' fill='#94a3b8' font-family='sans-serif' font-size='16'>خدمة عملاء ومبيعات آلية متكاملة عبر واتساب</text>

  <!-- Card 1 -->
  <rect x='70' y='260' width='660' height='180' rx='20' fill='#0f172a' stroke='#10b981' stroke-width='1.5'/>
  <text x='690' y='310' text-anchor='end' fill='#10b981' font-family='sans-serif' font-size='22' font-weight='bold'>باقة النمو (Growth Plan)</text>
  <text x='690' y='350' text-anchor='end' fill='#ffffff' font-family='sans-serif' font-size='16'>• روبوت مبيعات ذكي بنموذج Gemini 2.5 Flash</text>
  <text x='690' y='385' text-anchor='end' fill='#ffffff' font-family='sans-serif' font-size='16'>• ربط رقم واتساب واحد مع معالجة اعتراضات الأسعار</text>
  <text x='120' y='345' text-anchor='start' fill='#10b981' font-family='sans-serif' font-size='32' font-weight='900'>499 SAR</text>
  <text x='120' y='375' text-anchor='start' fill='#64748b' font-family='sans-serif' font-size='14'>/ شهرياً</text>

  <!-- Card 2 -->
  <rect x='70' y='470' width='660' height='180' rx='20' fill='#0f172a' stroke='#06b6d4' stroke-width='1.5'/>
  <text x='690' y='520' text-anchor='end' fill='#06b6d4' font-family='sans-serif' font-size='22' font-weight='bold'>باقة الشركات (Business Pro)</text>
  <text x='690' y='560' text-anchor='end' fill='#ffffff' font-family='sans-serif' font-size='16'>• دعم قنوات متعددة + Meta Cloud API الرسمي</text>
  <text x='690' y='595' text-anchor='end' fill='#ffffff' font-family='sans-serif' font-size='16'>• قراءة الإيصالات البنكية بالذكاء الاصطناعي وذاكرة دائمة</text>
  <text x='120' y='555' text-anchor='start' fill='#06b6d4' font-family='sans-serif' font-size='32' font-weight='900'>999 SAR</text>
  <text x='120' y='585' text-anchor='start' fill='#64748b' font-family='sans-serif' font-size='14'>/ شهرياً</text>

  <!-- Card 3 -->
  <rect x='70' y='680' width='660' height='180' rx='20' fill='#0f172a' stroke='#8b5cf6' stroke-width='1.5'/>
  <text x='690' y='730' text-anchor='end' fill='#a78bfa' font-family='sans-serif' font-size='22' font-weight='bold'>باقة المؤسسات (Enterprise VIP)</text>
  <text x='690' y='770' text-anchor='end' fill='#ffffff' font-family='sans-serif' font-size='16'>• أرقام واتساب غير محدودة + مدير حساب مخصص</text>
  <text x='690' y='805' text-anchor='end' fill='#ffffff' font-family='sans-serif' font-size='16'>• تدريب مخصص على بيانات شركتك و SLA 99.9%</text>
  <text x='120' y='765' text-anchor='start' fill='#a78bfa' font-family='sans-serif' font-size='32' font-weight='900'>1999 SAR</text>
  <text x='120' y='795' text-anchor='start' fill='#64748b' font-family='sans-serif' font-size='14'>/ شهرياً</text>

  <text x='400' y='910' text-anchor='middle' fill='#64748b' font-family='sans-serif' font-size='14'>الأسعار تشمل الدعم الفني والتحديثات المستمرة</text>
</svg>`;

const uploadDir = path.resolve(__dirname, '../../uploads');
fs.writeFileSync(path.join(uploadDir, 'brochures/omni_packages.png'), brochureSvg);
fs.writeFileSync(path.join(uploadDir, 'brochures/omni_packages.svg'), brochureSvg);

// 2. Payment QR SVG
const qrSvg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 500 650' width='500' height='650'>
  <rect width='100%' height='100%' fill='#060911'/>
  <rect x='30' y='30' width='440' height='590' rx='24' fill='#0f172a' stroke='#10b981' stroke-width='2'/>
  <text x='250' y='80' text-anchor='middle' fill='#10b981' font-family='sans-serif' font-size='20' font-weight='bold'>سداد فوري وآمن (Instant Pay)</text>
  <text x='250' y='120' text-anchor='middle' fill='#ffffff' font-family='sans-serif' font-size='16'>امسح الرمز أو حوّل للحساب المعتمد</text>
  <!-- QR Box -->
  <rect x='110' y='160' width='280' height='280' rx='16' fill='#ffffff'/>
  <rect x='130' y='180' width='70' height='70' fill='#000000'/>
  <rect x='145' y='195' width='40' height='40' fill='#ffffff'/>
  <rect x='300' y='180' width='70' height='70' fill='#000000'/>
  <rect x='315' y='195' width='40' height='40' fill='#ffffff'/>
  <rect x='130' y='350' width='70' height='70' fill='#000000'/>
  <rect x='145' y='365' width='40' height='40' fill='#ffffff'/>
  <circle cx='250' cy='300' r='25' fill='#10b981'/>
  <text x='250' y='490' text-anchor='middle' fill='#ffffff' font-family='sans-serif' font-size='16' font-weight='bold'>مصرف الراجحي / STC Pay / Urpay</text>
  <text x='250' y='530' text-anchor='middle' fill='#94a3b8' font-family='sans-serif' font-size='14'>IBAN: SA0380000123456789012345</text>
  <text x='250' y='570' text-anchor='middle' fill='#10b981' font-family='sans-serif' font-size='13'>يرجى إرسال صورة الإشعار بعد التحويل</text>
</svg>`;

fs.writeFileSync(path.join(uploadDir, 'payments/payment_qr.png'), qrSvg);
fs.writeFileSync(path.join(uploadDir, 'payments/payment_qr.svg'), qrSvg);

console.log('✅ Demo visual assets successfully created in uploads/');
