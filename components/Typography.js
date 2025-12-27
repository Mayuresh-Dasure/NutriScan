import { Text } from 'react-native';
import { TYPOGRAPHY } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';

export const Heading = ({ level = 1, children, style, inverse, ...props }) => {
    const { colors } = useTheme();
    const headingStyle = TYPOGRAPHY[`h${level}`] || TYPOGRAPHY.h1;
    // Override static color from TYPOGRAPHY
    const color = inverse ? colors.text.inverse : colors.text.primary;

    return (
        <Text style={[headingStyle, { color }, style]} {...props}>
            {children}
        </Text>
    );
};

export const Body = ({ children, style, muted, inverse, ...props }) => {
    const { colors } = useTheme();
    const color = inverse ? colors.text.inverse : muted ? colors.text.muted : colors.text.secondary;
    return (
        <Text style={[TYPOGRAPHY.body, { color }, style]} {...props}>
            {children}
        </Text>
    );
};

export const Label = ({ children, style, inverse, ...props }) => {
    const { colors } = useTheme();
    const color = inverse ? colors.text.inverse : colors.text.muted;
    return (
        <Text style={[TYPOGRAPHY.label, { color }, style]} {...props}>
            {children}
        </Text>
    );
};
