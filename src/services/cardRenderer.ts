import fs from 'fs';
import path from 'path';
import puppeteer, { Browser } from 'puppeteer-core';
import { NewsItem, RenderCardOptions, RenderResult, TemplateStyle } from '../types';
import { QRGenerator } from './qrGenerator';
import { formatBengaliDate, cleanBengaliHeadline } from '../utils/bengali';
import { APP_CONFIG } from '../config/sources';
import { BRANDING_CONFIG } from '../config/branding';

export class CardRenderer {
  private templatesDir: string;
  private outputDir: string;
  private cachedBrowser: Browser | null = null;

  constructor(customTemplatesDir?: string, customOutputDir?: string) {
    if (customTemplatesDir) {
      this.templatesDir = customTemplatesDir;
    } else if (fs.existsSync(path.resolve(__dirname, '../templates'))) {
      this.templatesDir = path.resolve(__dirname, '../templates');
    } else {
      this.templatesDir = path.resolve(process.cwd(), 'src/templates');
    }
    this.outputDir = customOutputDir || path.resolve(process.cwd(), APP_CONFIG.outputDir);

    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  /**
   * Find available Chrome/Edge browser executable across Windows/Linux/Mac
   */
  public findBrowserExecutable(): string {
    if (process.env.PUPPETEER_EXECUTABLE_PATH && fs.existsSync(process.env.PUPPETEER_EXECUTABLE_PATH)) {
      return process.env.PUPPETEER_EXECUTABLE_PATH;
    }
    if (process.env.CHROME_PATH && fs.existsSync(process.env.CHROME_PATH)) {
      return process.env.CHROME_PATH;
    }

    const candidatePaths: string[] = [
      // Windows Google Chrome
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      path.join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe'),

      // Windows Microsoft Edge
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',

      // Linux / Cloud Run / GitHub Actions
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser',

      // macOS
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'
    ];

    for (const p of candidatePaths) {
      if (p && fs.existsSync(p)) {
        return p;
      }
    }

    throw new Error('❌ No Chrome or Edge browser executable found! Please install Chrome/Edge or set CHROME_PATH.');
  }

  private async getBrowser(): Promise<Browser> {
    if (this.cachedBrowser && this.cachedBrowser.connected) {
      return this.cachedBrowser;
    }

    const executablePath = this.findBrowserExecutable();

    this.cachedBrowser = await puppeteer.launch({
      executablePath,
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--font-render-hinting=none'
      ]
    });

    return this.cachedBrowser;
  }

  public async close(): Promise<void> {
    if (this.cachedBrowser) {
      await this.cachedBrowser.close();
      this.cachedBrowser = null;
    }
  }

