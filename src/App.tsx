import React, { useState, useEffect, useCallback } from 'react';
import { 
  UserProfile, 
  NutritionGoals, 
  Meal, 
  HabitState, 
  WeightLog, 
  MealAnalysisResponse, 
  MealAnalysisSuccessResponse,
  MealType 
} from './types';
import { StorageService, DEFAULT_INITIAL_GOALS, DEFAULT_CLEAN_HABITS, createCleanProfile } from './services/storage';
import { AuthService, AuthSessionUser } from './services/authService';
import { DateService } from './services/dateService';
import { MigrationService } from './services/migrationService';
import { FirebaseStorageService } from './services/firestore/FirebaseStorageService';
import { Header } from './components/Header';
import { BottomNav, NavTab } from './components/BottomNav';
import { HomeView } from './views/HomeView';
import { DiaryView } from './views/DiaryView';
import { ProgressView } from './views/ProgressView';
import { CoachView } from './views/CoachView';
import { ProfileView } from './views/ProfileView';
import { OnboardingView } from './views/OnboardingView';
import { PhotoCaptureModal } from './components/PhotoCaptureModal';
import { VoiceModal } from './components/VoiceModal';
import { TextModal } from './components/TextModal';
import { SearchFoodModal } from './components/SearchFoodModal';
import { BarcodeModal } from './components/BarcodeModal';
import { HumanCorrectionModal } from './components/HumanCorrectionModal';
import { PrivacyModal } from './components/PrivacyModal';
import { AuthModal } from './components/AuthModal';

