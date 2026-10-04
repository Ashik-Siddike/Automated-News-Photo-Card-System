import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

import { NewsFetcher } from '../services/newsFetcher';
import { CardRenderer } from '../services/cardRenderer';
import { AISummarizer } from '../services/aiSummarizer';
import { TelegramDispatcher } from '../services/telegramDispatcher';
import { WebhookDispatcher } from '../services/webhookDispatcher';
import { NewsItem, TemplateStyle, CardAspectRatio } from '../types';
import { getSettings, saveSettings } from '../config/settings';
import { NEWS_SOURCES } from '../config/sources';

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

const outputDir = path.resolve(process.cwd(), 'output');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Serve static cards and public web files
app.use('/output', express.static(outputDir));
const publicDir = fs.existsSync(path.join(__dirname, 'public')) 
  ? path.join(__dirname, 'public') 
  : path.resolve(process.cwd(), 'src/web/public');
app.use(express.static(publicDir));

const fetcher = new NewsFetcher();
const renderer = new CardRenderer();
const summarizer = new AISummarizer();
const dispatcher = new TelegramDispatcher();
const webhookDispatcher = new WebhookDispatcher();

// API 1: List all generated cards
app.get('/api/cards', (req, res) => {
  try {
    const files = fs.readdirSync(outputDir)
      .filter(f => f.endsWith('.png') || f.endsWith('.jpg'))
      .map(file => {
        const stats = fs.statSync(path.join(outputDir, file));
        return {
          fileName: file,
          url: `/output/${file}`,
          createdAt: stats.birthtime,
          size: stats.size
        };
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    res.json({ success: true, cards: files });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API 2: Fetch today's news from portals
app.get('/api/news', async (req, res) => {
  try {
    // Instantiate fresh news fetcher to use dynamic active sources
    const activeFetcher = new NewsFetcher();
    const news = await activeFetcher.fetchAllNews(24);
    res.json({ success: true, count: news.length, news });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API 3: Generate Card on demand
app.post('/api/generate', async (req, res) => {
  try {
    const {
      title,
      summary,
      source,
      sourceUrl,
      imageUrl,
      category,
      style,
      aspectRatio,
      sendTelegram,
      branding
    } = req.body;

    if (!title || !sourceUrl) {
      return res.status(400).json({ success: false, error: 'শিরোনাম এবং সোর্স URL আবশ্যক।' });
    }

    const settings = getSettings();

    let news: NewsItem = {
      id: 'custom-' + Date.now(),
      title,
      summary: summary || '',
      source: source || 'অনলাইন ডেস্ক',
      sourceUrl,
      imageUrl: imageUrl || 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=1200&q=80',
      category: category || 'জাতীয়',
      publishedAt: new Date().toISOString()
    };

    // Refine with AI if configured
    news = await summarizer.polishNews(news);

    const result = await renderer.renderCard({
      news,
      style: (style as TemplateStyle) || settings.generation.defaultStyle || 'breaking',
      aspectRatio: (aspectRatio as CardAspectRatio) || settings.generation.defaultAspectRatio || 'square',
      branding
    });

    let telegramSent = false;
    if (sendTelegram && dispatcher.isConfigured()) {
      telegramSent = await dispatcher.dispatch(result);
    }

    res.json({
      success: true,
      card: {
        fileName: result.fileName,
        url: `/output/${result.fileName}`,
        telegramSent,
        news: result.news
      }
    });
  } catch (error: any) {
    console.error('Generate error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API 4: Get All Settings
app.get('/api/settings', (req, res) => {
  try {
    const settings = getSettings();
    res.json({ success: true, settings });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API 5: Update Settings
app.post('/api/settings', (req, res) => {
  try {
    const updated = saveSettings(req.body);
    res.json({ success: true, settings: updated, message: 'সেটিংস সফলভাবে সংরক্ষিত হয়েছে!' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API 6: Upload Brand Logo
app.post('/api/upload-logo', (req, res) => {
  try {
    const { logoData } = req.body;
    if (!logoData) {
      return res.status(400).json({ success: false, error: 'লোগো ডাটা পাওয়া যায়নি।' });
    }

    // Save as local file in output/brand-logo.png
    if (logoData.startsWith('data:image/')) {
      const base64Data = logoData.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      const logoFilePath = path.join(outputDir, 'brand-logo.png');
      fs.writeFileSync(logoFilePath, buffer);
    }

    // Update settings directly
    saveSettings({
      branding: {
        ...getSettings().branding,
        brandLogoUrl: logoData
      }
    });

    res.json({
      success: true,
      logoUrl: logoData,
      message: 'লোগো সফলভাবে আপলোড ও যুক্ত হয়েছে!'
    });
  } catch (error: any) {
    console.error('Upload logo error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API 7: Test Telegram Message
app.post('/api/test-telegram', async (req, res) => {
  try {
    const { message } = req.body;
    const testResult = await dispatcher.sendTestMessage(
      message || 'নিউজ ফটো-কার্ড অটোমেশন সিস্টেম থেকে সফল টেস্ট বার্তা!'
    );
    res.json(testResult);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// API 8: Test Zapier / Webhook
app.post('/api/test-webhook', async (req, res) => {
  try {
    const { webhookUrl } = req.body;
    const testResult = await webhookDispatcher.sendTestPayload(webhookUrl);
    res.json(testResult);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// API 9: Get Sources Status
app.get('/api/sources', (req, res) => {
  try {
    const settings = getSettings();
    const sourcesWithStatus = NEWS_SOURCES.map(source => ({
      ...source,
      enabled: settings.sources[source.code] !== undefined ? settings.sources[source.code] : source.enabled
    }));
    res.json({ success: true, sources: sourcesWithStatus });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(port, () => {
  console.log(`\n======================================================`);
  console.log(`🌐 নিউজ ফটো কার্ড ড্যাশবোর্ড চালু হয়েছে!`);
  console.log(`📍 ব্রাউজারে দেখুন: http://localhost:${port}`);
  console.log(`⚙️ কন্ট্রোল প্যানেল: http://localhost:${port}#control-panel`);
  console.log(`======================================================\n`);
});
