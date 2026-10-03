import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage, isFirebaseConfigured } from '../firebase';
import { ImageCompressionService } from '../imageCompression';
import { MAX_IMAGE_BYTES } from '../../config/constants';

export class FirebaseStorageService {
  /**
   * Compresses and uploads a meal photo to Firebase Storage under:
   * users/{uid}/meals/{mealId}/{filename}
   * 
   * CRITICAL SECURITY PRINCIPLE:
   * When Storage is configured, if upload fails, fail closed — do NOT persist
   * arbitrary Base64 Data URLs into the database as a fake fallback.
   */
  static async uploadMealPhoto(
    uid: string,
    mealId: string,
    fileOrBase64: File | Blob | string,
    extension = 'jpg'
  ): Promise<{ downloadUrl: string; storagePath: string }> {
    if (!uid || !mealId) {
      throw new Error('UID e mealId são obrigatórios para upload de imagem.');
    }

    // 1. Compress image
    const compressed = await ImageCompressionService.compressImage(fileOrBase64);

    // Convert dataUrl to Blob
    const response = await fetch(compressed.dataUrl);
    const blob = await response.blob();

    if (blob.size > MAX_IMAGE_BYTES) {
      throw new Error('A imagem excede o tamanho máximo permitido de 5MB.');
    }

    const safeMealId = mealId.replace(/[^a-zA-Z0-9_\-]/g, '');
    const filename = `photo_${Date.now()}.${extension.replace(/[^a-zA-Z0-9]/g, '')}`;
    const storagePath = `users/${uid}/meals/${safeMealId}/${filename}`;

    if (isFirebaseConfigured) {
      try {
        const storageRef = ref(storage, storagePath);
        await uploadBytes(storageRef, blob, {
          contentType: compressed.mimeType,
          customMetadata: {
            uploadedBy: uid,
            mealId: safeMealId,
          },
        });
        const downloadUrl = await getDownloadURL(storageRef);
        return { downloadUrl, storagePath };
      } catch (err: any) {
        console.error('[FirebaseStorageService] FAIL-CLOSED: Falha no upload para o Storage:', err.message);
        throw new Error(`Falha no upload para o Storage: ${err.message}`);
      }
    }

    if (import.meta.env.PROD) {
      throw new Error('Firebase Storage não configurado em ambiente de produção.');
    }

    // Ephemeral preview strictly for offline development without live Firebase
    return {
      downloadUrl: URL.createObjectURL(blob),
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
