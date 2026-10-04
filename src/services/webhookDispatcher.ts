import { RenderResult } from '../types';
import { getSettings } from '../config/settings';
import { BRANDING_CONFIG } from '../config/branding';

export class WebhookDispatcher {
  private customWebhookUrl?: string;

  constructor(webhookUrl?: string) {
    this.customWebhookUrl = webhookUrl;
  }

  public isConfigured(): boolean {
    const settings = getSettings();
    const url = this.customWebhookUrl || settings.apiKeys.zapierWebhookUrl || process.env.ZAPIER_WEBHOOK_URL;
    return !!(url && url.startsWith('http'));
  }

  public async dispatch(renderResult: RenderResult): Promise<boolean> {
    const settings = getSettings();
    const url = this.customWebhookUrl || settings.apiKeys.zapierWebhookUrl || process.env.ZAPIER_WEBHOOK_URL;

    if (!url || !url.startsWith('http')) {
      return false;
    }

    try {
      const { news } = renderResult;
      const photoUrl = renderResult.publicPhotoUrl || news.imageUrl || 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=1200&q=80';

      const payload = {
        photoUrl,
        title: news.cleanTitle || news.title,
        summary: news.summary || '',
        source: news.source,
        sourceUrl: news.sourceUrl,
        category: news.category || 'সংবাদ',
        publishedAt: news.publishedAt,
        cardFileName: renderResult.fileName,
        brandName: BRANDING_CONFIG.brandName,
        caption: `📰 ${news.cleanTitle || news.title}\n\n${news.summary ? news.summary + '\n\n' : ''}📌 উৎস: ${news.source}\n🔗 মূল প্রতিবেদন: ${news.sourceUrl}\n${BRANDING_CONFIG.telegramSignature}`
      };

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        console.log(`✅ Zapier / Webhook-এ সফলভাবে ডেটা পাঠানো হয়েছে!`);
        return true;
      } else {
        console.warn(`⚠️ Webhook রেসপন্স স্ট্যাটাস: ${res.status}`);
      }
    } catch (error: any) {
      console.error(`❌ Webhook ডিসপ্যাচ ব্যর্থ হয়েছে: ${error.message}`);
    }

    return false;
  }

  public async sendTestPayload(webhookUrl?: string): Promise<{ success: boolean; message: string }> {
    const settings = getSettings();
    const url = webhookUrl || this.customWebhookUrl || settings.apiKeys.zapierWebhookUrl || process.env.ZAPIER_WEBHOOK_URL;

    if (!url || !url.startsWith('http')) {
      return { success: false, message: 'অনুগ্রহ করে সঠিক Zapier Webhook URL দিন।' };
    }

    try {
      const testPayload = {
        photoUrl: 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=1200&q=80',
        title: 'টেস্ট সংবাদ: আধুনিক মিডিয়া ফটো-কার্ড অটোমেশন',
        summary: 'Zapier এবং সামাজিক যোগাযোগ মাধ্যমে স্বয়ংক্রিয় ফটো কার্ড পোস্ট করার টেস্ট বার্তা।',
        source: 'সত্য সংবাদ',
        sourceUrl: 'https://news.google.com',
        category: 'প্রযুক্তি',
        brandName: BRANDING_CONFIG.brandName,
        publishedAt: new Date().toISOString(),
        caption: `📰 টেস্ট সংবাদ: আধুনিক মিডিয়া ফটো-কার্ড অটোমেশন\n\n💬 Zapier এবং সামাজিক যোগাযোগ মাধ্যমে স্বয়ংক্রিয় ফটো কার্ড পোস্ট করার টেস্ট বার্তা।\n\n📌 উৎস: সত্য সংবাদ\n🔗 মূল প্রতিবেদন: https://news.google.com\n${BRANDING_CONFIG.telegramSignature}`
      };

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testPayload)
      });

      if (res.ok) {
        return { success: true, message: 'Zapier Webhook-এ টেস্ট ডেটা সফলভাবে পাঠানো হয়েছে!' };
      } else {
        return { success: false, message: `Webhook ত্রুটি: স্ট্যাটাস ${res.status}` };
      }
    } catch (error: any) {
      return { success: false, message: `নেটওয়ার্ক ত্রুটি: ${error.message}` };
    }
  }
}
