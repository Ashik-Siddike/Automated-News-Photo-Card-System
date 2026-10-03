import Parser from 'rss-parser';
import * as cheerio from 'cheerio';
import crypto from 'crypto';
import { NewsItem, NewsSourceConfig } from '../types';
import { NEWS_SOURCES } from '../config/sources';
import { cleanBengaliHeadline } from '../utils/bengali';

export class NewsFetcher {
  private parser: Parser;
  private sources: NewsSourceConfig[];

  constructor(customSources?: NewsSourceConfig[]) {
    this.parser = new Parser({
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
      },
      customFields: {
        item: [
          ['media:content', 'mediaContent'],
          ['media:thumbnail', 'mediaThumbnail'],
          ['enclosure', 'enclosure']
        ]
      }
    });

    this.sources = customSources || NEWS_SOURCES.filter(s => s.enabled);
  }

  /**
   * Extract image URL from feed item
   */
  private extractImageUrl(item: any): string | undefined {
    // 1. Enclosure
    if (item.enclosure?.url) {
      return item.enclosure.url;
    }

    // 2. Media content
    if (item.mediaContent?.$?.url) {
      return item.mediaContent.$.url;
    }

    // 3. Media thumbnail
    if (item.mediaThumbnail?.$?.url) {
      return item.mediaThumbnail.$.url;
    }

    // 4. HTML snippet check inside content / summary
    const content = item['content:encoded'] || item.content || item.summary;
    if (content) {
      const match = content.match(/<img[^>]+src=["']([^"']+)["']/i);
      if (match && match[1]) {
        return match[1];
      }
    }

    return undefined;
  }

  /**
   * Scrape OG image from page if RSS feed lacked image
   */
  public async fetchOgImage(url: string): Promise<string | undefined> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        }
      });
      clearTimeout(timeoutId);
      const html = await res.text();
      const $ = cheerio.load(html);
      const ogImg = $('meta[property="og:image"]').attr('content') ||
                    $('meta[name="twitter:image"]').attr('content');
      return ogImg;
    } catch {
      return undefined;
    }
  }

  /**
   * Fetch today's news from a single source
   */
  public async fetchSourceNews(source: NewsSourceConfig, maxAgeHours: number = 24): Promise<NewsItem[]> {
    const results: NewsItem[] = [];
    const now = Date.now();
    const cutoffTime = now - (maxAgeHours * 60 * 60 * 1000);

    try {
      console.log(`📡 ফেচিং নিউজ: ${source.name}...`);
      const feed = await this.parser.parseURL(source.rssUrl);

      for (const item of feed.items) {
        if (!item.title || !item.link) continue;

        // Check published date
        const pubDate = item.isoDate || item.pubDate;
        const itemTimestamp = pubDate ? new Date(pubDate).getTime() : now;

        // Filter within maxAgeHours
        if (itemTimestamp < cutoffTime) {
          continue;
        }

        const cleanTitle = cleanBengaliHeadline(item.title);
        const imageUrl = this.extractImageUrl(item);
        const summary = item.contentSnippet ? item.contentSnippet.replace(/\n/g, ' ').slice(0, 160).trim() : '';

        // Generate unique deterministic ID
        const id = crypto.createHash('md5').update(item.link).digest('hex');

        results.push({
          id,
          title: item.title.trim(),
          cleanTitle,
          summary: summary ? (summary.endsWith('...') ? summary : summary + '...') : '',
          source: source.name.replace(/ \(.*\)/, ''),
          sourceUrl: item.link.trim(),
          imageUrl,
          category: source.categoryDefault || 'সংবাদ',
          publishedAt: pubDate || new Date().toISOString()
        });
      }
    } catch (error: any) {
      console.warn(`⚠️ সতর্কতা: ${source.name} থেকে ফেচ করা যায়নি: ${error.message}`);
    }

    return results;
  }

  /**
   * Fetch news concurrently from all configured sources
   */
  public async fetchAllNews(maxAgeHours: number = 24): Promise<NewsItem[]> {
    console.log(`🚀 শীর্ষস্থানীয় বাংলাদেশি পোর্টালগুলো থেকে আজকের সংবাদ সংগ্রহ করা হচ্ছে...`);
    const promises = this.sources.map(s => this.fetchSourceNews(s, maxAgeHours));
    const allResults = await Promise.all(promises);

    const merged = allResults.flat();

    // Sort by latest publishedAt first
    merged.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

    console.log(`✅ মোট ${merged.length} টি সংবাদ পাওয়া গেছে।`);
    return merged;
  }
}
