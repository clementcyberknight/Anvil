import { createMMKV, useMMKVBoolean } from 'react-native-mmkv';

export const sessionStorage = createMMKV({ id: 'anvil-session' });

export const STORAGE_KEYS = {
  onboardingCompleted: 'onboarding.completed',
} as const;

export function getOnboardingCompleted(): boolean {
  return sessionStorage.getBoolean(STORAGE_KEYS.onboardingCompleted) ?? false;
}

export function setOnboardingCompleted(completed: boolean): void {
  sessionStorage.set(STORAGE_KEYS.onboardingCompleted, completed);
}

export function useOnboardingStatus() {
  const [storedValue, setStoredValue] = useMMKVBoolean(
    STORAGE_KEYS.onboardingCompleted,
    sessionStorage
  );

  const hasCompletedOnboarding = storedValue ?? false;

  const completeOnboarding = () => {
    setStoredValue(true);
  };

  const resetOnboarding = () => {
    setStoredValue(false);
  };

  return {
    hasCompletedOnboarding,
    completeOnboarding,
    resetOnboarding,
  };
}
