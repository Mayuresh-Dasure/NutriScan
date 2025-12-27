import axios from 'axios';

export const analyzeImageWithGemini = async (base64Data, userProfile = { vegType: 'Vegetarian', goal: 'General Health' }) => {
  try {
    console.log('Sending image to Gemini Service...');
    const response = await axios.post(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent',
      {
        contents: [
          {
            parts: [
              {
                text: `Analyze this product's nutrition label and ingredients (from OCR or image)
and return ONLY a valid JSON object (no markdown, no extra text).

FOCUS AREAS:
1) Sugar (per serving)
2) Hidden sugars
3) Preservatives
4) Additives / colours / flavour enhancers
5) Overall vegetarian status and health impact

User profile:
- Vegetarian type: ${userProfile.vegType}
- Health goal: ${userProfile.goal}

When writing "healthInsight", adapt it to this goal.

Use this schema exactly:

{
  "productName": "short name of the product",
  "vegetarianStatus": "Vegetarian / Non-Vegetarian / Vegan / Unclear",
  "healthScore": "number (0-100).",
  "healthInsight": "Short punchy verdict (max 10 words).",
  "scoreExplanation": "One clear sentence explaining WHY this score was given (e.g. 'High score due to high protein and low sugar, but contains minor additives').",
  "servingDescription": "serving size (e.g. 1 bar, 30g). If unknown, use null.",
  "calories": "number (kcal). null if unknown/not-food.",
  "protein": "number (g). null if unknown.",
  "carbohydrates": "number (g). null if unknown.",
  "totalFat": "number (g). null if unknown.",
  "fiber": "number (g). null if unknown.",
  "sugar": {
    "labelSugar": "number (g). null if unknown.",
    "hiddenSugars": ["list of hidden sugar types found"]
  },
  "allergens": ["list of allergens"],
  "alternatives": ["Alternative Name : Short Reason why it's better"],
  "preservatives": [
    { "name": "e.g. Sodium benzoate", "concern": "short concern" }
  ],
  "additives": [
    { "name": "e.g. MSG", "concern": "short concern" }
  ]
}

Rules:
- If nutrition data is missing (e.g. cosmetic product or unclear label), return null for those fields, DO NOT guess 0.
- For alternatives, follow the format "Name : Reason".
- Output must be ONLY valid JSON.
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
