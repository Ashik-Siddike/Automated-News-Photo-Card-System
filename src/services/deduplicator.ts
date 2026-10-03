import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { NewsItem } from '../types';
import { APP_CONFIG } from '../config/sources';

interface HistoryRecord {
  id: string;
  url: string;
  titleHash: string;
  title: string;
  source: string;
  processedAt: string;
}

export class NewsDeduplicator {
  private historyPath: string;
  private history: HistoryRecord[] = [];
  private maxHistory: number = 1000;

  constructor(customHistoryPath?: string) {
    this.historyPath = customHistoryPath || path.resolve(process.cwd(), APP_CONFIG.historyFile);
    this.loadHistory();
  }

  private loadHistory(): void {
    try {
      const dir = path.dirname(this.historyPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      if (fs.existsSync(this.historyPath)) {
        const raw = fs.readFileSync(this.historyPath, 'utf-8');
        this.history = JSON.parse(raw);
      } else {
        this.history = [];
        this.saveHistory();
      }
    } catch (err) {
      console.warn('⚠️ Error loading history file, resetting cache:', err);
      this.history = [];
    }
  }

  private saveHistory(): void {
    try {
      const dir = path.dirname(this.historyPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.historyPath, JSON.stringify(this.history.slice(-this.maxHistory), null, 2), 'utf-8');
    } catch (err) {
      console.error('❌ Failed to save history cache:', err);
    }
  }

  public hashTitle(title: string): string {
    // Normalize Bengali title by stripping whitespace and punctuation
    const clean = title.replace(/[^\u0980-\u09FFa-zA-Z0-9]/g, '').trim().toLowerCase();
    return crypto.createHash('sha256').update(clean).digest('hex').substring(0, 16);
  }

  public hashUrl(url: string): string {
    const cleanUrl = url.split('?')[0].replace(/\/+$/, '').toLowerCase();
    return crypto.createHash('sha256').update(cleanUrl).digest('hex').substring(0, 16);
  }

  public isDuplicate(url: string, title: string): boolean {
    const uHash = this.hashUrl(url);
    const tHash = this.hashTitle(title);

    return this.history.some(record => record.id === uHash || record.titleHash === tHash);
  }

  public markProcessed(news: NewsItem): void {
    const uHash = this.hashUrl(news.sourceUrl);
    const tHash = this.hashTitle(news.title);

    if (this.isDuplicate(news.sourceUrl, news.title)) {
      return;
    }

    this.history.push({
      id: uHash,
      url: news.sourceUrl,
      titleHash: tHash,
      title: news.title,
      source: news.source,
      processedAt: new Date().toISOString()
    });

    this.saveHistory();
  }

  public getAll(): HistoryRecord[] {
    return [...this.history];
  }

  public clear(): void {
    this.history = [];
    this.saveHistory();
  }
}
