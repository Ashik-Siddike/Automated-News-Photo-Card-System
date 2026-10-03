import { NewsItem } from '../types';

export class AISummarizer {
  private apiKey?: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.GEMINI_API_KEY;
  }

  /**
   * Refine news headline and summary with Gemini API if available
   */
  public async polishNews(news: NewsItem): Promise<NewsItem> {
    if (!this.apiKey) {
      return news;
    }

    try {
      const prompt = `তুমি একজন শীর্ষস্থানীয় বাংলাদেশি সংবাদপত্রের সিনিয়র ফটো-কার্ড সম্পাদক। 
নিচের সংবাদটি বিশ্লেষণ করে ফটো-কার্ডের জন্য মানানসই আকর্ষনীয় শিরোনাম, সংক্ষিপ্ত সারসংক্ষেপ এবং সঠিক ক্যাটাগরি তৈরি করো:

মূল শিরোনাম: "${news.title}"
মূল বিবরণ: "${news.summary}"
উৎস: "${news.source}"

নির্দেশনা:
1. শিরোনাম হতে হবে সর্বোচ্চ ১২-১৪ শব্দের মধ্যে, অত্যন্ত স্পষ্ট, নির্মোহ এবং আকর্ষণীয় (যুক্তাক্ষর সহ প্রমিত বাংলা)।
2. সারসংক্ষেপ বা বুলেট পয়েন্ট হতে হবে সর্বোচ্চ ২০-২৫ শব্দ।
3. ক্যাটাগরি যেকোনো একটি হবে: জাতীয়, রাজনীতি, অর্থনীতি, আন্তর্জাতিক, প্রযুক্তি, খেলাধুলা, মতামত, বিশেষ প্রতিবেদন।

JSON ফরম্যাটে উত্তর দাও:
{
  "headline": "...",
  "summary": "...",
  "category": "..."
}`;

      const endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': this.apiKey
        },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.3
          }
        })
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Gemini API error status: ${response.status}`);
      }

      const data: any = await response.json();
      const responseText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (responseText) {
        const parsed = JSON.parse(responseText);
        return {
          ...news,
          cleanTitle: parsed.headline || news.cleanTitle || news.title,
          summary: parsed.summary || news.summary,
          category: parsed.category || news.category
        };
      }
    } catch (err: any) {
      console.warn(`⚠️ AI Summarizer skipped due to error (${err.message}). Using original content.`);
    }

    return news;
  }
}
