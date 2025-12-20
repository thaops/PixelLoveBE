// Centralized mood definitions for pet images
export const PET_IMAGE_MOODS = ['eat', 'walk', 'sleep', 'rest', 'love'] as const;
export type PetImageMood = (typeof PET_IMAGE_MOODS)[number];


