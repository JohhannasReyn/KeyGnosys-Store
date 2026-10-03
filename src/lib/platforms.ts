/** Schema support for a platform does NOT imply product support (spec §5.2). */
export const PLATFORMS = ['windows', 'linux'] as const;
export type Platform = (typeof PLATFORMS)[number];
export const PLATFORM_NAMES: Record<Platform, string> = { windows: 'Windows', linux: 'Linux' };
