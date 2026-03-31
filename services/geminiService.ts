import { GoogleGenerativeAI } from "@google/generative-ai";
import * as FileSystem from 'expo-file-system/legacy';

// !!! ------------------------------------------------ !!!
// !!! PASTE YOUR "AIza..." KEY INSIDE THE QUOTES BELOW !!!
// !!! ------------------------------------------------ !!!
const API_KEY = "AIzaSyCqAHWU8h3b8fai0zG7rtb9WiCtYmJaAnc"; 

const genAI = new GoogleGenerativeAI(API_KEY);

// --- 1. AUDIO ANALYSIS (Speaking Tasks) ---
export const analyzeSpeech = async (audioUri: string, questionText: string, questionType: string) => {
  try {
    if (!audioUri) throw new Error("No audio URI provided");

    const base64Audio = await FileSystem.readAsStringAsync(audioUri, {
      encoding: 'base64', 
    });

    // FIX: Updated to the 2026 standard model available in your log
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
      Act as a strict PTE Academic examiner. 
      Task: ${questionType}
      Reference Text/Context: "${questionText}"
      
      1. Transcribe exactly what the user said.
      2. Analyze the audio for PTE scoring (Pronunciation, Fluency, Content).
      
      Provide the output in strictly VALID JSON format without Markdown blocks.
      Structure:
      {
        "userTranscript": "The exact words spoken by the user...",
        "pronunciation": (0-90 score),
        "fluency": (0-90 score),
        "content": (0-90 score),
        "overall": (0-90 score),
        "feedback": "Specific advice on what to improve.",
        "mistakes": ["List of specific errors"]
      }
    `;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: "audio/mp3", 
          data: base64Audio
        }
      }
    ]);

    const response = await result.response;
    const text = response.text();
    // Clean up code blocks if the AI adds them
    const cleanJson = text.replace(/```json/g, '').replace(/```/g, '');
    return JSON.parse(cleanJson);

  } catch (error) {
    console.error("AI Speech Analysis Error:", error);
    throw error;
  }
};

// --- 2. WRITING ANALYSIS (Summarize Spoken Text / Essay) ---
export const analyzeWriting = async (userSummary: string, originalTranscript: string, taskType: string) => {
  try {
    // FIX: Updated to the 2026 standard model
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
      Act as a strict PTE Academic examiner. 
      Task: ${taskType}
      Original Transcript: "${originalTranscript}"
      User's Summary: "${userSummary}"
      
      Score based on PTE criteria: Content (topic coverage), Form (word count 50-70), Grammar, Vocabulary, and Spelling.
      
      Provide the output in strictly VALID JSON format without Markdown blocks.
      Structure:
      {
        "content": (0-90 score),
        "grammar": (0-90 score),
        "vocabulary": (0-90 score),
        "spelling": (0-90 score),
        "overall": (0-90 score),
        "feedback": "Specific advice on how to improve the summary.",
        "wordCountStatus": "Good" or "Too Short" or "Too Long"
      }
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    const cleanJson = text.replace(/```json/g, '').replace(/```/g, '');
    return JSON.parse(cleanJson);

  } catch (error) {
    console.error("AI Writing Analysis Error:", error);
    throw error;
  }
};