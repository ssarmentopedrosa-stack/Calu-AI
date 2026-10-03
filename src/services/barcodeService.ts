import { BRAZILIAN_BARCODES } from '../data/barcodeDatabase';
import { BarcodeProduct } from '../types';

export class BarcodeService {
  /**
   * Looks up an EAN-13 barcode product in the verified Brazilian database
   */
  static async lookupProduct(barcode: string): Promise<BarcodeProduct | null> {
    const clean = barcode.trim();
    if (!clean) return null;

    // Check local catalog
    const product = BRAZILIAN_BARCODES[clean];
    if (product) {
      return {
        ...product,
        source: 'Rótulo do Fabricante (EAN-13)',
      };
    }

    // Try backend proxy if available
    try {
      const res = await fetch(`/api/barcode/${encodeURIComponent(clean)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.found && data.product) {
          return {
            ...data.product,
            source: 'Rótulo do Fabricante (EAN-13)',
          };
        }
      }
    } catch {
      // Backend lookup unavailable
    }

    return null;
  }
}
