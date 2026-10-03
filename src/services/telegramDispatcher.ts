import fs from 'fs';
import { RenderResult } from '../types';
import { BRANDING_CONFIG } from '../config/branding';

export class TelegramDispatcher {
  private botToken?: string;
  private chatId?: string;

  constructor(botToken?: string, chatId?: string) {
    this.botToken = botToken || process.env.TELEGRAM_BOT_TOKEN;
    this.chatId = chatId || process.env.TELEGRAM_CHAT_ID;
  }

  public isConfigured(): boolean {
    return !!(this.botToken && this.chatId);
  }

  /**
   * Dispatch rendered card to Telegram Channel
   */
  public async dispatch(renderResult: RenderResult): Promise<boolean> {
    if (!this.isConfigured() || !this.botToken || !this.chatId) {
      return false;
    }

    try {
      const { news, cardPath } = renderResult;
      const fileData = fs.readFileSync(cardPath);

      const caption = `📰 <b>${news.cleanTitle || news.title}</b>\n\n` +
                      (news.summary ? `💬 <i>${news.summary}</i>\n\n` : '') +
                      `📌 <b>উৎস:</b> ${news.source}\n` +
                      `🔗 <b>মূল প্রতিবেদন:</b> <a href="${news.sourceUrl}">এখানে ক্লিক করুন</a>\n` +
                      `<i>${BRANDING_CONFIG.telegramSignature}</i>`;

      const blob = new Blob([fileData], { type: 'image/png' });
      const formData = new FormData();
      formData.append('chat_id', this.chatId);
      formData.append('photo', blob, renderResult.fileName);
      formData.append('caption', caption);
      formData.append('parse_mode', 'HTML');

      const url = `https://api.telegram.org/bot${this.botToken}/sendPhoto`;
      const res = await fetch(url, {
        method: 'POST',
        body: formData
      });

      const data: any = await res.json();
      if (data?.ok) {
        console.log(`✅ ফটো কার্ড সফলভাবে টেলিগ্রামে পাঠানো হয়েছে: ${renderResult.fileName}`);
        return true;
      } else {
        console.warn(`⚠️ টেলিগ্রাম এপিআই রেসপন্স:`, data);
      }
    } catch (error: any) {
      console.error(`❌ টেলিগ্রাম ডিসপ্যাচ ব্যর্থ হয়েছে: ${error.message}`);
    }

    return false;
  }
}
