import fs from 'fs';
import path from 'path';
import { TemplateStyle, CardAspectRatio } from '../types';

export interface AppSettings {
  branding: {
    brandName: string;
    brandTagline: string;
    brandLogoUrl?: string; // Base64 data URL or image URL
    showVerifiedBadge: boolean;
    telegramSignature: string;
  };
  generation: {
    defaultStyle: TemplateStyle;
    defaultAspectRatio: CardAspectRatio;
    maxCardsPerRun: number;
    enableAi: boolean;
  };
  apiKeys: {
    geminiApiKey?: string;
    telegramBotToken?: string;
    telegramChatId?: string;
    zapierWebhookUrl?: string;
  };
  sources: {
    [code: string]: boolean;
  };
}

const SETTINGS_FILE_PATH = path.resolve(process.cwd(), 'data/settings.json');

function getDefaultSettings(): AppSettings {
  return {
    branding: {
      brandName: process.env.BRAND_NAME || 'সত্য সংবাদ',
      brandTagline: process.env.BRAND_TAGLINE || 'স্বয়ংক্রিয় সংবাদ তথ্য কার্ড • নির্ভুল ও দ্রুত',
      brandLogoUrl: process.env.BRAND_LOGO_URL || '',
      showVerifiedBadge: true,
      telegramSignature: process.env.TELEGRAM_SIGNATURE || '⚡ সত্য সংবাদ ফটো কার্ড রোবট দ্বারা স্বয়ংক্রিয়ভাবে তৈরি'
    },
    generation: {
      defaultStyle: (process.env.TEMPLATE_STYLE as TemplateStyle) || 'breaking',
      defaultAspectRatio: (process.env.CARD_ASPECT_RATIO as CardAspectRatio) || 'square',
      maxCardsPerRun: parseInt(process.env.MAX_CARDS_PER_RUN || '3', 10),
      enableAi: true
    },
    apiKeys: {
      geminiApiKey: process.env.GEMINI_API_KEY || '',
      telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '',
      telegramChatId: process.env.TELEGRAM_CHAT_ID || '',
      zapierWebhookUrl: process.env.ZAPIER_WEBHOOK_URL || ''
    },
    sources: {
      google_news_bd: true,
      prothom_alo: true,
      daily_star_bn: true,
      dhaka_tribune_bn: true,
      ittefaq: true,
      jugantor: true
    }
  };
}

let cachedSettings: AppSettings | null = null;

export function getSettings(): AppSettings {
  if (cachedSettings) {
    return cachedSettings;
  }

  try {
    const dir = path.dirname(SETTINGS_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (fs.existsSync(SETTINGS_FILE_PATH)) {
      const data = fs.readFileSync(SETTINGS_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(data);
      const defaults = getDefaultSettings();

      // Deep merge with defaults to ensure all keys exist
      cachedSettings = {
        branding: { ...defaults.branding, ...(parsed.branding || {}) },
        generation: { ...defaults.generation, ...(parsed.generation || {}) },
        apiKeys: { ...defaults.apiKeys, ...(parsed.apiKeys || {}) },
        sources: { ...defaults.sources, ...(parsed.sources || {}) }
      };
    } else {
      cachedSettings = getDefaultSettings();
      saveSettings(cachedSettings);
    }
  } catch (error) {
    console.warn('⚠️ Could not load settings from file, using defaults:', error);
    cachedSettings = getDefaultSettings();
  }

  return cachedSettings;
}

export function saveSettings(newSettings: Partial<AppSettings>): AppSettings {
  try {
    const current = getSettings();
    const merged: AppSettings = {
      branding: { ...current.branding, ...(newSettings.branding || {}) },
      generation: { ...current.generation, ...(newSettings.generation || {}) },
      apiKeys: { ...current.apiKeys, ...(newSettings.apiKeys || {}) },
      sources: { ...current.sources, ...(newSettings.sources || {}) }
    };

    const dir = path.dirname(SETTINGS_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(SETTINGS_FILE_PATH, JSON.stringify(merged, null, 2), 'utf-8');
    cachedSettings = merged;

    // Also update runtime process.env for convenience
    if (merged.branding.brandName) process.env.BRAND_NAME = merged.branding.brandName;
    if (merged.branding.brandTagline) process.env.BRAND_TAGLINE = merged.branding.brandTagline;
    if (merged.apiKeys.geminiApiKey) process.env.GEMINI_API_KEY = merged.apiKeys.geminiApiKey;
    if (merged.apiKeys.telegramBotToken) process.env.TELEGRAM_BOT_TOKEN = merged.apiKeys.telegramBotToken;
    if (merged.apiKeys.telegramChatId) process.env.TELEGRAM_CHAT_ID = merged.apiKeys.telegramChatId;
    if (merged.generation.defaultStyle) process.env.TEMPLATE_STYLE = merged.generation.defaultStyle;
    if (merged.generation.defaultAspectRatio) process.env.CARD_ASPECT_RATIO = merged.generation.defaultAspectRatio;

    return merged;
  } catch (error) {
    console.error('❌ Failed to save settings to disk:', error);
    throw error;
  }
}
