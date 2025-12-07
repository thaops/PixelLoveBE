/**
 * File Upload Utilities
 * Helper functions for file validation and processing
 */

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif'];

export const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime'];

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

