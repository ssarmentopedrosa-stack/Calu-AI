import { IMAGE_UPLOAD_LIMITS } from '../config/constants';

export class ImageCompressionService {
  /**
   * Compresses and rescales an image (DataURL, Blob or File) using an offscreen canvas
   * to ensure fast upload and safe transmission to Gemini and Firebase Storage.
   */
  static async compressImage(
    source: File | Blob | string,
    maxDimension = IMAGE_UPLOAD_LIMITS.maxDimension,
    quality = IMAGE_UPLOAD_LIMITS.quality
  ): Promise<{ dataUrl: string; mimeType: string; sizeBytes: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Downscale maintaining aspect ratio
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Falha ao instanciar canvas de compressão.'));
          return;
        }

        // Draw image with smooth rendering
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        const mimeType = 'image/jpeg';
        const dataUrl = canvas.toDataURL(mimeType, quality);

        // Approximate size calculation from base64
        const head = 'data:image/jpeg;base64,';
        const sizeBytes = Math.round(((dataUrl.length - head.length) * 3) / 4);

        resolve({
          dataUrl,
          mimeType,
          sizeBytes,
        });
      };

      img.onerror = () => {
        reject(new Error('Não foi possível carregar a imagem para processamento.'));
      };

      if (typeof source === 'string') {
        img.src = source;
      } else {
        const reader = new FileReader();
        reader.onload = e => {
          img.src = e.target?.result as string;
        };
        reader.onerror = () => reject(new Error('Erro na leitura do arquivo de imagem.'));
        reader.readAsDataURL(source);
      }
    });
  }
}
