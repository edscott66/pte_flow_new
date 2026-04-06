/**
 * Speechace Service
 * 
 * This service handles communication with the Speechace API via the Express proxy.
 * Speechace is used for analyzing pronunciation and fluency in PTE speaking tasks.
 */

import { Platform } from 'react-native';
import { API_BASE_URL } from "../constants/config";

export const speechaceService = {
  /**
   * Analyze audio for pronunciation and fluency.
   * 
   * @param audioUri The recorded audio URI
   * @param text The target text the student was supposed to read
   */
  async analyzeSpeech(audioUri: string, text: string) {
    try {
      const formData = new FormData();
      
      if (Platform.OS === 'web') {
        const response = await fetch(audioUri);
        const blob = await response.blob();
        formData.append("user_audio_file", blob, "recording.wav");
      } else {
        // React Native FormData requires an object for files
        formData.append("user_audio_file", {
          uri: audioUri,
          type: 'audio/wav',
          name: 'recording.wav',
        } as any);
      }
      
      formData.append("text", text);
      formData.append("user_id", "student_123"); // Placeholder for now

      console.log(`[Speechace] Fetching: ${API_BASE_URL}/api/ai/speechace`);
      const response = await fetch(`${API_BASE_URL}/api/ai/speechace`, {
        method: "POST",
        body: formData,
      });

      const responseText = await response.text();
      
      // Check if the response is HTML (likely AIS security redirect)
      if (responseText.includes('<!doctype html>') || responseText.includes('<html')) {
        throw new Error("The server returned HTML instead of JSON. This is caused by the AI Studio security proxy blocking the request from your mobile device. To fix this: 1. Open the App URL in your mobile browser. 2. Wait for the app to load. 3. Return here and try again. This sets the required security cookie on your device.");
      }

      if (!response.ok) {
        throw new Error(`Speechace API error: ${response.statusText}. Details: ${responseText}`);
      }

      const data = JSON.parse(responseText);
      return data;
    } catch (error) {
      console.error("Speechace Analysis Error:", error);
      throw error;
    }
  }
};
