export const LightScheme = {
    primaryGradient: ['#10b981', '#14b8a6'], // Emerald to Teal
    primary: '#10b981',
    secondary: '#14b8a6',
    background: '#ffffff',
    surface: '#ffffff',
    text: {
        primary: '#111827',
        secondary: '#4b5563',
        muted: '#9ca3af',
        inverse: '#ffffff',
    },
    accent: {
        high: '#ef4444',
        medium: '#f59e0b',
        low: '#10b981',
    },
    glass: 'rgba(255, 255, 255, 0.7)',
    border: '#f3f4f6',
    shadow: '#000000',
    inputBackground: '#f9fafb',
    cardBorder: 'transparent',
};

export const DarkScheme = {
    primaryGradient: ['#059669', '#0d9488'], // Slightly darker Emerald
    primary: '#10b981', // Keep primary bright for contrast
    secondary: '#14b8a6',
    background: '#111827', // Gray 900
    surface: '#1f2937', // Gray 800
    text: {
        primary: '#f9fafb', // Gray 50
        secondary: '#d1d5db', // Gray 300
        muted: '#9ca3af', // Gray 400
        inverse: '#111827',
    },
    accent: {
        high: '#f87171',
        medium: '#fbbf24',
        low: '#34d399',
    },
    glass: 'rgba(31, 41, 55, 0.7)',
    border: '#374151', // Gray 700
    shadow: '#000000',
    inputBackground: '#374151',
    cardBorder: '#374151',
};

import { DarkTheme as NavigationDarkTheme, DefaultTheme as NavigationDefaultTheme } from '@react-navigation/native';

export const LIGHT_THEME = {
    ...NavigationDefaultTheme,
    dark: false,
    colors: {
        ...NavigationDefaultTheme.colors,
        primary: LightScheme.primary,
        background: LightScheme.background,
        card: LightScheme.surface,
        text: LightScheme.text.primary,
        border: LightScheme.border,
        notification: LightScheme.accent.high,
    },
};

export const DARK_THEME = {
    ...NavigationDarkTheme,
    dark: true,
    colors: {
        ...NavigationDarkTheme.colors,
        primary: DarkScheme.primary,
        background: DarkScheme.background,
        card: DarkScheme.surface,
        text: DarkScheme.text.primary,
        border: DarkScheme.border,
        notification: DarkScheme.accent.high,
    },
};

// Deprecated: Backwards compatibility until full refactor
export const COLORS = LightScheme;

export const TYPOGRAPHY = {
    h1: { fontSize: 28, fontWeight: '800', fontFamily: 'System' },
    h2: { fontSize: 22, fontWeight: '700', fontFamily: 'System' },
    h3: { fontSize: 18, fontWeight: '600', fontFamily: 'System' },
    body: { fontSize: 15, fontFamily: 'System' },
    label: { fontSize: 13, fontWeight: '500', fontFamily: 'System' },
};

export const SPACING = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 20,
    xl: 24,
    xxl: 32,
    screen: 20,
    gap: 16,
};

export const RADIUS = {
    sm: 8,
    md: 12,
    lg: 20,
    xl: 32,
    full: 9999,
};

export const SHADOWS = {
    soft: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    medium: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.1,
        shadowRadius: 16,
        elevation: 4,
    },
    premium: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
        elevation: 8,
    },
};
