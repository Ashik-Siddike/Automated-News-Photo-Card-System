import dotenv from 'dotenv';
dotenv.config();

import { NewsFetcher } from './services/newsFetcher';
import { NewsDeduplicator } from './services/deduplicator';
import { AISummarizer } from './services/aiSummarizer';
import { CardRenderer } from './services/cardRenderer';
import { TelegramDispatcher } from './services/telegramDispatcher';
import { WebhookDispatcher } from './services/webhookDispatcher';
import { TemplateStyle, CardAspectRatio, NewsItem } from './types';
import { getSettings } from './config/settings';

export class PhotoCardPipeline {
  private fetcher: NewsFetcher;
  private deduplicator: NewsDeduplicator;
  private summarizer: AISummarizer;
  private renderer: CardRenderer;
  private dispatcher: TelegramDispatcher;
  private webhookDispatcher: WebhookDispatcher;

  constructor() {
    this.fetcher = new NewsFetcher();
    this.deduplicator = new NewsDeduplicator();
    this.summarizer = new AISummarizer();
    this.renderer = new CardRenderer();
    this.dispatcher = new TelegramDispatcher();
    this.webhookDispatcher = new WebhookDispatcher();
  }

  /**
   * Run one cycle of news collection and card generation
   */
  public async runCycle(maxCards: number = 3): Promise<void> {
    console.log(`\n======================================================`);
    console.log(`🕒 সংবাদ ফটো-কার্ড জেনারেশন সাইকেল শুরু: ${new Date().toLocaleString('bn-BD')}`);
    console.log(`======================================================\n`);

    try {
      // 1. Fetch latest news
      const allNews = await this.fetcher.fetchAllNews(24);

      if (allNews.length === 0) {
        console.log(`ℹ️ কোনো নতুন সংবাদ পাওয়া যায়নি।`);
        return;
      }

      // 2. Filter unread / non-duplicate news
      const freshNews = allNews.filter(n => !this.deduplicator.isDuplicate(n.sourceUrl, n.title));
      console.log(`📊 মোট পাওয়া গেছে: ${allNews.length} টি, নতুন (আন-প্রসেসড): ${freshNews.length} টি।`);

      if (freshNews.length === 0) {
        console.log(`✨ সব সংবাদ আগেই তৈরি করা হয়েছে। কোনো নতুন কার্ডের প্রয়োজন নেই।`);
        return;
      }

      // 3. Process up to maxCards
      const settings = getSettings();
      const toProcess = freshNews.slice(0, maxCards || settings.generation.maxCardsPerRun || 3);
      const defaultStyle = (process.env.TEMPLATE_STYLE as TemplateStyle) || settings.generation.defaultStyle || 'breaking';
      const defaultRatio = (process.env.CARD_ASPECT_RATIO as CardAspectRatio) || settings.generation.defaultAspectRatio || 'square';

      for (let i = 0; i < toProcess.length; i++) {
        let news = toProcess[i];
        console.log(`\n[${i + 1}/${toProcess.length}] 🎨 প্রসেসিং: "${news.title}" (${news.source})`);

        // If no image, attempt to fetch OG image
        if (!news.imageUrl) {
          console.log(`🔎 ওপেন গ্রাফ (OG) ইমেজ খোঁজা হচ্ছে...`);
          const ogImg = await this.fetcher.fetchOgImage(news.sourceUrl);
          if (ogImg) {
            news.imageUrl = ogImg;
          }
        }

        // Polish with AI if configured
        news = await this.summarizer.polishNews(news);

        // Render card
        console.log(`📸 ফটো-কার্ড রেন্ডার করা হচ্ছে (${defaultStyle} স্টাইল, ${defaultRatio})...`);
        const result = await this.renderer.renderCard({
          news,
          style: defaultStyle,
          aspectRatio: defaultRatio
        });

        console.log(`🎉 ফটো কার্ড সফলভাবে তৈরি হয়েছে: ${result.cardPath}`);

        // Mark as processed in deduplicator cache
        this.deduplicator.markProcessed(news);

        // Dispatch to Telegram if configured
        if (this.dispatcher.isConfigured()) {
          console.log(`📤 টেলিগ্রাম চ্যানেলে পাঠানো হচ্ছে...`);
          await this.dispatcher.dispatch(result);
        }

        // Dispatch to Zapier / Webhook if configured
        if (this.webhookDispatcher.isConfigured()) {
          console.log(`🔗 Zapier / Webhook-এ পাঠানো হচ্ছে...`);
          await this.webhookDispatcher.dispatch(result);
        }
      }

      console.log(`\n======================================================`);
      console.log(`✅ সাইকেল সফলভাবে সম্পন্ন হয়েছে!`);
      console.log(`======================================================\n`);
    } catch (err: any) {
      console.error(`❌ পাইপলাইনে ত্রুটি দেখা দিয়েছে:`, err);
    } finally {
      await this.renderer.close();
    }
  }
}

// Direct Execution
if (require.main === module) {
  const pipeline = new PhotoCardPipeline();
  const maxCards = parseInt(process.env.MAX_CARDS_PER_RUN || '3', 10);
  pipeline.runCycle(maxCards);
}
