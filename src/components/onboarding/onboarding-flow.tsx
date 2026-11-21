import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  cubicBezier,
  Extrapolation,
  interpolate,
  type SharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import {
  ONBOARDING_SLIDES,
  type OnboardingSlide,
} from '@/constants/onboarding-slides';
import { useOnboardingStatus } from '@/lib/storage';

const CSS_EASE_OUT = cubicBezier(0.23, 1, 0.32, 1);

const SURFACE_WHITE = '#FFFFFF';
const INK_PRIMARY = '#0A0A0A';
const INK_MUTED = '#667085';
const DOT_INACTIVE = '#D0D5DD';

const HERO_FADE_GRADIENT =
  'linear-gradient(to bottom, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.72) 58%, #FFFFFF 100%)';

interface SlideItemProps {
  readonly slide: OnboardingSlide;
  readonly index: number;
  readonly pageWidth: number;
  readonly heroHeight: number;
  readonly scrollX: SharedValue<number>;
  readonly reducedMotion: boolean;
}

function SlideItem({
  slide,
  index,
  pageWidth,
  heroHeight,
  scrollX,
  reducedMotion,
}: SlideItemProps) {
  const imageAnimatedStyle = useAnimatedStyle(() => {
    const position = scrollX.get() / Math.max(pageWidth, 1);
    const distance = Math.abs(position - index);

    const opacity = interpolate(
      distance,
      [0, 0.9],
      [1, 0.55],
      Extrapolation.CLAMP
    );

    if (reducedMotion) {
      return { opacity };
    }

    const scale = interpolate(
      distance,
      [0, 1],
      [1, 1.06],
      Extrapolation.CLAMP
    );

    return {
      opacity,
      transform: [{ scale }],
    };
  });

  const copyAnimatedStyle = useAnimatedStyle(() => {
    const position = scrollX.get() / Math.max(pageWidth, 1);
    const distance = Math.abs(position - index);

    const opacity = interpolate(
      distance,
      [0, 0.65],
      [1, 0],
      Extrapolation.CLAMP
    );

    if (reducedMotion) {
      return { opacity };
    }

    const translateY = interpolate(
      distance,
      [0, 0.65],
      [0, 10],
      Extrapolation.CLAMP
    );

    return {
      opacity,
      transform: [{ translateY }],
    };
  });

  return (
    <View style={[styles.slide, { width: pageWidth }]}>
      <View style={[styles.heroContainer, { height: heroHeight }]}>
        <Animated.View style={[styles.heroImageWrap, imageAnimatedStyle]}>
          <Image
            source={slide.image}
            contentFit="cover"
            contentPosition="top"
            style={styles.heroImage}
            transition={200}
          />
        </Animated.View>

        <View
          pointerEvents="none"
          style={[
            styles.heroBottomFade,
            { experimental_backgroundImage: HERO_FADE_GRADIENT },
          ]}
        />
      </View>

      <View style={styles.indicatorSpacer} />

      <Animated.View style={[styles.copyBlock, copyAnimatedStyle]}>
        <Text style={styles.title}>{slide.title}</Text>
        <Text style={styles.description}>{slide.description}</Text>
      </Animated.View>
    </View>
  );
}

interface PageDotProps {
  readonly index: number;
  readonly pageWidth: number;
  readonly scrollX: SharedValue<number>;
}

function PageDot({ index, pageWidth, scrollX }: PageDotProps) {
  const dotAnimatedStyle = useAnimatedStyle(() => {
    const position = scrollX.get() / Math.max(pageWidth, 1);
    const distance = Math.abs(position - index);

    const width = interpolate(
      distance,
      [0, 1],
      [26, 6],
      Extrapolation.CLAMP
    );

    const opacity = interpolate(
      distance,
      [0, 1],
      [1, 0],
      Extrapolation.CLAMP
    );

    return { width, opacity };
  });

  const inactiveDotStyle = useAnimatedStyle(() => {
    const position = scrollX.get() / Math.max(pageWidth, 1);
    const distance = Math.abs(position - index);

    const width = interpolate(
      distance,
      [0, 1],
      [26, 6],
      Extrapolation.CLAMP
    );

    return { width };
  });

  return (
    <Animated.View style={[styles.dotTrack, inactiveDotStyle]}>
      <Animated.View style={[styles.dotActiveFill, dotAnimatedStyle]} />
    </Animated.View>
  );
}

