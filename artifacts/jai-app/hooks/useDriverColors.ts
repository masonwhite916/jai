import colors from '@/constants/colors';

/**
 * Returns the light palette for driver/technician screens —
 * same visual theme as the customer app.
 */
export function useDriverColors() {
  return { ...colors.light, radius: colors.radius };
}
