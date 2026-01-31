import axios from 'axios';

/**
 * Fetch product data from Open Food Facts API using barcode
 * @param {string} barcode - Product barcode (EAN-13, UPC, etc.)
 * @returns {Promise<Object>} Product nutrition data
 */
export const fetchProductByBarcode = async (barcode) => {
    try {
        const response = await axios.get(
            `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`
        );

        if (response.data.status === 0) {
            console.warn(`Product with barcode ${barcode} not found in database.`);
            return null;
        }

        const product = response.data.product;

        // Transform Open Food Facts data to our app's format
        const transformedData = {
            productType: 'Food',
            productName: product.product_name || 'Unknown Product',
            vegetarianStatus: determineVegetarianStatus(product),
            healthScore: calculateHealthScore(product),
            healthInsight: generateHealthInsight(product),
            scoreExplanation: generateScoreExplanation(product),
            servingDescription: product.serving_size || '100g',
            calories: product.nutriments?.['energy-kcal_100g'] || null,
            protein: product.nutriments?.proteins_100g || null,
            carbohydrates: product.nutriments?.carbohydrates_100g || null,
            totalFat: product.nutriments?.fat_100g || null,
            fiber: product.nutriments?.fiber_100g || null,
            sugar: {
                labelSugar: product.nutriments?.sugars_100g || null,
                hiddenSugars: extractHiddenSugars(product.ingredients_text)
            },
            allergens: product.allergens_tags?.map(tag => tag.replace('en:', '')) || [],
            alternatives: generateAlternatives(product),
            preservatives: extractPreservatives(product.additives_tags),
            additives: extractAdditives(product.additives_tags),
            imageUrl: product.image_url,
            brands: product.brands,
            categories: product.categories,
            source: 'barcode'
        };

        return transformedData;
    } catch (error) {
        console.error('Barcode lookup error:', error);
        throw error;
    }
};

/**
 * Determine vegetarian status from product data
 */
const determineVegetarianStatus = (product) => {
    const labels = product.labels_tags || [];

    if (labels.includes('en:vegan')) return 'Vegan';
    if (labels.includes('en:vegetarian')) return 'Vegetarian';

    const ingredients = (product.ingredients_text || '').toLowerCase();
    if (ingredients.includes('meat') || ingredients.includes('chicken') ||
        ingredients.includes('beef') || ingredients.includes('pork')) {
        return 'Non-Vegetarian';
    }

    return 'Unclear';
};

/**
 * Calculate health score based on Nutri-Score and nutriments
 */
const calculateHealthScore = (product) => {
    // Use Nutri-Score if available
    const nutriScore = product.nutriscore_grade;
    if (nutriScore) {
        const scoreMap = { 'a': 90, 'b': 75, 'c': 60, 'd': 45, 'e': 30 };
        return scoreMap[nutriScore.toLowerCase()] || 50;
    }

    // Fallback: Calculate based on nutrients
    let score = 70; // Start neutral

    const nutrients = product.nutriments || {};

    // Penalize high sugar
    if (nutrients.sugars_100g > 15) score -= 15;
    else if (nutrients.sugars_100g > 10) score -= 10;

    // Penalize high fat
    if (nutrients.fat_100g > 20) score -= 10;
    else if (nutrients.fat_100g > 10) score -= 5;

    // Reward high protein
    if (nutrients.proteins_100g > 10) score += 10;
    else if (nutrients.proteins_100g > 5) score += 5;

    // Reward high fiber
    if (nutrients.fiber_100g > 5) score += 10;
    else if (nutrients.fiber_100g > 3) score += 5;

    // Penalize additives
    const additiveCount = (product.additives_tags || []).length;
    score -= Math.min(additiveCount * 3, 20);

    return Math.max(0, Math.min(100, score));
};

/**
 * Generate health insight
 */
const generateHealthInsight = (product) => {
    const score = calculateHealthScore(product);

    if (score >= 80) return 'Excellent nutritional choice!';
    if (score >= 60) return 'Good option with minor concerns';
    if (score >= 40) return 'Moderate - consume in moderation';
    return 'High in unhealthy ingredients';
};

/**
 * Generate score explanation
 */
const generateScoreExplanation = (product) => {
    const nutrients = product.nutriments || {};
    const issues = [];
    const positives = [];

    if (nutrients.sugars_100g > 10) issues.push('high sugar');
    if (nutrients.fat_100g > 15) issues.push('high fat');
    if ((product.additives_tags || []).length > 3) issues.push('many additives');

    if (nutrients.proteins_100g > 8) positives.push('good protein');
    if (nutrients.fiber_100g > 4) positives.push('high fiber');

    if (issues.length > 0 && positives.length > 0) {
        return `Contains ${positives.join(' and ')} but has ${issues.join(' and ')}.`;
    } else if (issues.length > 0) {
        return `Contains ${issues.join(', ')}. Consider healthier alternatives.`;
    } else if (positives.length > 0) {
        return `Great choice! ${positives.join(' and ')}.`;
    }

    return 'Moderate nutritional value.';
};

/**
 * Extract hidden sugars from ingredients
 */
const extractHiddenSugars = (ingredientsText) => {
    if (!ingredientsText) return [];

    const sugarAliases = [
        'dextrose', 'fructose', 'glucose', 'maltose', 'sucrose',
        'corn syrup', 'high fructose', 'agave', 'honey', 'molasses'
    ];

    const found = [];
    const lowerText = ingredientsText.toLowerCase();

    sugarAliases.forEach(alias => {
        if (lowerText.includes(alias)) {
            found.push(alias.charAt(0).toUpperCase() + alias.slice(1));
        }
    });

    return found;
};

/**
 * Extract preservatives from additives
 */
const extractPreservatives = (additivesTags) => {
    if (!additivesTags) return [];

    return additivesTags
        .filter(tag => tag.includes('e2') || tag.includes('e3'))
        .map(tag => ({
            name: tag.replace('en:', '').toUpperCase(),
            concern: 'May cause allergic reactions in sensitive individuals'
        }))
        .slice(0, 5);
};

/**
 * Extract additives
 */
const extractAdditives = (additivesTags) => {
    if (!additivesTags) return [];

    return additivesTags
        .filter(tag => !tag.includes('e2') && !tag.includes('e3'))
        .map(tag => ({
            name: tag.replace('en:', '').toUpperCase(),
            concern: 'Artificial additive'
        }))
        .slice(0, 5);
};

/**
 * Generate healthier alternatives
 */
const generateAlternatives = (product) => {
    const alternatives = [];
    const categories = product.categories || '';

    if (categories.includes('snacks')) {
        alternatives.push('Fresh fruits : Natural sugars and vitamins');
        alternatives.push('Nuts : Healthy fats and protein');
    }

    if (categories.includes('beverages')) {
        alternatives.push('Water : Zero calories, pure hydration');
        alternatives.push('Green tea : Antioxidants and metabolism boost');
    }

    if (categories.includes('dairy')) {
        alternatives.push('Greek yogurt : Higher protein, lower sugar');
        alternatives.push('Almond milk : Lower calories, lactose-free');
    }

    return alternatives.slice(0, 3);
};