  /**
   * Render news item into a photo card
   */
  public async renderCard(options: RenderCardOptions): Promise<RenderResult> {
    const { news } = options;
    const style: TemplateStyle = options.style || 'breaking';
    const aspectRatio = options.aspectRatio || 'square';

    const width = APP_CONFIG.dimensions[aspectRatio].width;
    const height = APP_CONFIG.dimensions[aspectRatio].height;

    // 1. Generate Dynamic QR Code for original news URL
    const qrDataUrl = await QRGenerator.generateDataUrl(news.sourceUrl, {
      width: 180,
      margin: 1
    });

    // 2. Read Template HTML & CSS
    const templatePath = path.join(this.templatesDir, style, 'template.html');
    const commonCssPath = path.join(this.templatesDir, 'styles', 'common.css');

    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template not found at: ${templatePath}`);
    }

    let html = fs.readFileSync(templatePath, 'utf-8');
    const commonCss = fs.existsSync(commonCssPath) ? fs.readFileSync(commonCssPath, 'utf-8') : '';

    // Inline common CSS
    html = html.replace('<link rel="stylesheet" href="../styles/common.css">', `<style>${commonCss}</style>`);

    // 3. Process Content & Replacements
    const cleanTitle = cleanBengaliHeadline(news.cleanTitle || news.title);
    const dateFormatted = formatBengaliDate(news.publishedAt);
    const category = news.category || APP_CONFIG.defaultCategory;
    const fallbackImage = 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=1200&q=80';
    const imageUrl = news.imageUrl || fallbackImage;

    const brandName = options.branding?.brandName || BRANDING_CONFIG.brandName;
    const brandTagline = options.branding?.brandTagline || BRANDING_CONFIG.brandTagline;
    const brandLogoUrl = options.branding?.brandLogoUrl !== undefined 
      ? options.branding.brandLogoUrl 
      : BRANDING_CONFIG.brandLogoUrl;
    const showVerifiedBadge = options.branding?.showVerifiedBadge !== undefined 
      ? options.branding.showVerifiedBadge 
      : BRANDING_CONFIG.showVerifiedBadge;

    // Replace basic tags
    html = html
      .replace(/{{title}}/g, cleanTitle)
      .replace(/{{category}}/g, category)
      .replace(/{{source}}/g, news.source)
      .replace(/{{date}}/g, dateFormatted)
      .replace(/{{imageUrl}}/g, imageUrl)
      .replace(/{{qrCodeDataUrl}}/g, qrDataUrl)
      .replace(/{{aspectRatioClass}}/g, aspectRatio)
      .replace(/{{brandName}}/g, brandName)
      .replace(/{{brandTagline}}/g, brandTagline);

    // Conditional logo replacement
    if (brandLogoUrl && brandLogoUrl.trim().length > 0) {
      html = html.replace(/\{\{#brandLogoUrl\}\}([\s\S]*?)\{\{\/brandLogoUrl\}\}/g, '$1');
      html = html.replace(/\{\{\^brandLogoUrl\}\}[\s\S]*?\{\{\/brandLogoUrl\}\}/g, '');
      html = html.replace(/\{\{brandLogoUrl\}\}/g, brandLogoUrl);
    } else {
      html = html.replace(/\{\{#brandLogoUrl\}\}[\s\S]*?\{\{\/brandLogoUrl\}\}/g, '');
      html = html.replace(/\{\{\^brandLogoUrl\}\}([\s\S]*?)\{\{\/brandLogoUrl\}\}/g, '$1');
    }

    // Conditional verified mark replacement
    if (showVerifiedBadge) {
      html = html.replace(/\{\{#showVerifiedBadge\}\}([\s\S]*?)\{\{\/showVerifiedBadge\}\}/g, '$1');
    } else {
      html = html.replace(/\{\{#showVerifiedBadge\}\}[\s\S]*?\{\{\/showVerifiedBadge\}\}/g, '');
    }

    // Conditional summary replacement
    if (news.summary && news.summary.trim().length > 0) {
      html = html.replace(/\{\{#summary\}\}([\s\S]*?)\{\{\/summary\}\}/g, '$1');
      html = html.replace(/\{\{summary\}\}/g, news.summary);
    } else {
      html = html.replace(/\{\{#summary\}\}[\s\S]*?\{\{\/summary\}\}/g, '');
    }

    // 4. Puppeteer rendering
    const browser = await this.getBrowser();
    const page = await browser.newPage();

    try {
      await page.setViewport({
        width,
        height,
        deviceScaleFactor: 1.5 // Sharp, high-resolution cards
      });

      await page.setContent(html, {
        waitUntil: 'load',
        timeout: 25000
      });

      // Ensure Bengali fonts are completely loaded
      await page.evaluate(async () => {
        if (document.fonts) {
          await document.fonts.ready;
        }
      });

      // 5. Save Screenshot
      const timestamp = Date.now();
      const fileName = `card_${style}_${timestamp}.png`;
      const finalOutputPath = options.outputPath || path.join(this.outputDir, fileName);

      await page.screenshot({
        path: finalOutputPath,
        type: 'png',
        clip: {
          x: 0,
          y: 0,
          width,
          height
        }
      });

      return {
        cardPath: finalOutputPath,
        fileName,
        aspectRatio,
        style,
        news: {
          ...news,
          cleanTitle,
          qrCodeDataUrl: qrDataUrl
        }
      };
    } finally {
      await page.close();
    }
  }
}
