const bnDigits: { [key: string]: string } = {
  '0': '০',
  '1': '১',
  '2': '২',
  '3': '৩',
  '4': '৪',
  '5': '৫',
  '6': '৬',
  '7': '৭',
  '8': '৮',
  '9': '৯'
};

const bnMonths = [
  'জানুয়ারি',
  'ফেব্রুয়ারি',
  'মার্চ',
  'এপ্রিল',
  'মে',
  'জুন',
  'জুলাই',
  'আগস্ট',
  'সেপ্টেম্বর',
  'অক্টোবর',
  'নভেম্বর',
  'ডিসেম্বর'
];

export function toBengaliNumber(input: number | string): string {
  return input.toString().replace(/[0-9]/g, match => bnDigits[match] || match);
}

export function formatBengaliDate(dateInput: Date | string): string {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) {
    return 'আজকের সংবাদ';
  }

  const day = toBengaliNumber(date.getDate());
  const month = bnMonths[date.getMonth()];
  const year = toBengaliNumber(date.getFullYear());

  let hours = date.getHours();
  const minutes = toBengaliNumber(date.getMinutes().toString().padStart(2, '0'));
  let period = 'সকাল';

  if (hours >= 12 && hours < 16) {
    period = 'দুপুর';
  } else if (hours >= 16 && hours < 19) {
    period = 'বিকেল';
  } else if (hours >= 19 && hours <= 23) {
    period = 'রাত';
  } else if (hours >= 0 && hours < 6) {
    period = 'রাত';
  }

  const bnHours = toBengaliNumber(hours > 12 ? hours - 12 : (hours === 0 ? 12 : hours));

  return `${day} ${month}, ${year} | ${period} ${bnHours}:${minutes}`;
}

export function cleanBengaliHeadline(headline: string): string {
  if (!headline) return '';
  return headline
    .replace(/\s*[-–—|]\s*(প্রথম আলো|ডেইলি স্টার|বিডিনিউজ২৪|ঢাকা ট্রিবিউন|যুগান্তর|ইত্তেফাক|কালের কণ্ঠ|সমকাল|Prothom Alo|The Daily Star).*/i, '')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .trim();
}
