import { collection, doc, getDocs, setDoc, query, orderBy, limit, deleteDoc } from 'firebase/firestore';
import { db, isFirebaseConfigured, handleFirestoreError, OperationType } from '../firebase';
import { ChatMessage } from '../../types';
import { DateService } from '../dateService';

// Ephemeral in-memory fallback store used exclusively during offline development/testing
const inMemoryChatMessages = new Map<string, ChatMessage[]>();

export class ChatService {
  /**
   * Retrieves conversation history for user from Firestore
   */
  static async getChatMessages(uid: string, limitCount = 30): Promise<ChatMessage[]> {
    if (!uid) return [];

    if (isFirebaseConfigured) {
      const path = `users/${uid}/chatMessages`;
      try {
        const chatRef = collection(db, 'users', uid, 'chatMessages');
        const q = query(chatRef, orderBy('timestamp', 'desc'), limit(limitCount));
        const snap = await getDocs(q);
        const list: ChatMessage[] = [];
        snap.forEach(docSnap => list.push(docSnap.data() as ChatMessage));
        // Reverse array to display oldest to newest in UI
        list.reverse();
        if (list.length > 0) return list;
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, path);
      }
    }

    const list = inMemoryChatMessages.get(uid) || [];
    return list.slice(-limitCount);
  }

  /**
   * Saves a chat message to Firestore
   */
  static async saveChatMessage(uid: string, message: ChatMessage): Promise<void> {
    if (!uid) return;

    const validated: ChatMessage = {
      ...message,
      uid,
      timestamp: message.timestamp || DateService.getLocalDateTime(),
    };

    if (isFirebaseConfigured) {
      const path = `users/${uid}/chatMessages/${validated.id}`;
      try {
        const docRef = doc(db, 'users', uid, 'chatMessages', validated.id);
        await setDoc(docRef, validated, { merge: true });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, path);
      }
    } else {
      const list = inMemoryChatMessages.get(uid) || [];
      list.push(validated);
      inMemoryChatMessages.set(uid, list);
    }
  }

  /**
   * Clears chat messages for user
   */
  static async clearChat(uid: string): Promise<void> {
    if (!uid) return;

    if (isFirebaseConfigured) {
      const path = `users/${uid}/chatMessages`;
      try {
        const chatRef = collection(db, 'users', uid, 'chatMessages');
        const snap = await getDocs(chatRef);
        for (const d of snap.docs) {
          await deleteDoc(d.ref);
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, path);
      }
    } else {
      inMemoryChatMessages.delete(uid);
    }
  }
}
