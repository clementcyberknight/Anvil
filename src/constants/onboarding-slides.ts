import type { ImageSource } from 'expo-image';

export interface OnboardingSlide {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly image: ImageSource;
  readonly ctaLabel: string;
}

export const ONBOARDING_SLIDES: readonly OnboardingSlide[] = [
  {
    id: 'build-living-town',
    title: 'Build a living\nYeti town.',
    description:
      'Explore the valley, gather timber and fish, build cottages, and grow a bustling alpine settlement from scratch.',
    image: require('@/assets/onboarding/slide-1.webp'),
    ctaLabel: 'Continue',
  },
  {
    id: 'citizens',
    title: 'Citizens with\nminds of their own.',
    description:
      'Every villager has a life path—some want family, faith, or community, while others trade, scheme, or walk right up to talk to you.',
    image: require('@/assets/onboarding/slide-2.webp'),
    ctaLabel: 'Continue',
  },
  {
    id: 'mayor-and-seasons',
    title: 'Rule the valley.\nWin every Summer.',
    description:
      'Start as sole Mayor, balance taxes and 2× Winter price spikes from the Treasury, and defend your seat when Summer elections arrive.',
    image: require('@/assets/onboarding/slide-3.webp'),
    ctaLabel: 'Continue',
  },
  {
    id: 'ready-to-found',
    title: 'Your frontier\nawaits.',
    description:
      'Trade with neighboring player towns, expand your population cottage by cottage, and shape a world that never stops moving.',
    image: require('@/assets/onboarding/slide-4.webp'),
    ctaLabel: 'Name Your Town',
  },
];
