/**
 * Automatic Client-Side Image Compression Utility (HTML5 Canvas)
 * Seamlessly downscales and compresses high-resolution photos (even 20MB - 50MB+)
 * to optimized, lightweight formats with crisp clinical clarity.
 */

export interface CompressOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.1 - 1.0 (default 0.85)
  outputType?: string; // 'image/jpeg' | 'image/webp'
}

export interface CompressedImageResult {
  dataUrl: string;
  size: number;
  name: string;
  type: string;
}

export async function compressImage(
  file: File,
  options: CompressOptions = {}
): Promise<CompressedImageResult> {
  const {
    maxWidth = 1600,
    maxHeight = 1600,
    quality = 0.85,
    outputType = 'image/jpeg'
  } = options;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to parse image data'));
      img.onload = () => {
        let { width, height } = img;

        // Maintain aspect ratio while bounding within maxWidth & maxHeight
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('Canvas 2D context not available'));
        }

        // Apply smooth high-quality bicubic interpolation
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Convert canvas to compressed data URL
        const dataUrl = canvas.toDataURL(outputType, quality);

        // Approximate byte size from Base64 string
        const base64Index = dataUrl.indexOf(';base64,');
        const pureBase64 = base64Index !== -1 ? dataUrl.substring(base64Index + 8) : dataUrl;
        const sizeInBytes = Math.round((pureBase64.length * 3) / 4);

        const newName = file.name.replace(/\.[^/.]+$/, '') + (outputType === 'image/webp' ? '.webp' : '.jpg');

        resolve({
          dataUrl,
          size: sizeInBytes,
          name: newName,
          type: outputType
        });
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
