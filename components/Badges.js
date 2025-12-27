import { MaterialIcons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { COLORS, RADIUS, SPACING } from '../constants/theme';
import { Body, Label } from './Typography';

import { useTheme } from '../context/ThemeContext';

export const Badge = ({ label, type = 'success', icon, style }) => {
    const { colors } = useTheme();
    // Logic for dynamic badge colors
    let bgColor, textColor;
    if (type === 'success') {
        bgColor = colors.isDark ? 'rgba(5, 150, 105, 0.2)' : '#ecfdf5';
        textColor = colors.isDark ? '#34d399' : '#059669';
    } else if (type === 'warning') {
        bgColor = colors.isDark ? 'rgba(217, 119, 6, 0.2)' : '#fffbeb';
        textColor = colors.isDark ? '#fbbf24' : '#d97706';
    } else {
        bgColor = colors.isDark ? 'rgba(220, 38, 38, 0.2)' : '#fef2f2';
        textColor = colors.isDark ? '#f87171' : '#dc2626';
    }

    return (
        <View style={[styles.badge, { backgroundColor: bgColor }, style]}>
            {icon && <MaterialIcons name={icon} size={14} color={textColor} style={{ marginRight: 4 }} />}
            <Label style={{ color: textColor, fontSize: 10 }}>{label}</Label>
        </View>
    );
};

export const Achievement = ({ title, description, icon, unlocked }) => {
    const { colors } = useTheme();
    return (
        <View style={[styles.achievement, { backgroundColor: colors.surface }, !unlocked && styles.locked]}>
            <View style={[styles.iconContainer, { backgroundColor: unlocked ? (colors.isDark ? 'rgba(16, 185, 129, 0.2)' : '#f0fdf4') : (colors.isDark ? '#374151' : '#f3f4f6') }]}>
                <MaterialIcons name={icon} size={24} color={unlocked ? colors.primary : colors.text.muted} />
            </View>
            <View style={styles.textContainer}>
                <Body style={[styles.title, { color: colors.text.primary }, !unlocked && styles.lockedText]}>{title}</Body>
                <Label style={styles.description}>{description}</Label>
            </View>
            {unlocked && <MaterialIcons name="check-circle" size={20} color={colors.primary} />}
        </View>
    );
};

const styles = StyleSheet.create({
    badge: {
        paddingHorizontal: SPACING.sm,
        paddingVertical: SPACING.xs,
        borderRadius: RADIUS.full,
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
    },
    achievement: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.md,
        padding: SPACING.md,
        borderRadius: RADIUS.lg,
        marginVertical: SPACING.xs,
    },
    locked: {
        opacity: 0.6,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: RADIUS.md,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.md,
    },
    textContainer: {
        flex: 1,
    },
    title: {
        fontSize: 16,
        fontWeight: '700',
        fontSize: 16,
        fontWeight: '700',
    },
    lockedText: {
        color: COLORS.text.muted,
    },
    description: {
        marginTop: 2,
        textTransform: 'none',
    }
});
