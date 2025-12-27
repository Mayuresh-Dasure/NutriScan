import { get, ref, update } from 'firebase/database';
import { database } from './firebaseConfig';

export const updateStreakAndAchievements = async (userId, newLog) => {
    try {
        const userRef = ref(database, `users/${userId}/habitStats`);
        const snapshot = await get(userRef);
        let stats = snapshot.val() || {
            currentStreak: 0,
            lastLoggedDate: null,
            totalScans: 0,
            totalLoggedDays: 0,
            lowSugarCount: 0,
            achievements: []
        };

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const todayStr = `${year}-${month}-${day}`;

        // Update Scan Counts
        stats.totalScans += 1;
        if (newLog.sugar && parseFloat(newLog.sugar.labelSugar) < 5) {
            stats.lowSugarCount += 1;
        }

        // Update Streak
        if (stats.lastLoggedDate) {
            const lastDate = new Date(stats.lastLoggedDate);
            lastDate.setHours(0, 0, 0, 0);

            const diffDays = (today - lastDate) / (1000 * 60 * 60 * 24);

            if (diffDays === 1) {
                stats.currentStreak += 1;
                stats.totalLoggedDays += 1;
            } else if (diffDays > 1) {
                stats.currentStreak = 1;
                stats.totalLoggedDays += 1;
            }
        } else {
            stats.currentStreak = 1;
            stats.totalLoggedDays = 1;
        }

        stats.lastLoggedDate = todayStr;

        // Save Stats
        await update(userRef, stats);
        return stats;
    } catch (error) {
        console.error("Habit Service Error:", error);
    }
};

export const getHabitStats = async (userId) => {
    try {
        const userRef = ref(database, `users/${userId}/habitStats`);
        const snapshot = await get(userRef);
        return snapshot.val() || { currentStreak: 0, totalScans: 0, achievements: [] };
    } catch (err) {
        return { currentStreak: 0, totalScans: 0, achievements: [] };
    }
};
