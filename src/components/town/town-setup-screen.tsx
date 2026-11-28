import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { generateSuggestedTownName } from '@/game/npc-names';
import { useTownSetupStatus } from '@/game/town-db';

const TOWN_HALL_IMAGE = require('../../../assets/game_asset/Snowy Bear Town Hall.png');

const YETI_BLUE = '#40A7FC';
const PERIWINKLE_ICE = '#C0CEF5';
const OBSIDIAN_BLACK = '#0A0A0A';
const PURE_WHITE = '#FFFFFF';
const FROST_GRAY = '#E2E2E4';
const MUTED_SLATE = '#5C667A';

export function TownSetupScreen() {
  const insets = useSafeAreaInsets();
  const { foundTown } = useTownSetupStatus();

  const [townName, setTownName] = useState<string>(() =>
    generateSuggestedTownName(`boot:${Date.now()}`)
  );

  const [errorText, setErrorText] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const suggestions = useMemo(
    () => [
      generateSuggestedTownName('charter_preset_1'),
      generateSuggestedTownName('charter_preset_2'),
      generateSuggestedTownName('charter_preset_3'),
    ],
    []
  );

  const handleRandomize = () => {
    void Haptics.selectionAsync();
    setErrorText(null);
    setTownName(
      generateSuggestedTownName(`${Date.now()}:${Math.random().toFixed(4)}`)
    );
  };

  const handleSelectSuggestion = (candidate: string) => {
    void Haptics.selectionAsync();
    setErrorText(null);
    setTownName(candidate);
  };

  const handleStartTown = () => {
    const clean = townName.trim().slice(0, 48);

    if (clean.length < 2) {
      setErrorText('Please enter at least 2 characters for your town name.');
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

      return;
    }

    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setErrorText(null);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    foundTown(clean);
  };

  return (
    <KeyboardAvoidingView
      style={[
        styles.container,
        {
          paddingTop: insets.top + 12,
          paddingBottom: Math.max(insets.bottom, 16),
        },
      ]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={styles.badgePill}>
          <Text style={styles.badgeText}>YETI TOWN CHARTER</Text>
        </View>

        <View style={styles.heroCard}>
          <Image
            source={TOWN_HALL_IMAGE}
            style={styles.heroImage}
            contentFit="contain"
          />
          <Text style={styles.title}>Name Your Frontier Town</Text>
          <Text style={styles.subtitle}>
            Every citizen arrives with a unique name and an AI-driven life
            path—from quiet neighbors and Frost Cult devotees to bold traders
            and Summer challengers.
          </Text>
        </View>

        <View style={styles.formCard}>
          <View style={styles.labelRow}>
            <Text style={styles.inputLabel}>TOWN NAME</Text>
            <Pressable
              onPress={handleRandomize}
              style={({ pressed }) => [
                styles.randomBtn,
                pressed && styles.btnPressed,
              ]}>
              <Text style={styles.randomBtnText}>Shuffle Name</Text>
            </Pressable>
          </View>

          <TextInput
            value={townName}
            onChangeText={(next) => {
              setErrorText(null);
              setTownName(next);
            }}
            placeholder="e.g. Frosthaven Crest"
            placeholderTextColor="#98A2B3"
            maxLength={48}
            autoCapitalize="words"
            returnKeyType="done"
            onSubmitEditing={handleStartTown}
            style={[styles.input, errorText !== null && styles.inputError]}
          />

          {errorText !== null ? (
            <Text style={styles.errorText}>{errorText}</Text>
          ) : (
            <Text style={styles.helperText}>
              Synced live across multiplayer visits & Town Hall ledgers.
            </Text>
          )}

          <View style={styles.chipRow}>
            {suggestions.map((item) => (
              <Pressable
                key={item}
                onPress={() => handleSelectSuggestion(item)}
                style={({ pressed }) => [
                  styles.chip,
                  townName.trim() === item && styles.chipActive,
                  pressed && styles.btnPressed,
                ]}>
                <Text
                  style={[
                    styles.chipText,
                    townName.trim() === item && styles.chipTextActive,
                  ]}>
                  {item}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.rulesCard}>
          <Text style={styles.rulesTitle}>Founding Decree</Text>
          <Text style={styles.ruleLine}>
            • Single Mayor Rule: You start as sole Mayor; Summer elections pick
            one ruler.
          </Text>
          <Text style={styles.ruleLine}>
            • Residential Growth: Build Cottages to welcome newly named citizens.
          </Text>
          <Text style={styles.ruleLine}>
            • Over-Ambitious AI: Watch Profit-Hungry hoarders and Mayor
            contenders!
          </Text>
        </View>

        <Pressable
          onPress={handleStartTown}
          disabled={isSubmitting}
          style={({ pressed }) => [
            styles.primaryBtn,
            isSubmitting && styles.primaryBtnDisabled,
            pressed && styles.btnPressed,
          ]}>
          <Text style={styles.primaryBtnText}>
            {isSubmitting ? 'Founding Town...' : 'Found Town & Start'}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PURE_WHITE,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 16,
  },
  badgePill: {
    alignSelf: 'center',
    backgroundColor: PERIWINKLE_ICE,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    color: OBSIDIAN_BLACK,
  },
  heroCard: {
    alignItems: 'center',
    paddingVertical: 8,
    gap: 8,
  },
  heroImage: {
    width: 128,
    height: 128,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: OBSIDIAN_BLACK,
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: MUTED_SLATE,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  formCard: {
    backgroundColor: '#F7FAFF',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: FROST_GRAY,
    padding: 16,
    gap: 10,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.7,
    color: MUTED_SLATE,
  },
  randomBtn: {
    backgroundColor: PERIWINKLE_ICE,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  randomBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: OBSIDIAN_BLACK,
  },
  input: {
    backgroundColor: PURE_WHITE,
    borderWidth: 1.5,
    borderColor: YETI_BLUE,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 18,
    fontWeight: '700',
    color: OBSIDIAN_BLACK,
  },
  inputError: {
    borderColor: '#D92D20',
  },
  helperText: {
    fontSize: 12,
    color: MUTED_SLATE,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#D92D20',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 2,
  },
  chip: {
    backgroundColor: PURE_WHITE,
    borderWidth: 1,
    borderColor: FROST_GRAY,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipActive: {
    backgroundColor: PERIWINKLE_ICE,
    borderColor: YETI_BLUE,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: OBSIDIAN_BLACK,
  },
  chipTextActive: {
    fontWeight: '800',
  },
  rulesCard: {
    backgroundColor: '#F8F9FB',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: FROST_GRAY,
    padding: 14,
    gap: 6,
  },
  rulesTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: OBSIDIAN_BLACK,
  },
  ruleLine: {
    fontSize: 12.5,
    lineHeight: 18,
    color: MUTED_SLATE,
  },
  primaryBtn: {
    backgroundColor: YETI_BLUE,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: YETI_BLUE,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  primaryBtnDisabled: {
    opacity: 0.65,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: PURE_WHITE,
    letterSpacing: 0.2,
  },
  btnPressed: {
    opacity: 0.85,
  },
});
