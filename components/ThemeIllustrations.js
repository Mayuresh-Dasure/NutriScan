import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { useTheme } from '../context/ThemeContext';
import { Body, Heading } from './Typography';

/**
 * Empty state illustration for when there's no data
 * Adapts colors based on current theme
 */
export const EmptyStateIllustration = ({
    icon = 'document-text-outline',
    title = 'No Data Yet',
    message = 'Start adding items to see them here',
    size = 120
}) => {
    const { colors, isDark } = useTheme();

    return (
        <View style={styles.container}>
            {/* Circular background */}
            <View style={[
                styles.iconContainer,
                {
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    backgroundColor: isDark ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.05)',
                    borderColor: isDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.1)',
                }
            ]}>
                <Ionicons
                    name={icon}
                    size={size * 0.5}
                    color={colors.primary}
                />
            </View>

            <Heading level={3} style={[styles.title, { color: colors.text.primary }]}>
                {title}
            </Heading>
            <Body style={[styles.message, { color: colors.text.muted }]}>
                {message}
            </Body>
        </View>
    );
};

/**
 * Scanning illustration - shows when camera is ready
 */
export const ScanningIllustration = ({ size = 200 }) => {
    const { colors, isDark } = useTheme();

    const primaryColor = colors.primary;
    const secondaryColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)';

    return (
        <Svg width={size} height={size} viewBox="0 0 200 200">
            {/* Background circle */}
            <Circle
                cx="100"
                cy="100"
                r="90"
                fill={secondaryColor}
            />

            {/* Camera icon path */}
            <Path
                d="M140 70H130L125 60H75L70 70H60C54.5 70 50 74.5 50 80V130C50 135.5 54.5 140 60 140H140C145.5 140 150 135.5 150 130V80C150 74.5 145.5 70 140 70Z"
                fill={primaryColor}
                opacity="0.8"
            />

            {/* Camera lens */}
            <Circle
                cx="100"
                cy="105"
                r="20"
                fill={isDark ? '#1f2937' : '#ffffff'}
            />

            {/* Scan line */}
            <Path
                d="M50 105 L150 105"
                stroke={primaryColor}
                strokeWidth="2"
                strokeDasharray="5,5"
            />
        </Svg>
    );
};

/**
 * Success illustration - shows after successful action
 */
export const SuccessIllustration = ({ size = 120 }) => {
    const { colors, isDark } = useTheme();

    return (
        <View style={[
            styles.iconContainer,
            {
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)',
                borderColor: colors.primary,
                borderWidth: 2,
            }
        ]}>
            <Ionicons
                name="checkmark-circle"
                size={size * 0.6}
                color={colors.primary}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
    },
    iconContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        marginBottom: 20,
    },
    title: {
        marginTop: 16,
        marginBottom: 8,
        textAlign: 'center',
    },
    message: {
        textAlign: 'center',
        maxWidth: 280,
        lineHeight: 20,
    },
});
