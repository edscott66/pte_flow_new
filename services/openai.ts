/**
 * OpenAI Service
 * 
 * This service handles communication with the OpenAI API via the Express proxy.
 * It is used for analyzing writing tasks and providing PTE-style feedback.
 */

import { API_BASE_URL } from "../constants/config";

export const openaiService = {
  /**
   * Analyze a student's answer and provide feedback using ChatGPT.
   * 
   * @param question The PTE question text
   * @param answer The student's written answer
   */
  async getFeedback(question: string, answer: string) {
    const prompt = `
      As a PTE (Pearson Test of English) expert, analyze the following student answer for the given question.
      Provide detailed feedback on grammar, vocabulary, spelling, and overall PTE scoring criteria.
      
      Question: ${question}
      Answer: ${answer}
      
      Format the response as a JSON object with:
      - score (number out of 90, overall PTE score)
      - grammar (number out of 90)
      - vocabulary (number out of 90)
      - spelling (number out of 90)
      - content (number out of 90)
      - structure (number out of 90)
      - form (number out of 90)
      - linguistic (number out of 90)
      - feedback (string, a detailed 2-3 sentence analysis of the student's performance)
      - improvements (array of strings, specific actionable advice)
      - wordCountStatus (string, e.g., "Good", "Too short", "Too long")
    `;

    try {
      console.log(`[OpenAI] Fetching: ${API_BASE_URL}/api/ai/chat`);
      const response = await fetch(`${API_BASE_URL}/api/ai/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4-turbo-preview", // Or your preferred model
          messages: [
            { role: "system", content: "You are a PTE exam expert." },
            { role: "user", content: prompt }
          ],
          response_format: { type: "json_object" }
        }),
      });

      const responseText = await response.text();

      // Check if the response is HTML (likely AIS security redirect)
      if (responseText.includes('<!doctype html>') || responseText.includes('<html')) {
        throw new Error("The server returned HTML instead of JSON. This is caused by the AI Studio security proxy blocking the request from your mobile device. To fix this: 1. Open the App URL in your mobile browser. 2. Wait for the app to load. 3. Return here and try again. This sets the required security cookie on your device.");
      }

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}. Details: ${responseText}`);
      }

      const data = JSON.parse(responseText);
      const content = data.choices[0].message.content;
      return JSON.parse(content || "{}");
    } catch (error) {
      console.error("OpenAI Feedback Error:", error);
      throw error;
    }
  }
};
