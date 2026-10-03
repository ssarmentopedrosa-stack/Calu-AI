import { collection, doc, getDocs, setDoc, deleteDoc, query, where, orderBy } from 'firebase/firestore';
import { db, isFirebaseConfigured, handleFirestoreError, OperationType } from '../firebase';
import { CaluMemoryItem } from '../../types';
import { DateService } from '../dateService';

export class MemoryService {
  /**
   * Retrieves active Calu memories for user
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

    try {
      const data = localStorage.getItem(`calu_v2_memories_${uid}`);
      const list: CaluMemoryItem[] = data ? JSON.parse(data) : [];
      return list.filter(m => m.isActive);
    } catch {
      return [];
    }
  }

  /**
   * Adds a new memory item
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

    if (isFirebaseConfigured) {
      const path = `users/${uid}/memories/${memory.id}`;
      try {
        const docRef = doc(db, 'users', uid, 'memories', memory.id);
        await setDoc(docRef, memory, { merge: true });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, path);
      }
    }

    try {
      const key = `calu_v2_memories_${uid}`;
      const data = localStorage.getItem(key);
      const list: CaluMemoryItem[] = data ? JSON.parse(data) : [];
      list.unshift(memory);
      localStorage.setItem(key, JSON.stringify(list));
    } catch {}
  }

  /**
   * Saves or updates a memory item directly
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
    }

    try {
      const key = `calu_v2_memories_${memory.uid}`;
      const data = localStorage.getItem(key);
      const list: CaluMemoryItem[] = data ? JSON.parse(data) : [];
      const idx = list.findIndex(m => m.id === memory.id);
      if (idx >= 0) {
        list[idx] = memory;
      } else {
        list.unshift(memory);
      }
      localStorage.setItem(key, JSON.stringify(list));
    } catch {}
  }

  /**
   * Deletes a memory item
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
    }

    try {
      const key = `calu_v2_memories_${uid}`;
      const data = localStorage.getItem(key);
      if (data) {
        const list: CaluMemoryItem[] = JSON.parse(data);
        const filtered = list.filter(m => m.id !== id);
        localStorage.setItem(key, JSON.stringify(filtered));
      }
    } catch {}
  }
}
