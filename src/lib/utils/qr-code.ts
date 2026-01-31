/**
 * QR Code Generation Utilities
 * Hospital-grade QR code generation for parking zones
 */

import QRCode from 'qrcode';
import { QR_CODE_CONFIG } from '../constants';

interface QRCodeOptions {
  width?: number;
  margin?: number;
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  color?: {
    dark?: string;
    light?: string;
  };
}

/**
 * Generate QR code as Data URL for parking zone
 */
export async function generateParkingQRCode(
  buildingSlug: string,
  parkingZoneCode?: string,
  options?: QRCodeOptions
): Promise<string> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  let url = `${baseUrl}/register/${buildingSlug}`;

  if (parkingZoneCode) {
    url += `?zone=${parkingZoneCode}`;
  }

  return generateQRCodeDataURL(url, options);
}

/**
 * Generate QR code as Data URL from any URL
 */
export async function generateQRCodeDataURL(
  url: string,
  options?: QRCodeOptions
): Promise<string> {
  const qrOptions = {
    width: options?.width ?? QR_CODE_CONFIG.size,
    margin: options?.margin ?? QR_CODE_CONFIG.margin,
    errorCorrectionLevel: options?.errorCorrectionLevel ?? QR_CODE_CONFIG.errorCorrectionLevel,
    color: {
      dark: options?.color?.dark ?? '#000000',
      light: options?.color?.light ?? '#FFFFFF',
    },
  };

  try {
    const dataUrl = await QRCode.toDataURL(url, qrOptions);
    return dataUrl;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw new Error('Failed to generate QR code');
  }
}

/**
 * Generate QR code as Buffer (for server-side saving)
 */
export async function generateQRCodeBuffer(
  url: string,
  options?: QRCodeOptions
): Promise<Buffer> {
  const qrOptions = {
    width: options?.width ?? QR_CODE_CONFIG.size,
    margin: options?.margin ?? QR_CODE_CONFIG.margin,
    errorCorrectionLevel: options?.errorCorrectionLevel ?? QR_CODE_CONFIG.errorCorrectionLevel,
    type: 'png' as const,
    color: {
      dark: options?.color?.dark ?? '#000000',
      light: options?.color?.light ?? '#FFFFFF',
    },
  };

  try {
    const buffer = await QRCode.toBuffer(url, qrOptions);
    return buffer;
  } catch (error) {
    console.error('Error generating QR code buffer:', error);
    throw new Error('Failed to generate QR code buffer');
  }
}

/**
 * Generate QR code as SVG string
 */
export async function generateQRCodeSVG(
  url: string,
  options?: QRCodeOptions
): Promise<string> {
  const qrOptions = {
    width: options?.width ?? QR_CODE_CONFIG.size,
    margin: options?.margin ?? QR_CODE_CONFIG.margin,
    errorCorrectionLevel: options?.errorCorrectionLevel ?? QR_CODE_CONFIG.errorCorrectionLevel,
    type: 'svg' as const,
    color: {
      dark: options?.color?.dark ?? '#000000',
      light: options?.color?.light ?? '#FFFFFF',
    },
  };

  try {
    const svg = await QRCode.toString(url, qrOptions);
    return svg;
  } catch (error) {
    console.error('Error generating QR code SVG:', error);
    throw new Error('Failed to generate QR code SVG');
  }
}

/**
 * Generate printable QR code with label
 */
export async function generatePrintableQRCode(
  buildingName: string,
  zoneName: string,
  buildingSlug: string,
  zoneCode: string
): Promise<string> {
  const qrDataUrl = await generateParkingQRCode(buildingSlug, zoneCode, {
    width: 600,
    margin: 4,
  });

  // Create an HTML template for printing
  // In a real implementation, you might want to use a PDF library
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${buildingName} - ${zoneName} Parking QR Code</title>
        <style>
          @page {
            size: A4;
            margin: 2cm;
          }
          body {
            font-family: Arial, sans-serif;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            padding: 20px;
          }
          .qr-container {
            text-align: center;
            border: 2px solid #333;
            padding: 30px;
            border-radius: 10px;
            background: white;
          }
          h1 {
            margin: 0 0 10px 0;
            font-size: 32px;
            color: #333;
          }
          h2 {
            margin: 0 0 30px 0;
            font-size: 24px;
            color: #666;
          }
          img {
            max-width: 600px;
            height: auto;
          }
          .instructions {
            margin-top: 30px;
            font-size: 18px;
            color: #666;
            max-width: 600px;
          }
          .code {
            margin-top: 20px;
            font-size: 14px;
            color: #999;
            font-family: monospace;
          }
          @media print {
            body {
              background: white;
            }
            .no-print {
              display: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="qr-container">
          <h1>${buildingName}</h1>
          <h2>${zoneName}</h2>
          <img src="${qrDataUrl}" alt="Parking QR Code" />
          <div class="instructions">
            <p><strong>Scan to Register Visitor Parking</strong></p>
            <p>Use your smartphone camera to scan this QR code and register your vehicle for visitor parking.</p>
          </div>
          <div class="code">Zone Code: ${zoneCode}</div>
        </div>
      </body>
    </html>
  `;
}

/**
 * Validate QR code URL format
 */
export function validateQRCodeURL(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    const path = parsedUrl.pathname;

    // Check if it matches our expected format: /register/[buildingSlug]
    const pathPattern = /^\/register\/[a-z0-9-]+$/;
    return pathPattern.test(path);
  } catch {
    return false;
  }
}

/**
 * Extract building slug and zone code from QR URL
 */
export function parseQRCodeURL(url: string): {
  buildingSlug: string | null;
  zoneCode: string | null;
} {
  try {
    const parsedUrl = new URL(url);
    const pathParts = parsedUrl.pathname.split('/').filter(Boolean);

    if (pathParts[0] !== 'register' || !pathParts[1]) {
      return { buildingSlug: null, zoneCode: null };
    }

    const buildingSlug = pathParts[1];
    const zoneCode = parsedUrl.searchParams.get('zone');

    return { buildingSlug, zoneCode };
  } catch {
    return { buildingSlug: null, zoneCode: null };
  }
}
