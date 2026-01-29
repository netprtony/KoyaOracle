/**
 * Dark theme for Werewolf GM app
 */
export const theme = {
    colors: {
        background: '#0a0a0a',
        surface: '#1a1a1a',
        surfaceLight: '#2a2a2a',
        primary: '#6366f1',
        primaryDark: '#4f46e5',
        secondary: '#8b5cf6', // Violet 500
        text: '#ffffff',
        textSecondary: '#a0a0a0',
        danger: '#ef4444',
        success: '#10b981',
        warning: '#f59e0b',
        border: '#333333',
    },
    spacing: {
        xs: 4,
        sm: 8,
        md: 16,
        lg: 24,
        xl: 32,
        xxl: 48,
    },
    borderRadius: {
        sm: 4,
        md: 8,
        lg: 12,
        xl: 16,
    },
    fontSize: {
        xs: 12,
        sm: 14,
        md: 16,
        lg: 18,
        xl: 24,
        xxl: 32,
    },
    minTapTarget: 48,
    fonts: {
        regular: 'TNH-Xuong',
        bold: 'TNH-Xuong', // Assuming only one weight provided for now
    },
};

export type Theme = typeof theme;
