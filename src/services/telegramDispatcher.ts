import fs from 'fs';
import { RenderResult } from '../types';
import { BRANDING_CONFIG } from '../config/branding';
import { getSettings } from '../config/settings';

export class TelegramDispatcher {
  private customToken?: string;
  private customChatId?: string;

  constructor(botToken?: string, chatId?: string) {
    this.customToken = botToken;
    this.customChatId = chatId;
  }

  private getEffectiveCredentials(): { token?: string; chatId?: string } {
    const settings = getSettings();
    const token = this.customToken || settings.apiKeys.telegramBotToken || process.env.TELEGRAM_BOT_TOKEN;
    const chatId = this.customChatId || settings.apiKeys.telegramChatId || process.env.TELEGRAM_CHAT_ID;
    return { token, chatId };
  }

  public isConfigured(): boolean {
    const { token, chatId } = this.getEffectiveCredentials();
    return !!(token && chatId);
  }

  /**
   * Dispatch rendered card to Telegram Channel
   */
  public async dispatch(renderResult: RenderResult): Promise<boolean> {
    const { token, chatId } = this.getEffectiveCredentials();
    if (!token || !chatId) {
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
      formData.append('chat_id', chatId);
      formData.append('photo', blob, renderResult.fileName);
      formData.append('caption', caption);
      formData.append('parse_mode', 'HTML');

      const url = `https://api.telegram.org/bot${token}/sendPhoto`;
      const res = await fetch(url, {
        method: 'POST',
        body: formData
      });

      const data: any = await res.json();
      if (data?.ok) {
        console.log(`✅ ফটো কার্ড সফলভাবে টেলিগ্রামে পাঠানো হয়েছে: ${renderResult.fileName}`);

        // Extract largest photo to construct public Telegram CDN image URL for Zapier/Facebook
        try {
          const photos = data.result?.photo;
          if (photos && photos.length > 0) {
            const largestPhoto = photos[photos.length - 1];
            const fileRes = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${largestPhoto.file_id}`);
            const fileData: any = await fileRes.json();
            if (fileData?.ok && fileData.result?.file_path) {
              renderResult.publicPhotoUrl = `https://api.telegram.org/file/bot${token}/${fileData.result.file_path}`;
            }
          }
        } catch (e) {
          // Non-critical: continue even if getFile fails
        }

        return true;
      } else {
        console.warn(`⚠️ টেলিগ্রাম এপিআই রেসপন্স:`, data);
      }
    } catch (error: any) {
      console.error(`❌ টেলিগ্রাম ডিসপ্যাচ ব্যর্থ হয়েছে: ${error.message}`);
    }

    return false;
  }

  /**
   * Send a test text message to verify bot connection
   */
  public async sendTestMessage(text: string): Promise<{ success: boolean; message: string }> {
    const { token, chatId } = this.getEffectiveCredentials();
    if (!token || !chatId) {
      return { success: false, message: 'টেলিগ্রাম Bot Token অথবা Chat ID কনফিগার করা নেই।' };
    }

    try {
      const url = `https://api.telegram.org/bot${token}/sendMessage`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: `🔔 <b>টেস্ট বার্তা:</b>\n${text}\n\n<i>${BRANDING_CONFIG.telegramSignature}</i>`,
          parse_mode: 'HTML'
        })
      });

      const data: any = await res.json();
      if (data?.ok) {
        return { success: true, message: 'টেলিগ্রামে সফলভাবে টেস্ট মেসেজ পৌঁছেছে!' };
      } else {
        return { success: false, message: data?.description || 'টেলিগ্রাম ত্রুটি।' };
      }
    } catch (error: any) {
      return { success: false, message: `নেটওয়ার্ক ত্রুটি: ${error.message}` };
    }
  }
}
