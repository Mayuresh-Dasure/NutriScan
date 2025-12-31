import { BlurView } from 'expo-blur';
import { StyleSheet, View } from 'react-native';
import { RADIUS, SHADOWS, SPACING } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';

export const Card = ({ children, style, glass, premium, ...props }) => {
    const { colors, isDark } = useTheme();

    const containerStyle = [
        styles.card,
        { backgroundColor: colors.surface },
        premium ? SHADOWS.premium : SHADOWS.soft,
        style
    ];

    if (glass) {
        return (
            <BlurView intensity={80} tint={isDark ? "dark" : "light"} style={[containerStyle, styles.glass, { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255, 255, 255, 0.5)' }]}>
                {children}
            </BlurView>
        );
    }

    return (
        <View style={containerStyle} {...props}>
            {children}
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        borderRadius: RADIUS.lg,
        padding: SPACING.lg,
        marginVertical: SPACING.sm,
    },
    glass: {
        overflow: 'hidden',
        backgroundColor: 'rgba(255, 255, 255, 0.7)', // This might need override in dark mode or rely on BlurView
        borderWidth: 1,
    },
});
