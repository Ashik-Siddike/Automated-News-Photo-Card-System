export const BRANDING_CONFIG = {
  // আপনার পেজ বা চ্যানেলের নাম (এখানে পরিবর্তন করতে পারেন বা .env তে BRAND_NAME দিতে পারেন)
  brandName: process.env.BRAND_NAME || 'সত্য সংবাদ',

  // ছোট স্লোগান বা ট্যাগলাইন
  brandTagline: process.env.BRAND_TAGLINE || 'স্বয়ংক্রিয় সংবাদ তথ্য কার্ড • নির্ভুল ও দ্রুত',

  // ভেরিফায়েড নীল টিক চিহ্ন (true / false)
  showVerifiedBadge: true,

  // টেলিগ্রাম ক্যাপশনের শেষের ব্র্যান্ডিং লেখা
  telegramSignature: process.env.TELEGRAM_SIGNATURE || '⚡ সত্য সংবাদ ফটো কার্ড রোবট দ্বারা স্বয়ংক্রিয়ভাবে তৈরি'
};
