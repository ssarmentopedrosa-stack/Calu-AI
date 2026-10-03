import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db, isFirebaseConfigured, handleFirestoreError, OperationType } from '../firebase';
import { Meal } from '../../types';
import { DateService } from '../dateService';

// Ephemeral in-memory fallback store used exclusively during offline development/testing
const inMemoryMeals = new Map<string, Meal[]>();

export class MealService {
  /**
   * Retrieves meals for a specific local date from Firestore
   */
  static async getMealsByDate(uid: string, date: string): Promise<Meal[]> {
    if (!uid) return [];

    if (isFirebaseConfigured) {
      const path = `users/${uid}/meals`;
      try {
        const mealsRef = collection(db, 'users', uid, 'meals');
        const q = query(mealsRef, where('date', '==', date), orderBy('timestamp', 'asc'));
        const snap = await getDocs(q);
        const meals: Meal[] = [];
        snap.forEach(docSnap => meals.push(docSnap.data() as Meal));
        return meals;
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, path);
      }
    }

    const userMeals = inMemoryMeals.get(uid) || [];
    return userMeals.filter(m => m.date === date);
  }

  /**
   * Retrieves recent meals for history and reports from Firestore
   */
  static async getAllMeals(uid: string, limitCount = 50): Promise<Meal[]> {
    if (!uid) return [];

    if (isFirebaseConfigured) {
      const path = `users/${uid}/meals`;
      try {
        const mealsRef = collection(db, 'users', uid, 'meals');
        const q = query(mealsRef, orderBy('timestamp', 'desc'), limit(limitCount));
        const snap = await getDocs(q);
        const meals: Meal[] = [];
        snap.forEach(docSnap => meals.push(docSnap.data() as Meal));
        return meals;
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, path);
      }
    }

    const userMeals = inMemoryMeals.get(uid) || [];
    return userMeals.slice(0, limitCount);
  }

  /**
   * Saves a meal to Firestore
   */
  static async saveMeal(meal: Meal): Promise<void> {
    if (!meal.uid) return;

    const validatedMeal: Meal = {
      ...meal,
      updatedAt: DateService.getLocalDateTime(),
      timestamp: meal.timestamp || DateService.getLocalDateTime(),
    };

    if (isFirebaseConfigured) {
      const path = `users/${meal.uid}/meals/${meal.id}`;
      try {
        const docRef = doc(db, 'users', meal.uid, 'meals', meal.id);
        await setDoc(docRef, validatedMeal, { merge: true });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, path);
      }
    } else {
      const list = inMemoryMeals.get(meal.uid) || [];
      const idx = list.findIndex(m => m.id === meal.id);
      if (idx >= 0) {
        list[idx] = validatedMeal;
      } else {
        list.unshift(validatedMeal);
      }
      inMemoryMeals.set(meal.uid, list);
    }
  }

  /**
   * Deletes a meal from Firestore
   */
  static async deleteMeal(uid: string, mealId: string): Promise<void> {
    if (!uid || !mealId) return;

    if (isFirebaseConfigured) {
      const path = `users/${uid}/meals/${mealId}`;
      try {
        const docRef = doc(db, 'users', uid, 'meals', mealId);
        await deleteDoc(docRef);
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, path);
      }
    } else {
      const list = inMemoryMeals.get(uid) || [];
      inMemoryMeals.set(uid, list.filter(m => m.id !== mealId));
    }
  }

  /**
   * Duplicates a meal for quick logging
   */
  static async duplicateMeal(uid: string, mealId: string): Promise<Meal | null> {
    const all = await this.getAllMeals(uid, 50);
    const existing = all.find(m => m.id === mealId);
    if (!existing) return null;

    const now = DateService.getLocalDateTime();
    const duplicated: Meal = {
      ...existing,
      id: 'meal_' + Date.now(),
      uid,
      name: `${existing.name} (Cópia)`,
      time: DateService.getLocalTime(),
      date: DateService.getLocalDate(),
      timestamp: now,
      userConfirmed: true,
      createdAt: now,
      updatedAt: now,
    };

    await this.saveMeal(duplicated);
    return duplicated;
  }
}
