import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Rect, Text as SvgText } from 'react-native-svg';
import { RADIUS, SPACING } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { Heading } from './Typography';

export const TrendsChart = ({ data = [], title = "Weekly Trends", color, transparent = false, labelColor }) => {
    const { colors } = useTheme();
    const [tooltip, setTooltip] = useState(null);

    // Defaults that depend on theme
    const activeColor = color || colors.primary;
    const activeLabelColor = labelColor || colors.text.muted;

    const chartHeight = 100;
    const chartWidth = 300;
    const barWidth = 30;
    const gap = 10;

    // Normalize data for chart height
    const maxVal = Math.max(...data.map(d => d.value), 2500); // Default max for scale

    const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

    const handlePress = (index, x, y, value, day) => {
        if (tooltip && tooltip.index === index) {
            setTooltip(null);
        } else {
            setTooltip({ index, x, y, value, day });
        }
    };

    return (
        <View style={styles.container}>
            {title && <Heading level={3} style={styles.title}>{title}</Heading>}
            <View style={[styles.chartWrapper, { backgroundColor: transparent ? 'transparent' : colors.surface, padding: transparent ? 0 : SPACING.md }]}>
                <Svg height={chartHeight + 40} width="100%">
                    {data.map((item, index) => {
                        const barHeight = (item.value / maxVal) * chartHeight;
                        const x = index * (barWidth + gap) + 10;
                        const y = chartHeight - barHeight + 20; // Shift down for tooltip space

                        const isSelected = tooltip?.index === index;
                        const barColor = isSelected ? colors.accent.high : activeColor;

                        return (
                            <View key={index}>
                                {/* Bar */}
                                <Rect
                                    x={x}
                                    y={y}
                                    width={barWidth}
                                    height={barHeight}
                                    fill={barColor}
                                    rx={6}
                                    ry={6}
                                    onPress={() => handlePress(index, x, y, item.value, item.day || days[index])}
                                />
                                {/* Day label */}
                                <SvgText
                                    x={x + barWidth / 2}
                                    y={chartHeight + 35} // Adjusted for shift
                                    fontSize="12"
                                    fill={isSelected ? colors.text.primary : activeLabelColor}
                                    textAnchor="middle"
                                    fontWeight={isSelected ? "700" : "600"}
                                >
                                    {item.day || days[index]}
                                </SvgText>
                            </View>
                        );
                    })}
                </Svg>

                {/* Tooltip Overlay */}
                {tooltip && (
                    <View style={[styles.tooltip, { left: tooltip.x - 15, top: tooltip.y - 35, backgroundColor: colors.text.primary }]}>
                        <Text style={[styles.tooltipText, { color: colors.text.inverse }]}>{tooltip.value}</Text>
                        <Text style={[styles.tooltipSub, { color: colors.text.inverse, opacity: 0.7 }]}>{tooltip.day}</Text>
                    </View>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginVertical: SPACING.lg,
    },
    title: {
        marginBottom: SPACING.md,
    },
    chartWrapper: {
        borderRadius: RADIUS.lg,
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingHorizontal: 20
    },
    tooltip: {
        position: 'absolute',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: RADIUS.sm,
        alignItems: 'center',
        zIndex: 10,
        minWidth: 60,
    },
    tooltipText: { fontWeight: 'bold', fontSize: 12 },
    tooltipSub: { fontSize: 10 },
});
