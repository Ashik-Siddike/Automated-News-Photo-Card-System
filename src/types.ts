export interface NewsItem {
  id: string; // Hash of URL or GUID
  title: string;
  cleanTitle?: string;
  summary: string;
  source: string; // e.g., 'প্রথম আলো', 'ডেইলি স্টার', 'বিডিনিউজ২৪'
  sourceUrl: string;
  imageUrl?: string;
  category?: string;
  publishedAt: string;
  author?: string;
  qrCodeDataUrl?: string;
}

export interface NewsSourceConfig {
  name: string;
  code: string;
  rssUrl: string;
  siteUrl: string;
  logoUrl?: string;
  categoryDefault?: string;
  enabled: boolean;
}

export type TemplateStyle = 'breaking' | 'editorial' | 'quote' | 'modern';

export type CardAspectRatio = 'square' | 'portrait'; // square: 1080x1080, portrait: 1080x1350

export interface RenderCardOptions {
  news: NewsItem;
  style?: TemplateStyle;
  aspectRatio?: CardAspectRatio;
  outputPath?: string;
}

export interface RenderResult {
  cardPath: string;
  fileName: string;
  aspectRatio: CardAspectRatio;
  style: TemplateStyle;
  news: NewsItem;
}
