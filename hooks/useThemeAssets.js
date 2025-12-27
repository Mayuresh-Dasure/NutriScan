import { useTheme } from '../context/ThemeContext';

/**
 * Hook to get theme-aware assets
 * Usage: const assets = useThemeAssets();
 * Then: <Image source={assets.logo} />
 */
export const useThemeAssets = () => {
    const { isDark } = useTheme();

    return {
        // Example: If you have light/dark variants of images
        // logo: isDark ? require('../assets/images/logo-dark.png') : require('../assets/images/logo-light.png'),
        // splash: isDark ? require('../assets/images/splash-dark.png') : require('../assets/images/splash-light.png'),

        // For now, return theme state for conditional rendering
        isDark,
    };
};

/**
 * Get asset based on theme
 * @param {Object} lightAsset - Asset for light theme
 * @param {Object} darkAsset - Asset for dark theme
 * @param {boolean} isDark - Current theme state
 * @returns Asset for current theme
 */
export const getThemeAsset = (lightAsset, darkAsset, isDark) => {
    return isDark ? darkAsset : lightAsset;
};
