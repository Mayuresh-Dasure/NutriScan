import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { SPACING } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { Body, Label } from './Typography';

export const ProgressRing = ({ size = 120, strokeWidth = 10, progress = 0, label, subLabel, color, hideLegend = false }) => {
    const { colors } = useTheme();
    const ringColor = color || colors.primary;
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (progress / 100) * circumference;

    return (
        <View style={[styles.ringContainer, { width: size, height: size }]}>
            <Svg width={size} height={size}>
                <Circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={colors.border}
                    strokeWidth={strokeWidth}
                    fill="none"
                />
                <Circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={ringColor}
                    strokeWidth={strokeWidth}
                    fill="none"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    transform={`rotate(-90 ${size / 2} ${size / 2})`}
                />
            </Svg>
            {!hideLegend && (
                <View style={[StyleSheet.absoluteFill, styles.centerText]}>
                    <Body style={[styles.percentageText, { fontSize: size / 4, color: colors.text.primary }]}>{Math.round(progress)}%</Body>
                    {label && <Label style={[styles.labelText, { fontSize: size / 10 }]}>{label}</Label>}
                </View>
            )}
        </View>
    );
};

export const ProgressBar = ({ progress = 0, label, subLabel, color, height = 8 }) => {
    const { colors } = useTheme();
    const barColor = color || colors.primary;
    return (
        <View style={styles.barContainer}>
            <View style={styles.barHeader}>
                <Body style={[styles.barLabel, { color: colors.text.primary }]}>{label}</Body>
                <Body style={[styles.barSubLabel, { color: colors.text.muted }]}>{subLabel}</Body>
            </View>
            <View style={[styles.barBg, { height, borderRadius: height / 2, backgroundColor: colors.border }]}>
                <View
                    style={[
                        styles.barFill,
                        {
                            width: `${Math.min(100, progress)}%`,
                            backgroundColor: barColor,
                            height,
                            borderRadius: height / 2
                        }
                    ]}
                />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    ringContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    centerText: {
        position: 'absolute',
        justifyContent: 'center',
        alignItems: 'center',
    },
    percentageText: {
        fontWeight: '800',
    },
    labelText: {
        marginTop: -2,
    },
    barContainer: {
        marginVertical: SPACING.sm,
        width: '100%',
    },
    barHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: SPACING.xs,
    },
    barLabel: {
        fontSize: 14,
        fontWeight: '700',
    },
    barSubLabel: {
        fontSize: 12,
    },
    barBg: {
        width: '100%',
        overflow: 'hidden',
    },
    barFill: {
    }
});
