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
    id: 'live-another-life',
    title: 'Live another life.',
    description:
      'Step into any era as a ruler, founder, or rebel—make bold moves and build a story worth flexing.',
    image: require('@/assets/yeti/imagescroll_v2_0005_Layer-5.jpg'),
    ctaLabel: 'Continue',
  },
  {
    id: 'call-the-shots',
    title: 'Call the shots.',
    description:
      'Strike deals, redraw borders, or take over the city. The world reacts to whatever you decide.',
    image: require('@/assets/yeti/imagescroll_v2_0006_Layer-4.jpg'),
    ctaLabel: 'Continue',
  },
  {
    id: 'endless-stories',
    title: 'Endless stories\nto explore.',
    description:
      'Jump into worlds created by other players, or dream up your own scenario in seconds.',
    image: require('@/assets/yeti/imagescroll_v2_0003_Layer-7.jpg'),
    ctaLabel: 'Continue',
  },
  {
    id: 'ready-to-rule',
    title: 'Your world is\nready to rule.',
    description:
      'Pick a timeline, make your first move, and see how far your choices can take you.',
    image: require('@/assets/yeti/lofimeditate_V2final.jpg'),
    ctaLabel: 'Start Playing',
  },
];
