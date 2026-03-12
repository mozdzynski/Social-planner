import { GoogleGenAI, Type, Modality, GenerateContentResponse } from "@google/genai";

// Initialize Gemini API
// Note: For image generation with gemini-3-pro-image-preview, 
// the user must select their own API key via window.aistudio.openSelectKey()

export const getGeminiClient = () => {
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
};

export interface PostIdea {
  id: string;
  title: string;
  description: string;
  day: string;
}

export interface PostContent {
  text: string;
  imageUrl?: string;
}

export const analyzeBusiness = async (websiteUrl: string, gbpUrl: string, extraInfo: string, lang: string = 'pl') => {
  const ai = getGeminiClient();
  
  const langContext = lang === 'pl' ? 'Odpowiedz w języku polskim.' : 'Respond in English.';

  // Step 1: Use Search Grounding to analyze website
  const searchResponse = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Analyze this business website: ${websiteUrl}. Extra info: ${extraInfo}. 
    Identify the core services, target audience, brand voice, and key selling points. ${langContext}`,
    config: {
      tools: [{ googleSearch: {} }],
    },
  });

  // Step 2: Use Maps Grounding to analyze GBP (if possible/relevant)
  const mapsResponse = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `Find information about this business on Google Maps: ${gbpUrl}. 
    Look for reviews, popular services, and location-specific details. ${langContext}`,
    config: {
      tools: [{ googleMaps: {} }],
    },
  });

  return {
    searchAnalysis: searchResponse.text,
    mapsAnalysis: mapsResponse.text,
    groundingChunks: {
      search: searchResponse.candidates?.[0]?.groundingMetadata?.groundingChunks,
      maps: mapsResponse.candidates?.[0]?.groundingMetadata?.groundingChunks,
    }
  };
};

export const generatePostIdeas = async (analysis: any, lang: string = 'pl'): Promise<PostIdea[]> => {
  const ai = getGeminiClient();
  const langContext = lang === 'pl' ? 'Wszystkie teksty (tytuły, opisy, dni tygodnia) muszą być w języku polskim.' : 'All texts (titles, descriptions, days of the week) must be in English.';
  
  const prompt = `Based on the following business analysis, suggest 7 social media post titles for the upcoming week (one for each day).
  
  Website Analysis: ${analysis.searchAnalysis}
  Maps/GBP Analysis: ${analysis.mapsAnalysis}
  
  ${langContext}
  
  Return the response as a JSON array of objects with 'id', 'title', 'description', and 'day' fields.
  The 'description' should briefly explain the angle of the post.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            day: { type: Type.STRING },
          },
          required: ["id", "title", "description", "day"],
        },
      },
    },
  });

  try {
    return JSON.parse(response.text || "[]");
  } catch (e) {
    console.error("Failed to parse post ideas", e);
    return [];
  }
};

export const generateFullPost = async (idea: PostIdea, analysis: any, lang: string = 'pl'): Promise<string> => {
  const ai = getGeminiClient();
  const langContext = lang === 'pl' ? 'Napisz post w języku polskim.' : 'Write the post in English.';
  
  const prompt = `Create a high-quality social media post for the following topic:
  Title: ${idea.title}
  Context: ${idea.description}
  
  Business Context:
  ${analysis.searchAnalysis}
  ${analysis.mapsAnalysis}
  
  ${langContext}
  Include relevant hashtags and a call to action. Keep the tone engaging and appropriate for the brand.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
  });

  return response.text || "";
};

export const generateImage = async (prompt: string, size: "1K" | "2K" | "4K" = "1K") => {
  // Create a fresh instance to ensure we use the user-selected key if applicable
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-image-preview',
    contents: {
      parts: [{ text: `High quality social media illustration for: ${prompt}. Professional, modern, aesthetically pleasing.` }],
    },
    config: {
      imageConfig: {
        aspectRatio: "1:1",
        imageSize: size,
      },
    },
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  return null;
};