function triggerLightHaptic() {
  if (process.env.EXPO_OS === 'web') {
    return;
  }

  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

function triggerSuccessHaptic() {
  if (process.env.EXPO_OS === 'web') {
    return;
  }

  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}

export function OnboardingFlow() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const { completeOnboarding } = useOnboardingStatus();

  const scrollRef = useRef<Animated.ScrollView>(null);
  const scrollX = useSharedValue(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPrimaryPressed, setIsPrimaryPressed] = useState(false);

  const heroHeight = Math.round(height * 0.56);
  const lastIndex = ONBOARDING_SLIDES.length - 1;
  const isLastSlide = activeIndex === lastIndex;
  const currentSlide = ONBOARDING_SLIDES[activeIndex] ?? ONBOARDING_SLIDES[0];

  const updateActiveIndex = (nextIndex: number) => {
    setActiveIndex((current) => {
      if (current === nextIndex) {
        return current;
      }

      triggerLightHaptic();

      return nextIndex;
    });
  };

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.set(event.contentOffset.x);
    },
    onMomentumEnd: (event) => {
      const page = Math.round(event.contentOffset.x / Math.max(width, 1));
      const clamped = Math.max(0, Math.min(page, lastIndex));

      scheduleOnRN(updateActiveIndex, clamped);
    },
  });

  const handleFinish = () => {
    triggerSuccessHaptic();
    completeOnboarding();
  };

  const handleNext = () => {
    if (isLastSlide) {
      handleFinish();

      return;
    }

    const nextIndex = activeIndex + 1;

    triggerLightHaptic();
    setActiveIndex(nextIndex);
    scrollRef.current?.scrollTo({
      x: nextIndex * width,
      animated: !reducedMotion,
    });
  };

  return (
    <View style={styles.container}>
      <Animated.ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        bounces
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={scrollHandler}
        style={styles.pager}>
        {ONBOARDING_SLIDES.map((slide, index) => (
          <SlideItem
            key={slide.id}
            slide={slide}
            index={index}
            pageWidth={width}
            heroHeight={heroHeight}
            scrollX={scrollX}
            reducedMotion={reducedMotion}
          />
        ))}
      </Animated.ScrollView>

      <View
        pointerEvents="none"
        style={[styles.dotsOverlay, { top: heroHeight + 6 }]}>
        <View style={styles.dotsRow}>
          {ONBOARDING_SLIDES.map((slide, index) => (
            <PageDot
              key={slide.id}
              index={index}
              pageWidth={width}
              scrollX={scrollX}
            />
          ))}
        </View>
      </View>

      {!isLastSlide && (
        <Pressable
          onPress={handleFinish}
          hitSlop={10}
          pressRetentionOffset={12}
          accessibilityRole="button"
          accessibilityLabel="Skip onboarding"
          style={[styles.skipPill, { top: insets.top + 12 }]}>
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      )}

      <View
        style={[
          styles.footer,
          { paddingBottom: Math.max(insets.bottom, 20) + 12 },
        ]}>
        <Pressable
          onPress={handleNext}
          onPressIn={() => setIsPrimaryPressed(true)}
          onPressOut={() => setIsPrimaryPressed(false)}
          pressRetentionOffset={16}
          accessibilityRole="button"
          accessibilityLabel={currentSlide.ctaLabel}>
          <Animated.View
            style={[
              styles.primaryButton,
              {
                transform: [{ scale: isPrimaryPressed ? 0.97 : 1 }],
                transitionProperty: 'transform',
                transitionDuration: 120,
                transitionTimingFunction: CSS_EASE_OUT,
              },
            ]}>
            <Text style={styles.primaryButtonText}>
              {currentSlide.ctaLabel}
            </Text>
          </Animated.View>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SURFACE_WHITE,
  },
  pager: {
    flex: 1,
  },
  slide: {
    flex: 1,
  },
  heroContainer: {
    width: '100%',
    overflow: 'hidden',
    backgroundColor: SURFACE_WHITE,
  },
  heroImageWrap: {
    width: '100%',
    height: '100%',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroBottomFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 112,
  },
  indicatorSpacer: {
    height: 36,
  },
  dotsOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    height: 20,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  dotTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: DOT_INACTIVE,
    overflow: 'hidden',
  },
  dotActiveFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: INK_PRIMARY,
  },
  skipPill: {
    position: 'absolute',
    right: 20,
    minHeight: 34,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.84)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipText: {
    fontSize: 13,
    fontWeight: '600',
    color: INK_PRIMARY,
  },
  copyBlock: {
    paddingHorizontal: 24,
    paddingTop: 10,
    gap: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 38,
    letterSpacing: -0.8,
    color: INK_PRIMARY,
  },
  description: {
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 22,
    color: INK_MUTED,
    maxWidth: 330,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    backgroundColor: SURFACE_WHITE,
  },
  primaryButton: {
    height: 54,
    borderRadius: 14,
    borderCurve: 'continuous',
    backgroundColor: '#c0cef5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#101828',
    letterSpacing: 0.1,
  },
});
