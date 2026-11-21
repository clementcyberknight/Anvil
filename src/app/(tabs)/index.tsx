import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useOnboardingStatus } from '@/lib/storage';

export default function HomeScreen() {
  const { resetOnboarding } = useOnboardingStatus();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.heroSection}>
          <ThemedText type="title" style={styles.title}>
            Anvil Forge
          </ThemedText>
          <ThemedText style={styles.subtitle} themeColor="textSecondary">
            Your infinite &ldquo;What If&rdquo; simulation hub is ready.
          </ThemedText>
        </View>

        <Pressable
          onPress={resetOnboarding}
          accessibilityRole="button"
          accessibilityLabel="Replay onboarding"
          style={({ pressed }) => [
            styles.replayButton,
            pressed && styles.replayButtonPressed,
          ]}>
          <Text style={styles.replayButtonText}>Replay Onboarding</Text>
        </Pressable>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    flexDirection: 'row',
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.three,
    maxWidth: MaxContentWidth,
  },
  heroSection: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    gap: Spacing.two,
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    maxWidth: 300,
  },
  replayButton: {
    paddingHorizontal: 20,
    minHeight: 44,
    borderRadius: 14,
    borderCurve: 'continuous',
    backgroundColor: '#c0cef5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  replayButtonPressed: {
    opacity: 0.75,
  },
  replayButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#101828',
  },
});
