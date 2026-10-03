import { NewsSourceConfig } from '../types';

export const NEWS_SOURCES: NewsSourceConfig[] = [
  {
    name: 'গুগল নিউজ (বাংলাদেশ সমগ্র)',
    code: 'google_news_bd',
    rssUrl: 'https://news.google.com/rss?hl=bn&gl=BD&ceid=BD:bn',
    siteUrl: 'https://news.google.com',
    categoryDefault: 'জাতীয়',
    enabled: true,
  },
  {
    name: 'প্রথম আলো',
    code: 'prothom_alo',
    rssUrl: 'https://www.prothomalo.com/feed',
    siteUrl: 'https://www.prothomalo.com',
    categoryDefault: 'সর্বশেষ',
    enabled: true,
  },
  {
    name: 'ডেইলি স্টার (বাংলা)',
    code: 'daily_star_bn',
    rssUrl: 'https://bangla.thedailystar.net/rss',
    siteUrl: 'https://bangla.thedailystar.net',
    categoryDefault: 'বাংলাদেশ',
    enabled: true,
  },
  {
    name: 'ঢাকা ট্রিবিউন (বাংলা)',
    code: 'dhaka_tribune_bn',
    rssUrl: 'https://bangla.dhakatribune.com/rss.xml',
    siteUrl: 'https://bangla.dhakatribune.com',
    categoryDefault: 'জাতীয়',
    enabled: true,
  },
  {
    name: 'দৈনিক ইত্তেফাক',
    code: 'ittefaq',
    rssUrl: 'https://www.ittefaq.com.bd/feed',
    siteUrl: 'https://www.ittefaq.com.bd',
    categoryDefault: 'জাতীয়',
    enabled: true,
  },
  {
    name: 'যুগান্তর',
    code: 'jugantor',
    rssUrl: 'https://www.jugantor.com/feed/rss.xml',
    siteUrl: 'https://www.jugantor.com',
    categoryDefault: 'জাতীয়',
    enabled: true,
  }
];

export const APP_CONFIG = {
  appName: 'BD News PhotoCard Generator',
  outputDir: 'output',
  dataDir: 'data',
  historyFile: 'data/history.json',
  dimensions: {
    square: { width: 1080, height: 1080 },
    portrait: { width: 1080, height: 1350 }
  },
  defaultCategory: 'সংবাদ',
  defaultLanguage: 'bn'
};
