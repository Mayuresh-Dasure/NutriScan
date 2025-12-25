import axios from 'axios';

export const analyzeImageWithGemini = async (base64Data, userProfile = { vegType: 'Vegetarian', goal: 'General Health' }) => {
  try {
    console.log('Sending image to Gemini Service...');
    const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      console.error("Missing API Key: EXPO_PUBLIC_GEMINI_API_KEY");
      throw new Error("Missing Gemini API Key");
    }

    const response = await axios.post(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
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
  "healthScore": "number (0-100), based on how well this product fits the user profile and goal. 100 is excellent, 0 is terrible.",
  "healthInsight": "one sentence (max ~25 words) overall verdict for a typical Indian consumer, personalised to the user's health goal.",
  "servingDescription": "serving size and unit if available, e.g. 30 g (1 pack)",
  "calories": "number (kcal per serving)",
  "protein": "number (g per serving)",
  "totalFat": "number (g per serving)",
  "sugar": {
    "labelSugar": "number (g per serving as written in the nutrition table, 0 if missing)",
    "estimatedTotalSugar": "string like '8-10' for estimated g per serving including hidden sugars",
    "hiddenSugars": [
      "list of ingredient names that are sugars or sugar derivatives"
    ],
    "sugarComment": "one short sentence about sugar risk"
  },
  "preservatives": [
    {
      "name": "e.g. Sodium benzoate",
      "concern": "one short sentence on potential issues"
    }
  ],
  "additives": [
    {
      "name": "e.g. MSG",
      "concern": "one short sentence about possible effects"
    }
  ]
}

Rules:
- Prefer PER SERVING values over per 100 g.
- If a field is unknown, use a sensible default: numbers as "0" and strings as "Unknown".
- **healthScore**: Be strict. High sugar/preservatives should lower the score significantly for weight loss/health goals.
- Output must be ONLY the JSON.
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

    // Flexible JSON extraction
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    try {
      return JSON.parse(jsonMatch[0]);
    } catch (e) {
      // Fallback: cleanup potential markdown residue
      const cleanText = responseText.replace(/```json/g, '').replace(/```/g, '');
      const secondTry = cleanText.match(/\{[\s\S]*\}/);
      if (secondTry) return JSON.parse(secondTry[0]);
      throw e;
    }
  } catch (error) {
    console.error('Gemini Service Error Full:', JSON.stringify(error.response?.data || error.message, null, 2));
    throw error;
  }
};
