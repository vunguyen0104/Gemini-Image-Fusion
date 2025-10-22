
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

    // Construct a more detailed prompt to instruct the model to preserve faces
    const fullPrompt = `You are an expert photo editor. Your task is to take the provided images of people and place them into a new scene described by the user. It is absolutely crucial that you preserve the faces of the individuals from the original photos. Do not alter their facial features, expressions, or identities in any way. The faces in the generated image must look exactly like the faces in the uploaded photos. Here is the user's request for the scene: '${prompt}'`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          ...imageParts,
          {
            text: fullPrompt,
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