export default function App() {
  const initialDate = DateService.getLocalDate();

  // User & Goals State
  const [currentUser, setCurrentUser] = useState<AuthSessionUser | null>(() => AuthService.getCurrentUser());
  const [authResolved, setAuthResolved] = useState(false);
  const [activeUid, setActiveUid] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile>(() => createCleanProfile(currentUser?.uid || 'anonimo', currentUser?.displayName || 'Usuário'));
  const [goals, setGoals] = useState<NutritionGoals>(DEFAULT_INITIAL_GOALS);
  const [selectedDate, setSelectedDate] = useState<string>(initialDate);

  // Daily logs for selected date (Firestore as official source)
  const [meals, setMeals] = useState<Meal[]>([]);
  const [waterMl, setWaterMl] = useState<number>(0);
  const [habits, setHabits] = useState<HabitState>(DEFAULT_CLEAN_HABITS);
  const [weights, setWeights] = useState<WeightLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Navigation tab
  const [currentTab, setCurrentTab] = useState<NavTab>('home');

  // Modals state
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);
  const [textModalOpen, setTextModalOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [barcodeModalOpen, setBarcodeModalOpen] = useState(false);
  const [privacyModalOpen, setPrivacyModalOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Human Correction Modal State
  const [correctionData, setCorrectionData] = useState<{
    data: MealAnalysisSuccessResponse;
    photoUrl?: string;
    mealId?: string;
  } | null>(null);

  // Load all user data from Firestore
  const loadUserData = useCallback(async (uid: string) => {
    try {
      setLoading(true);
      // Run idempotent migration from legacy keys if exists
      await MigrationService.migrateLocalDataToFirestore(uid);

      const [loadedProfile, loadedGoals, loadedWeights] = await Promise.all([
        StorageService.getProfile(),
        StorageService.getGoals(),
        StorageService.getWeights(),
      ]);

      setUser(loadedProfile);
      setGoals(loadedGoals);
      setWeights(loadedWeights);
    } catch (err) {
      console.error('[App] Erro ao carregar dados do usuário:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load daily logs from Firestore for selected date
  const loadDailyData = useCallback(async (date: string) => {
    try {
      const [loadedMeals, loadedWater, loadedHabits] = await Promise.all([
        StorageService.getMeals(date),
        StorageService.getWater(date),
        StorageService.getHabits(date),
      ]);
      setMeals(loadedMeals);
      setWaterMl(loadedWater);
      setHabits(loadedHabits);
    } catch (err) {
      console.error('[App] Erro ao carregar dados diários:', err);
    }
  }, []);

  // Listen to Auth State changes
  useEffect(() => {
    AuthService.init();
    const unsub = AuthService.onAuthStateChanged(authUser => {
      setCurrentUser(authUser);
      const newUid = authUser?.uid || null;
      setActiveUid(newUid);
      setAuthResolved(true);
      if (authUser) {
        loadUserData(authUser.uid);
      } else {
        setUser(createCleanProfile('anonimo', 'Usuário'));
        setMeals([]);
        setWaterMl(0);
        setWeights([]);
        setLoading(false);
      }
    });
    return unsub;
  }, [loadUserData]);

  // Only load daily data after auth has resolved AND reload whenever activeUid or selectedDate changes
  useEffect(() => {
    if (!authResolved) return;
    loadDailyData(selectedDate);
  }, [authResolved, activeUid, selectedDate, loadDailyData]);

  // Water handler
  const handleAddWater = async (delta: number) => {
    const updated = await StorageService.addWater(selectedDate, delta);
    setWaterMl(updated);
  };

  // Habit handler - 3 state cycle
  const handleToggleHabit = async (key: keyof HabitState) => {
    const current = habits[key];
    const nextState: 'completed' | 'not_completed' | 'not_recorded' =
      current === 'not_recorded'
        ? 'completed'
        : current === 'completed'
        ? 'not_completed'
        : 'not_recorded';
    const updated: HabitState = { ...habits, [key]: nextState };
    setHabits(updated);
    await StorageService.saveHabits(selectedDate, updated);
  };

  // Weight handler
  const handleAddWeight = async (weightKg: number, date: string, notes?: string) => {
    await StorageService.addWeight(weightKg, date, notes);
    const updatedWeights = await StorageService.getWeights();
    const updatedProfile = await StorageService.getProfile();
    setWeights(updatedWeights);
    setUser(updatedProfile);
  };

  // Meal save handler (from Human Correction or Direct sources)
  const handleSaveMeal = async (meal: Meal) => {
    const mealWithDate: Meal = {
      ...meal,
      uid: user.uid,
      date: selectedDate,
      timestamp: meal.timestamp || DateService.getLocalDateTime(),
      updatedAt: DateService.getLocalDateTime(),
    };
    await StorageService.saveMeal(mealWithDate);
    const updatedMeals = await StorageService.getMeals(selectedDate);
    setMeals(updatedMeals);
    setCorrectionData(null);
  };

  // Meal deletion handler
  const handleDeleteMeal = async (id: string) => {
    await StorageService.deleteMeal(id);
    const updatedMeals = await StorageService.getMeals(selectedDate);
    setMeals(updatedMeals);
  };

  // Meal duplication handler
  const handleDuplicateMeal = async (id: string) => {
    await StorageService.duplicateMeal(id);
    const updatedMeals = await StorageService.getMeals(selectedDate);
    setMeals(updatedMeals);
  };

  // Meal edit handler
  const handleEditMeal = (meal: Meal) => {
    setCorrectionData({
      data: {
        success: true,
        mealType: meal.mealType,
        mealNameSuggestion: meal.name,
        identifiedFoods: meal.foods.map(f => ({
          name: f.name,
          estimatedQuantity: f.estimatedQuantity,
          unit: f.unit,
          confidence: f.confidence || 1.0,
        })),
        calculatedFoods: meal.foods,
        total: {
          calories: meal.totalCalories,
          protein: meal.totalProtein,
          carbohydrates: meal.totalCarbohydrates,
          fat: meal.totalFat,
          fiber: meal.totalFiber,
        },
        uncertainties: meal.uncertainties || [],
      },
      photoUrl: meal.photoUrl,
      mealId: meal.id,
    });
  };

  // Handler when photo analysis completes -> Upload to Storage & route to Human Correction
  const handlePhotoAnalysisComplete = async (data: MealAnalysisResponse, capturedPhotoUrl?: string) => {
    setPhotoModalOpen(false);
    if (!data.success) return;

    let finalPhotoUrl = capturedPhotoUrl;
    if (capturedPhotoUrl && user.uid) {
      try {
        const uploadResult = await FirebaseStorageService.uploadMealPhoto(
          user.uid,
          'meal_' + Date.now(),
          capturedPhotoUrl
        );
        finalPhotoUrl = uploadResult.downloadUrl;
      } catch (err) {
        console.warn('[App] Upload Storage falhou, mantendo URL:', err);
      }
    }

    setCorrectionData({ data, photoUrl: finalPhotoUrl });
  };

  // Handler when voice analysis completes
  const handleVoiceAnalysisComplete = (data: MealAnalysisResponse) => {
    setVoiceModalOpen(false);
    if (data.success) {
      setCorrectionData({ data });
    }
  };

  // Handler when text analysis completes
  const handleTextAnalysisComplete = (data: MealAnalysisResponse) => {
    setTextModalOpen(false);
    if (data.success) {
      setCorrectionData({ data });
    }
  };

  // Open manual search fallback directly
  const handleOpenManualFromModal = () => {
    setPhotoModalOpen(false);
    setVoiceModalOpen(false);
    setTextModalOpen(false);
    setSearchModalOpen(true);
  };

  // Handler for adding a meal directly from category button in Diary
  const handleAddMealForCategory = (_type: MealType) => {
    setSearchModalOpen(true);
  };

  // Onboarding completion
  const handleOnboardingComplete = async (
    profileData: Partial<UserProfile>,
    goalsData?: Partial<NutritionGoals>
  ) => {
    const updatedProfile = { ...user, ...profileData, onboardingCompleted: true };
    await StorageService.saveProfile(updatedProfile);
    setUser(updatedProfile);

    if (goalsData) {
      const updatedGoals = { ...goals, ...goalsData };
      await StorageService.saveGoals(updatedGoals);
      setGoals(updatedGoals);
    }
  };

  // Restart onboarding
  const handleRestartOnboarding = async () => {
    const updated = { ...user, onboardingCompleted: false };
    setUser(updated);
    await StorageService.saveProfile(updated);
  };

  // Profile update
  const handleUpdateProfile = async (newProfile: UserProfile) => {
    await StorageService.saveProfile(newProfile);
    setUser(newProfile);
  };

  // Goals update
  const handleUpdateGoals = async (newGoals: NutritionGoals) => {
    await StorageService.saveGoals(newGoals);
    setGoals(newGoals);
  };

  // Reset all data
  const handleDataReset = () => {
    setUser(createCleanProfile(currentUser?.uid || 'anonimo', currentUser?.displayName || 'Usuário'));
    setGoals(DEFAULT_INITIAL_GOALS);
    setMeals([]);
    setWaterMl(0);
    setHabits(DEFAULT_CLEAN_HABITS);
    setWeights([]);
  };

  // Do not show onboarding while auth is still resolving or data is loading
  if (!authResolved || loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 p-4">
        <div className="w-10 h-10 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium text-slate-300">Carregando CALU AI...</p>
      </div>
    );
  }

  // Show onboarding if user profile onboarding is not yet completed
  if (!user.onboardingCompleted) {
    return <OnboardingView onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-orange-500 selection:text-slate-950">
      {/* Top Android App Bar */}
      <Header
        user={user}
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        onOpenCoach={() => setCurrentTab('coach')}
        onOpenAuth={() => setAuthModalOpen(true)}
      />

      {/* Main View Container */}
      <main className="flex-1 w-full max-w-md mx-auto relative overflow-x-hidden">
        {currentTab === 'home' && (
          <HomeView
            user={user}
            goals={goals}
            meals={meals}
            waterMl={waterMl}
            habits={habits}
            onAddWater={handleAddWater}
            onOpenPhoto={() => setPhotoModalOpen(true)}
            onOpenVoice={() => setVoiceModalOpen(true)}
            onOpenText={() => setTextModalOpen(true)}
            onOpenSearch={() => setSearchModalOpen(true)}
            onOpenBarcode={() => setBarcodeModalOpen(true)}
            onOpenCoach={() => setCurrentTab('coach')}
            onNavigateToDiary={() => setCurrentTab('diary')}
          />
        )}

        {currentTab === 'diary' && (
          <DiaryView
            meals={meals}
            onDeleteMeal={handleDeleteMeal}
            onDuplicateMeal={handleDuplicateMeal}
            onEditMeal={handleEditMeal}
            onAddMealForCategory={handleAddMealForCategory}
          />
        )}

        {currentTab === 'progress' && (
          <ProgressView
            weights={weights}
            habits={habits}
            goals={goals}
            onAddWeight={handleAddWeight}
            onToggleHabit={handleToggleHabit}
          />
        )}

        {currentTab === 'coach' && (
          <CoachView user={user} goals={goals} meals={meals} />
        )}

        {currentTab === 'profile' && (
          <ProfileView
            user={user}
            goals={goals}
            onUpdateProfile={handleUpdateProfile}
            onUpdateGoals={handleUpdateGoals}
            onOpenPrivacy={() => setPrivacyModalOpen(true)}
            onOpenAuth={() => setAuthModalOpen(true)}
            onRestartOnboarding={handleRestartOnboarding}
          />
        )}
      </main>

      {/* Bottom Android Navigation Bar */}
      <BottomNav currentTab={currentTab} onTabChange={setCurrentTab} />

      {/* Modals */}
      {photoModalOpen && (
        <PhotoCaptureModal
          onAnalysisComplete={handlePhotoAnalysisComplete}
          onOpenManualEntry={handleOpenManualFromModal}
          onClose={() => setPhotoModalOpen(false)}
        />
      )}

      {voiceModalOpen && (
        <VoiceModal
          onAnalysisComplete={handleVoiceAnalysisComplete}
          onOpenManualEntry={handleOpenManualFromModal}
          onClose={() => setVoiceModalOpen(false)}
        />
      )}

      {textModalOpen && (
        <TextModal
          onAnalysisComplete={handleTextAnalysisComplete}
          onOpenManualEntry={handleOpenManualFromModal}
          onClose={() => setTextModalOpen(false)}
        />
      )}

      {searchModalOpen && (
        <SearchFoodModal
          onAddMeal={meal => {
            handleSaveMeal(meal);
            setSearchModalOpen(false);
          }}
          onClose={() => setSearchModalOpen(false)}
        />
      )}

      {barcodeModalOpen && (
        <BarcodeModal
          onAddMeal={meal => {
            handleSaveMeal(meal);
            setBarcodeModalOpen(false);
          }}
          onClose={() => setBarcodeModalOpen(false)}
        />
      )}

      {/* Mandatory Human Correction Modal ("Confira sua refeição") */}
      {correctionData && (
        <HumanCorrectionModal
          initialData={correctionData.data}
          photoUrl={correctionData.photoUrl}
          mealId={correctionData.mealId}
          uid={user.uid}
          onSave={handleSaveMeal}
          onClose={() => setCorrectionData(null)}
        />
      )}

      {/* Privacy, LGPD & Data Management Modal */}
      {privacyModalOpen && (
        <PrivacyModal
          onClose={() => setPrivacyModalOpen(false)}
          onDataReset={handleDataReset}
        />
      )}

      {/* Account & UID Authentication Modal */}
      {authModalOpen && (
        <AuthModal
          currentUser={currentUser}
          onClose={() => setAuthModalOpen(false)}
        />
      )}
    </div>
  );
}
