import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage, isFirebaseConfigured } from '../firebase';
import { ImageCompressionService } from '../imageCompression';

export class FirebaseStorageService {
  /**
   * Compresses and uploads a meal photo to Firebase Storage under:
   * users/{uid}/meals/{mealId}/{filename}
   */
  static async uploadMealPhoto(
    uid: string,
    mealId: string,
    fileOrBase64: File | Blob | string,
    extension = 'jpg'
  ): Promise<{ downloadUrl: string; storagePath: string }> {
    // 1. Compress image first (FASE 14)
    const compressed = await ImageCompressionService.compressImage(fileOrBase64);

    // Convert dataUrl to Blob
    const response = await fetch(compressed.dataUrl);
    const blob = await response.blob();

    const filename = `photo_${Date.now()}.${extension}`;
    const storagePath = `users/${uid}/meals/${mealId}/${filename}`;

    if (isFirebaseConfigured) {
      try {
        const storageRef = ref(storage, storagePath);
        await uploadBytes(storageRef, blob, {
          contentType: compressed.mimeType,
          customMetadata: {
            uploadedBy: uid,
            mealId,
          },
        });
        const downloadUrl = await getDownloadURL(storageRef);
        return { downloadUrl, storagePath };
      } catch (err: any) {
        console.warn('[FirebaseStorageService] Falha no upload para Storage, mantendo preview local:', err.message);
      }
    }

    // Temporary fallback when storage credentials not configured
    return {
      downloadUrl: compressed.dataUrl,
      storagePath,
    };
  }

  /**
   * Deletes a meal photo from Firebase Storage
   */
  static async deleteMealPhoto(storagePath: string): Promise<void> {
    if (!isFirebaseConfigured || !storagePath) return;

    try {
      const storageRef = ref(storage, storagePath);
      await deleteObject(storageRef);
    } catch (err: any) {
      console.warn('[FirebaseStorageService] Falha ao excluir foto:', err.message);
    }
  }
}
