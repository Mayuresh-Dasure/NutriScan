import axios from 'axios';

export const analyzeImageWithGemini = async (base64Data, userProfile = { vegType: 'Vegetarian', goal: 'General Health' }) => {
  try {
    console.log('Sending image to Gemini Service...');
    const response = await axios.post(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent',
      {
        contents: [
          {
            parts: [
              {
                text: `Analyze this image (nutrition label, medicine box, or supplement bottle) and return ONLY a valid JSON object.
                
FIRST, DETERMINE THE TYPE: "Food" or "Medicine".

=== IF FOOD / BEVERAGE ===
Focus on nutrition, ingredients, and health impact.
Schema:
{
  "productType": "Food",
  "productName": "short name",
  "vegetarianStatus": "Vegetarian / Non-Vegetarian / Vegan / Unclear",
  "healthScore": number (0-100),
  "healthInsight": "Short punchy verdict (max 10 words)",
  "scoreExplanation": "One clear sentence explaining the score.",
  "servingDescription": "e.g. 1 bar, 30g",
  "calories": number (kcal) or null,
  "protein": number (g) or null,
  "carbohydrates": number (g) or null,
  "totalFat": number (g) or null,
  "fiber": number (g) or null,
  "sugar": { "labelSugar": number (g), "hiddenSugars": ["list"] },
  "allergens": ["list"],
  "alternatives": ["Name : Reason"],
  "preservatives": [{ "name": "...", "concern": "..." }],
  "additives": [{ "name": "...", "concern": "..." }]
}

=== IF MEDICINE / SUPPLEMENT ===
Focus on active ingredients, usage, and safety.
Schema:
{
  "productType": "Medicine",
  "productName": "short name",
  "vegetarianStatus": "Vegetarian / Non-Vegetarian / Vegan / Unclear",
  "healthScore": number (0-100) (Based on safety/clarity/necessity checking. 100 = Safe/Clear, 50 = Caution),
  "healthInsight": "Simple primary use (e.g. 'Pain Relief', 'Immunity', 'Sleep Aid'). Max 3 words.",
  "scoreExplanation": "Explain simply in one sentence what this medicine matches/does. Use plain English, no complex medical terms. (e.g. 'Helps reduce fever and mild pain' or 'Provides Vitamin C for immune support').",
  "activeIngredients": ["list of main drugs/vitamins e.g. 'Paracetamol 500mg'"],
  "dosage": "Recommended dosage if visible (e.g. '1 tablet every 6 hours')",
  "usageInstructions": "Brief usage instructions",
  "warnings": ["Side effects or warnings e.g. 'Drowsiness', 'Take with food'"],
  "symptoms": ["Conditions this treats"],
  "servingDescription": null,
  "calories": null,
  "protein": null,
  "carbohydrates": null,
  "totalFat": null,
  "fiber": null,
  "sugar": { "labelSugar": null, "hiddenSugars": [] },
  "allergens": [],
  "alternatives": [],
  "preservatives": [],
  "additives": []
}

User Profile for Context:
- Vegetarian Type: ${userProfile.vegType}
- Goal: ${userProfile.goal}

Rules:
- Return ONLY valid JSON.
- If unsure of type, default to Food schema but set productType="Unknown".
- Ensure no markdown formatting or backticks.
- FOR MEDICINE: Write the 'scoreExplanation' and 'healthInsight' in very simple, non-technical language. Explain it like I'm 12 years old.
`,
              },
              {
                inline_data: {
                  mime_type: 'image/jpeg',
                  data: base64Data,
                },
              },
            ],
          },
        ],
      },
      { params: { key: process.env.EXPO_PUBLIC_GEMINI_API_KEY } }
    );

    const responseText = response.data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    console.log('Gemini Response:', responseText);

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('Gemini Service Error:', error);
    throw error;
  }
};
