/**
 * Utility functions for encoding/decoding file paths in URLs
 *
 * Problem: Nginx decodes %2F to / before matching files, so we can't use
 * URL-encoded slashes in static file paths.
 *
 * Solution: Replace / with _SLASH_ for URL-safe file paths
 * Note: Using _SLASH_ instead of __ because __tests__ directories contain __
 */

/**
 * Encode a file path for use in URLs
 * Replaces / with _SLASH_ to avoid Nginx decoding issues
 */
export function encodeFilePath(filePath: string): string {
  return filePath.replace(/\//g, "_SLASH_");
}

/**
 * Decode a URL-safe file path back to original
 * Replaces _SLASH_ with /
 */
export function decodeFilePath(encodedPath: string): string {
  return encodedPath.replace(/_SLASH_/g, "/");
}
