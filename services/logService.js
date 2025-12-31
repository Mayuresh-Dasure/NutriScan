import { get, ref, remove, set, update } from 'firebase/database';
import { database } from './firebaseConfig';

/**
 * Deletes a food log entry and recalculates daily totals for that date.
 * @param {string} userId - The current user's ID
 * @param {string} logId - The ID of the log to delete
 * @param {number} timestamp - The timestamp of the log (to identify the date)
 */
export const deleteLogEntry = async (userId, logId, timestamp) => {
    if (!userId || !logId || !timestamp) return;

    try {
        // 1. Delete the specific log entry
        await remove(ref(database, `users/${userId}/foodLogs/${logId}`));

        // 2. Recalculate totals for that specific date
        await recalculateDailyTotals(userId, timestamp);

        return true;
    } catch (error) {
        console.error("Error deleting log:", error);
        throw error;
    }
};

/**
 * Recalculates totals (cal, protein, carbs, fat, water) for a specific date
 * and updates/creates the dailyTotals document.
 * @param {string} userId 
 * @param {number} timestamp - Any timestamp within the target day
 */
export const recalculateDailyTotals = async (userId, timestamp) => {
    try {
        const dateObj = new Date(timestamp);
        dateObj.setHours(0, 0, 0, 0);
        const startOfDay = dateObj.getTime();

        const nextDay = new Date(dateObj);
        nextDay.setDate(dateObj.getDate() + 1);
        const endOfDay = nextDay.getTime();

        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        const dateKey = `${year}-${month}-${day}`; // Format: YYYY-MM-DD (Local)

        // Fetch all logs
        // Note: Firebase filtering is limited without complex indexes, so fetching all and filtering in memory
        // is safer for now unless dataset is huge. 
        // Logic similar to HomeScreen/LogScreen load mechanics.
        const logsRef = ref(database, `users/${userId}/foodLogs`);
        const snapshot = await get(logsRef);

        let dailySum = {
            calories: 0,
            protein: 0,
            carbs: 0,
            totalFat: 0,
            water: 0
        };

        if (snapshot.exists()) {
            const allLogs = snapshot.val();
            Object.values(allLogs).forEach(log => {
                if (log.timestamp >= startOfDay && log.timestamp < endOfDay) {
                    dailySum.calories += (parseFloat(log.calories) || 0);
                    dailySum.protein += (parseFloat(log.protein) || 0);
                    dailySum.carbs += (parseFloat(log.carbs) || 0);
                    dailySum.totalFat += (parseFloat(log.totalFat) || 0);
                    // Add water if mixed in foodLogs, though usually it's in waterLogs
                }
            });
        }

        // Also check waterLogs if needed for complete "Daily Totals"
        // Prompt asked to sum water (if tracked per item). 
        // If water is separate, we should probably fetch waterLogs too if we want a COMPLETE daily total,
        // but user specifically said "recalculate totals... sum fields... water (if tracked per item)".
        // Assuming water might be in foodLogs (drinks) OR separate. 
        // Let's check waterLogs too to be safe and accurate for the "Daily Totals" document.
        const waterRef = ref(database, `users/${userId}/waterLogs`);
        const waterSnap = await get(waterRef);
        if (waterSnap.exists()) {
            const wLogs = waterSnap.val();
            Object.values(wLogs).forEach(log => {
                if (log.timestamp >= startOfDay && log.timestamp < endOfDay) {
                    dailySum.water += (parseFloat(log.amount) || 0);
                }
            });
        }

        // Round values
        dailySum.calories = Math.round(dailySum.calories);
        dailySum.protein = Math.round(dailySum.protein * 10) / 10;
        dailySum.carbs = Math.round(dailySum.carbs * 10) / 10;
        dailySum.totalFat = Math.round(dailySum.totalFat * 10) / 10;
        dailySum.water = Math.round(dailySum.water * 100) / 100;

        // Update the persistent dailyTotals document
        await update(ref(database, `users/${userId}/dailyTotals/${dateKey}`), {
            ...dailySum,
            lastUpdated: Date.now()
        });

        console.log(`Recalculated totals for ${dateKey}:`, dailySum);

    } catch (error) {
        console.error("Error recalculating totals:", error);
    }
};

/**
 * Restores a deleted log entry and recalculates daily totals.
 * @param {string} userId
 * @param {object} logData - The full log object including ID
 */
export const restoreLogEntry = async (userId, logData) => {
    if (!userId || !logData || !logData.id) return;

    try {
        const { id, ...data } = logData;

        // 1. Restore the log entry with the same ID
        await set(ref(database, `users/${userId}/foodLogs/${id}`), data);

        // 2. Recalculate totals for that date
        await recalculateDailyTotals(userId, logData.timestamp);

        return true;
    } catch (error) {
        console.error("Error restoring log:", error);
        throw error;
    }
};

/**
 * Updates an existing food log entry and recalculates daily totals.
 * @param {string} userId
 * @param {string} logId
 * @param {object} newLogData - The updated log object
 */
export const updateLogEntry = async (userId, logId, newLogData) => {
    if (!userId || !logId || !newLogData) return;

    try {
        // 1. Update the log entry
        await update(ref(database, `users/${userId}/foodLogs/${logId}`), newLogData);

        // 2. Recalculate totals for the date
        // Note: If we supported date changing, we'd need to recalc both old and new dates.
        // For now, assuming same date.
        await recalculateDailyTotals(userId, newLogData.timestamp);

        return true;
    } catch (error) {
        console.error("Error updating log:", error);
        throw error;
    }
};
