import colors from '@/constants/colors';

/**
 * Always returns the dark palette — used by driver/technician screens
 * which should be dark regardless of the device appearance setting.
 */
export function useDriverColors() {
  return { ...colors.dark, radius: colors.radius };
}
