import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { RADIUS, SHADOWS, SPACING } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';

export const GradientButton = ({ title, onPress, style, icon, loading, ...props }) => {
    const { colors } = useTheme();
    return (
        <TouchableOpacity
            onPress={onPress}
            style={[styles.container, style]}
            activeOpacity={0.8}
            {...props}
        >
            <LinearGradient
                colors={colors.primaryGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gradient}
            >
                {icon && <View style={styles.icon}>{icon}</View>}
                <Text style={styles.text}>{title}</Text>
            </LinearGradient>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        borderRadius: RADIUS.md,
        ...SHADOWS.medium,
        height: 56,
    },
    gradient: {
        flex: 1,
        borderRadius: RADIUS.md,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: SPACING.lg,
    },
    text: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    icon: {
        marginRight: SPACING.sm,
    },
});
