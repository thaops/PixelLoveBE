/**
 * File Upload Utilities
 * Helper functions for file validation and processing
 */

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const MAX_AUDIO_SIZE = 5 * 1024 * 1024; // 5MB for audio
export const MAX_AUDIO_DURATION = 60; // 60 seconds

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif'];

export const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime'];

export const ALLOWED_AUDIO_TYPES = [
  'audio/m4a',
  'audio/aac',
  'audio/mp3',
  'audio/mpeg',
  'audio/wav',
  'audio/x-m4a',
];

/**
 * Validate file size
 */
export function validateFileSize(file: Express.Multer.File): boolean {
  return file.size <= MAX_FILE_SIZE;
}

/**
 * Validate image file type
 */
export function validateImageType(file: Express.Multer.File): boolean {
  return ALLOWED_IMAGE_TYPES.includes(file.mimetype);
}

/**
 * Validate video file type
 */
export function validateVideoType(file: Express.Multer.File): boolean {
  return ALLOWED_VIDEO_TYPES.includes(file.mimetype);
}

export function validateAudioType(file: Express.Multer.File): boolean {
  return ALLOWED_AUDIO_TYPES.includes(file.mimetype);
}

export function validateAudioSize(file: Express.Multer.File): boolean {
  return file.size <= MAX_AUDIO_SIZE;
}

export function validateAudioDuration(duration: number): boolean {
  return duration > 0 && duration <= MAX_AUDIO_DURATION;
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  return filename.split('.').pop() || '';
}

/**
 * Generate unique filename
 */
export function generateUniqueFilename(
  prefix: string,
  extension: string,
): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}_${timestamp}_${random}.${extension}`;
}

