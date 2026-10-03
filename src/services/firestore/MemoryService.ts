import { collection, doc, getDocs, setDoc, deleteDoc, query, where, orderBy } from 'firebase/firestore';
import { db, isFirebaseConfigured, handleFirestoreError, OperationType } from '../firebase';
import { CaluMemoryItem } from '../../types';
import { DateService } from '../dateService';

// Ephemeral in-memory fallback store used exclusively during offline development/testing
const inMemoryMemories = new Map<string, CaluMemoryItem[]>();

export class MemoryService {
  /**
   * Retrieves active Calu memories for user from Firestore
   */
  static async getMemories(uid: string): Promise<CaluMemoryItem[]> {
    if (!uid) return [];

    if (isFirebaseConfigured) {
      const path = `users/${uid}/memories`;
      try {
        const memRef = collection(db, 'users', uid, 'memories');
        const q = query(memRef, where('isActive', '==', true), orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);
        const list: CaluMemoryItem[] = [];
        snap.forEach(docSnap => list.push(docSnap.data() as CaluMemoryItem));
        return list;
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, path);
      }
    }

    const list = inMemoryMemories.get(uid) || [];
    return list.filter(m => m.isActive);
  }

  /**
   * Adds a new memory item to Firestore
   */
  static async addMemory(
    uid: string,
    content: string,
    category: CaluMemoryItem['category']
  ): Promise<void> {
    if (!uid || !content.trim()) return;

    const now = DateService.getLocalDateTime();
    const memory: CaluMemoryItem = {
      id: 'm_' + Date.now(),
      uid,
      content: content.trim(),
      category,
      source: 'usuario',
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    await this.saveMemory(memory);
  }

  /**
   * Saves or updates a memory item directly in Firestore
   */
  static async saveMemory(memory: CaluMemoryItem): Promise<void> {
    if (!memory.uid || !memory.id) return;

    if (isFirebaseConfigured) {
      const path = `users/${memory.uid}/memories/${memory.id}`;
      try {
        const docRef = doc(db, 'users', memory.uid, 'memories', memory.id);
        await setDoc(docRef, memory, { merge: true });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, path);
      }
    } else {
      const list = inMemoryMemories.get(memory.uid) || [];
      const idx = list.findIndex(m => m.id === memory.id);
      if (idx >= 0) {
        list[idx] = memory;
      } else {
        list.unshift(memory);
      }
      inMemoryMemories.set(memory.uid, list);
    }
  }

  /**
   * Deletes a memory item from Firestore
   */
  static async deleteMemory(uid: string, id: string): Promise<void> {
    if (!uid || !id) return;

    if (isFirebaseConfigured) {
      const path = `users/${uid}/memories/${id}`;
      try {
        const docRef = doc(db, 'users', uid, 'memories', id);
        await deleteDoc(docRef);
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, path);
      }
    } else {
      const list = inMemoryMemories.get(uid) || [];
      inMemoryMemories.set(uid, list.filter(m => m.id !== id));
    }
  }
}
