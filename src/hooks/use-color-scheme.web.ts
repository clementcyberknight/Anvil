import { useSyncExternalStore } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

function subscribeHydration(): () => void {
  return () => {};
}

function getClientHydrated(): boolean {
  return true;
}

function getServerHydrated(): boolean {
  return false;
}

/**
 * To support static rendering, this value needs to be re-calculated on the client side for web
 */
export function useColorScheme(): 'light' | 'dark' | 'unspecified' {
  const hasHydrated = useSyncExternalStore(
    subscribeHydration,
    getClientHydrated,
    getServerHydrated
  );

  const colorScheme = useRNColorScheme();

  if (hasHydrated && colorScheme !== null && colorScheme !== undefined) {
    return colorScheme;
  }

  return 'light';
}
