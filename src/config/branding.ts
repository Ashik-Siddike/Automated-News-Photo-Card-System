import { getSettings } from './settings';

export const BRANDING_CONFIG = {
  get brandName(): string {
    return getSettings().branding.brandName;
  },

  get brandTagline(): string {
    return getSettings().branding.brandTagline;
  },

  get brandLogoUrl(): string | undefined {
    return getSettings().branding.brandLogoUrl;
  },

  get showVerifiedBadge(): boolean {
    return getSettings().branding.showVerifiedBadge;
  },

  get telegramSignature(): string {
    return getSettings().branding.telegramSignature;
  }
};
