export const ACHIEVEMENTS = [
    {
        id: 'first_scan',
        title: 'First Step',
        description: 'Scan your first food label',
        icon: 'qr-code-scanner',
        requirement: (data) => data.totalScans >= 1
    },
    {
        id: 'streak_3',
        title: 'Consistency',
        description: 'Log food for 3 days in a row',
        icon: 'local-fire-department',
        requirement: (data) => data.currentStreak >= 3
    },
    {
        id: 'protein_goal',
        title: 'Protein Pro',
        description: 'Reach your protein target',
        icon: 'fitness-center',
        requirement: (data) => data.proteinReachedToday
    },
    {
        id: 'sugar_smart',
        title: 'Sugar Smart',
        description: 'Scan 5 items with low sugar (<5g)',
        icon: 'eco',
        requirement: (data) => data.lowSugarCount >= 5
    },
    {
        id: 'week_warrior',
        title: 'Week Warrior',
        description: 'Complete a full week of logging',
        icon: 'calendar-today',
        requirement: (data) => data.totalLoggedDays >= 7
    }
];
