export interface CannedResponse {
  id: string;
  shortcut: string;
  title: string;
  category: 'general' | 'sales' | 'support';
  text: string;
}

export const DEFAULT_CANNED_RESPONSES: CannedResponse[] = [
  {
    id: 'welcome',
    shortcut: '/ترحيب',
    title: 'رسالة ترحيبية بالعميل',
    category: 'general',
    text: 'أهلاً وسهلاً بك في خدمة العملاء! كيف يمكننا مساعدتك اليوم؟ 🌟',
  },
  {
    id: 'pricing',
    shortcut: '/اسعار',
    title: 'الأسعار والباقات المتاحة',
    category: 'sales',
    text: 'باقاتنا توفر خططاً مخصصة تناسب كافة الاحتياجات. هل ترغب برؤية جدول مقارنة المزايا والأسعار؟',
  },
  {
    id: 'bank',
    shortcut: '/حساب',
    title: 'بيانات الحساب البنكي للتحويل',
    category: 'sales',
    text: 'بيانات الحساب البنكي المعتمد: IBAN: SA0380000000000000000000 - مصرف الراجحي. يرجى تزويدنا برقم الإيصال بعد التحويل.',
  },
  {
    id: 'location',
    shortcut: '/موقع',
    title: 'المقر الرئيسي وساعات العمل',
    category: 'general',
    text: 'يسعدنا تشريفك! فرعنا الرئيسي: الرياض، طريق الملك فهد. أوقات العمل: من الأحد إلى الخميس من 9:00 صباحاً حتى 6:00 مساءً.',
  },
  {
    id: 'human',
    shortcut: '/موظف',
    title: 'تحويل الطلب لممثل خدمة عملاء',
    category: 'support',
    text: 'تم تحويل محادثتك لأحد ممثلي الدعم الفني المختصين وسيتواصل معك خلال لحظات لمساعدتك.',
  },
  {
    id: 'thanks',
    shortcut: '/شكرا',
    title: 'إنهاء الخدمة والشكر',
    category: 'general',
    text: 'سعدنا جداً بخدمتك اليوم! نتمنى لك تجربة ممتازة ولا تتردد بمراسلتنا دائماً في أي وقت.',
  },
];
