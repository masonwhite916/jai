/**
 * JAI Roadside Assistance — Brand Design Tokens
 *
 * Primary:   Deep Indigo  #2D1B69
 * Secondary: Royal Purple #5B2C91
 * Accent:    Magenta      #C21875
 */

const colors = {
  light: {
    text: '#1A1A1A',
    tint: '#2D1B69',

    background: '#FFFFFF',
    foreground: '#1A1A1A',

    card: '#FFFFFF',
    cardForeground: '#1A1A1A',

    primary: '#C21875',
    primaryForeground: '#FFFFFF',

    secondary: '#5B2C91',
    secondaryForeground: '#FFFFFF',

    muted: '#F8F9FC',
    mutedForeground: '#6B7280',

    accent: '#C21875',
    accentForeground: '#FFFFFF',

    destructive: '#E74C3C',
    destructiveForeground: '#FFFFFF',

    success: '#2ECC71',
    warning: '#F39C12',

    border: '#EBEBF5',
    input: '#F0F0F8',

    // Gradient stops
    gradientStart: '#2D1B69',
    gradientMid: '#5B2C91',
    gradientEnd: '#C21875',
  },

  /** Driver / technician screens always use the dark palette */
  dark: {
    text: '#EEEDF5',
    tint: '#C21875',

    background: '#0B0A0F',
    foreground: '#EEEDF5',

    card: '#1A1726',
    cardForeground: '#EEEDF5',

    primary: '#C21875',
    primaryForeground: '#FFFFFF',

    secondary: '#5B2C91',
    secondaryForeground: '#FFFFFF',

    muted: '#1A1726',
    mutedForeground: '#8E8A9D',

    accent: '#C21875',
    accentForeground: '#FFFFFF',

    destructive: '#E74C3C',
    destructiveForeground: '#FFFFFF',

    success: '#2ECC71',
    warning: '#F39C12',

    border: 'rgba(255,255,255,0.08)',
    input: '#1A1726',

    // Gradient stops
    gradientStart: '#2D1B69',
    gradientMid: '#5B2C91',
    gradientEnd: '#C21875',
  },

  radius: 16,
};

export default colors;
