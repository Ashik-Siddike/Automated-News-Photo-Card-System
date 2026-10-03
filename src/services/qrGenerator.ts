import QRCode from 'qrcode';

export interface QRCodeOptions {
  darkColor?: string;
  lightColor?: string;
  margin?: number;
  width?: number;
}

export class QRGenerator {
  public static async generateDataUrl(url: string, options?: QRCodeOptions): Promise<string> {
    try {
      const qrDataUrl = await QRCode.toDataURL(url, {
        errorCorrectionLevel: 'M',
        type: 'image/png',
        margin: options?.margin ?? 1,
        width: options?.width ?? 240,
        color: {
          dark: options?.darkColor ?? '#0f172a',
          light: options?.lightColor ?? '#ffffff'
        }
      });
      return qrDataUrl;
    } catch (error) {
      console.error('❌ QR Code generation failed for url:', url, error);
      // Fallback: minimal 1x1 transparent PNG data url
      return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
    }
  }
}
