
import { GoogleGenAI, Modality } from "@google/genai";

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable is not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

interface ImageData {
  data: string; // base64 encoded string
  mimeType: string;
}

export const editImageWithGemini = async (prompt: string, images: ImageData[]): Promise<string> => {
  try {
    const imageParts = images.map(image => ({
      inlineData: {
        data: image.data,
        mimeType: image.mimeType,
      },
    }));

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          ...imageParts,
          {
            text: prompt,
          },
        ],
      },
      config: {
          responseModalities: [Modality.IMAGE],
      },
    });

    // Find the image part in the response
    const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData);

    if (imagePart && imagePart.inlineData) {
      return imagePart.inlineData.data;
    } else {
      const safetyFeedback = response.candidates?.[0]?.safetyRatings;
      let errorMessage = "No image was generated.";
      if (safetyFeedback) {
        errorMessage += ` The model's response may have been blocked due to: ${safetyFeedback.map(r => `${r.category} (${r.probability})`).join(', ')}`;
      }
      throw new Error(errorMessage);
    }

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw new Error(`Failed to generate image: ${error instanceof Error ? error.message : String(error)}`);
  }
};
