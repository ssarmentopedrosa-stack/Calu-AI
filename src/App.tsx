import React, { useState, useEffect } from 'react';
import { 
  UserProfile, 
  NutritionGoals, 
  Meal, 
  HabitState, 
  WeightLog, 
  MealAnalysisResponse, 
  MealType 
} from './types';
import { StorageService, DEFAULT_PROFILE, DEFAULT_GOALS } from './services/storage';
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

export default function App() {
  const todayStr = new Date().toISOString().split('T')[0];

  // User & Goals State
  const [user, setUser] = useState<UserProfile>(() => StorageService.getProfile());
  const [goals, setGoals] = useState<NutritionGoals>(() => StorageService.getGoals());
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Daily logs for selected date
  const [meals, setMeals] = useState<Meal[]>(() => StorageService.getMeals(selectedDate));
  const [waterMl, setWaterMl] = useState<number>(() => StorageService.getWater(selectedDate));
  const [habits, setHabits] = useState<HabitState>(() => StorageService.getHabits(selectedDate));
  const [weights, setWeights] = useState<WeightLog[]>(() => StorageService.getWeights());

  // Navigation tab
  const [currentTab, setCurrentTab] = useState<NavTab>('home');

  // Modals state
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);
  const [textModalOpen, setTextModalOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [barcodeModalOpen, setBarcodeModalOpen] = useState(false);
  const [privacyModalOpen, setPrivacyModalOpen] = useState(false);

  // Human Correction Modal State
  const [correctionData, setCorrectionData] = useState<{
    data: MealAnalysisResponse;
    photoUrl?: string;
  } | null>(null);

  // Refresh daily state when date changes
  useEffect(() => {
    setMeals(StorageService.getMeals(selectedDate));
    setWaterMl(StorageService.getWater(selectedDate));
    setHabits(StorageService.getHabits(selectedDate));
  }, [selectedDate]);

  // Water handler
  const handleAddWater = (delta: number) => {
    const updated = StorageService.addWater(selectedDate, delta);
    setWaterMl(updated);
  };

  // Habit handler
  const handleToggleHabit = (key: keyof HabitState) => {
    const updated = { ...habits, [key]: !habits[key] };
    setHabits(updated);
    StorageService.saveHabits(selectedDate, updated);
  };

  // Weight handler
  const handleAddWeight = (weightKg: number, date: string, note?: string) => {
    StorageService.addWeight(weightKg, date, note);
    setWeights(StorageService.getWeights());
    setUser(StorageService.getProfile());
  };

  // Meal save handler (from Human Correction or Direct sources)
  const handleSaveMeal = (meal: Meal) => {
    const mealWithDate = {
      ...meal,
      date: selectedDate,
    };
    StorageService.saveMeal(mealWithDate);
    setMeals(StorageService.getMeals(selectedDate));
    setCorrectionData(null);
  };

  // Meal deletion handler
  const handleDeleteMeal = (id: string) => {
    StorageService.deleteMeal(id);
    setMeals(StorageService.getMeals(selectedDate));
  };

  // Meal duplication handler
  const handleDuplicateMeal = (id: string) => {
    StorageService.duplicateMeal(id);
    setMeals(StorageService.getMeals(selectedDate));
  };

  // Meal edit handler
  const handleEditMeal = (meal: Meal) => {
    setCorrectionData({
      data: {
        mealType: meal.mealType,
        mealNameSuggestion: meal.name,
        foods: meal.foods,
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
    });
  };

  // Handler when photo analysis completes -> route to Human Correction
  const handlePhotoAnalysisComplete = (data: MealAnalysisResponse, photoUrl?: string) => {
    setPhotoModalOpen(false);
    setCorrectionData({ data, photoUrl });
  };

  // Handler when voice analysis completes -> route to Human Correction
  const handleVoiceAnalysisComplete = (data: MealAnalysisResponse) => {
    setVoiceModalOpen(false);
    setCorrectionData({ data });
  };

  // Handler when text analysis completes -> route to Human Correction
  const handleTextAnalysisComplete = (data: MealAnalysisResponse) => {
    setTextModalOpen(false);
    setCorrectionData({ data });
  };

  // Handler for adding a meal directly from category button in Diary
  const handleAddMealForCategory = (type: MealType) => {
    setSearchModalOpen(true);
  };

  // Onboarding completion
  const handleOnboardingComplete = (
    profileData: Partial<UserProfile>,
    goalsData?: Partial<NutritionGoals>
  ) => {
    const updatedProfile = { ...user, ...profileData, onboardingCompleted: true };
    StorageService.saveProfile(updatedProfile);
    setUser(updatedProfile);

    if (goalsData) {
      const updatedGoals = { ...goals, ...goalsData };
      StorageService.saveGoals(updatedGoals);
      setGoals(updatedGoals);
    }
  };

  // Restart onboarding
  const handleRestartOnboarding = () => {
    const updated = { ...user, onboardingCompleted: false };
    setUser(updated);
    StorageService.saveProfile(updated);
  };

  // Profile update
  const handleUpdateProfile = (newProfile: UserProfile) => {
    StorageService.saveProfile(newProfile);
    setUser(newProfile);
  };

  // Goals update
  const handleUpdateGoals = (newGoals: NutritionGoals) => {
    StorageService.saveGoals(newGoals);
    setGoals(newGoals);
  };

  // Reset all data
  const handleDataReset = () => {
    setUser(DEFAULT_PROFILE);
    setGoals(DEFAULT_GOALS);
    setMeals(StorageService.getMeals(selectedDate));
    setWaterMl(StorageService.getWater(selectedDate));
    setHabits(StorageService.getHabits(selectedDate));
    setWeights(StorageService.getWeights());
  };

  // Show onboarding if not yet completed
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
          onClose={() => setPhotoModalOpen(false)}
        />
      )}

      {voiceModalOpen && (
        <VoiceModal
          onAnalysisComplete={handleVoiceAnalysisComplete}
          onClose={() => setVoiceModalOpen(false)}
        />
      )}

      {textModalOpen && (
        <TextModal
          onAnalysisComplete={handleTextAnalysisComplete}
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
    </div>
  );
}
