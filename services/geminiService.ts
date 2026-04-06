import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import * as FileSystem from 'expo-file-system';
import { openaiService } from './openai';
import { speechaceService } from './speechace';

/**
 * PTE AI Service (Hybrid Approach)
 * 
 * This service coordinates between SpeechAce (Speaking), 
 * ChatGPT (Writing), and Gemini (Fallback).
 */

// Initialize Gemini lazily to avoid crashing on startup if the key is missing
let aiInstance: GoogleGenAI | null = null;

const getAI = () => {
  if (!aiInstance) {
    const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "MISSING_API_KEY") {
      throw new Error("GEMINI_API_KEY is not set. Please add EXPO_PUBLIC_GEMINI_API_KEY to your .env file and restart the server with 'npx expo start -c'.");
    }
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
};

/**
 * Analyze speech for PTE tasks.
 * Uses SpeechAce as the primary engine for professional scoring.
 */
export const analyzeSpeech = async (audioUri: string, questionText: string, questionType: string) => {
  try {
    if (!audioUri) throw new Error("No audio URI provided");

    // 1. Try SpeechAce first (Best for PTE Speaking)
    try {
      const result = await speechaceService.analyzeSpeech(audioUri, questionText);
      console.log("[GeminiService] SpeechAce Result Received:", JSON.stringify(result, null, 2));
      
      if (result.status === "error") {
        throw new Error(`SpeechAce API Error: ${result.short_message} - ${result.detail_message}`);
      }

      // Generate detailed feedback and accurate content score using Gemini based on SpeechAce results
      let detailedFeedback = "";
      let sectionFeedback: any = null;
      const overallScore = result.text_score?.quality_score || 0;
      const pronunciationScore = result.text_score?.pronunciation_score || overallScore;
      const fluencyScore = result.text_score?.fluency_score || overallScore;
      let adjustedContentScore = result.text_score?.relevance_score || 90;
      let wordScores: any[] = [];

      try {
          const userTranscript = result.text_score?.text || "";
          wordScores = result.text_score?.word_score_list?.map((w: any) => ({
            word: w.word,
            score: w.quality_score
          })) || [];
          
          const feedbackPrompt = `
            Act as a professional PTE Speaking coach and examiner. 
            Reference Text (what the student was supposed to say): "${questionText}"
            
            SpeechAce Word-Level Scores (0-100):
            ${JSON.stringify(wordScores)}
            
            SpeechAce Summary Scores:
            - Pronunciation: ${pronunciationScore}/90
            - Fluency: ${fluencyScore}/90
            - SpeechAce Content Score: ${result.text_score?.relevance_score || 90}/90
            
            Your Task:
            1. Analyze the Word-Level Scores for omissions (score < 40) or mispronunciations (score 40-70).
            2. Calculate a NEW Content Score (0-90). PTE is extremely strict on omissions. If words are missing, the score MUST drop significantly.
            3. Provide a high-quality Summary Feedback (3-4 sentences) that gives a general overview of the performance.
            4. Provide Individual Feedback for each section: Pronunciation, Oral Fluency, and Content.
               - Each section feedback MUST explicitly refer to the PTE Academic scoring criteria.
               - For Pronunciation: Mention clarity, vowel/consonant sounds, and word stress.
               - For Oral Fluency: Mention rhythm, phrasing, hesitations, and natural pace.
               - For Content: Mention accuracy of words spoken against the reference text.
               - Explain exactly how the user can effectively improve to get a higher score (e.g., "To improve fluency, focus on continuous speech without self-correction").
            
            Return the result as a JSON object with:
            - feedback (string, the summary feedback)
            - contentScore (number, 0-90)
            - sectionFeedback (object with keys: pronunciation, fluency, content. Each value is a detailed string referring to PTE standards)
          `;
          
          const ai = getAI();
          const feedbackRes = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: feedbackPrompt,
            config: {
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  feedback: { type: Type.STRING },
                  contentScore: { type: Type.NUMBER },
                  sectionFeedback: {
                    type: Type.OBJECT,
                    properties: {
                      pronunciation: { type: Type.STRING },
                      fluency: { type: Type.STRING },
                      content: { type: Type.STRING }
                    },
                    required: ["pronunciation", "fluency", "content"]
                  }
                },
                required: ["feedback", "contentScore", "sectionFeedback"]
              }
            }
          });
          
          const aiResult = JSON.parse(feedbackRes.text || "{}");
          detailedFeedback = aiResult.feedback || "";
          adjustedContentScore = aiResult.contentScore || adjustedContentScore;
          sectionFeedback = aiResult.sectionFeedback;
      } catch (fError) {
          console.warn("Failed to generate detailed feedback with Gemini:", fError);
          detailedFeedback = result.text_score?.quality_score >= 70 ? "Excellent pronunciation and fluency!" : "Good effort! Try to focus on clarity and word stress.";
      }
      
      return {
        userTranscript: result.text_score?.text || "",
        pronunciation: pronunciationScore,
        fluency: fluencyScore,
        content: adjustedContentScore,
        overall: Math.round((pronunciationScore + fluencyScore + adjustedContentScore) / 3),
        breakdown: {
          pronunciation: pronunciationScore,
          fluency: fluencyScore,
          content: adjustedContentScore
        },
        feedback: detailedFeedback.trim(),
        sectionFeedback: sectionFeedback,
        mistakes: wordScores.filter((w: any) => w.score < 75).map((w: any) => ({
          word: w.word,
          score: w.score,
          label: w.score < 40 ? "Omitted/Unclear" : "Mispronounced"
        }))
      };
    } catch (speechaceError) {
      console.warn("SpeechAce failed, falling back to Gemini:", speechaceError);
      
      // 2. Fallback to Gemini
      const base64Audio = await FileSystem.readAsStringAsync(audioUri, {
        encoding: 'base64', 
      });

      const prompt = `
        Act as a strict PTE Academic examiner and coach. 
        Task: ${questionType}
        Reference Text (what the student was supposed to say): "${questionText}"
        
        Analyze the provided audio for:
        1. Content (Did they say all the words correctly? Check for omissions or additions)
        2. Oral Fluency (smoothness, speed, rhythm, and natural phrasing)
        3. Pronunciation (clarity, vowel/consonant accuracy, and word stress)
        
        Your Task:
        1. Provide a score (0-90) for each category and an overall score.
        2. Provide a high-quality Summary Feedback (3-4 sentences).
        3. Provide Individual Feedback for each section: Pronunciation, Oral Fluency, and Content.
           - Each section feedback MUST explicitly refer to the PTE Academic scoring criteria.
           - Explain exactly how the user can effectively improve to get a higher score.
        
        Return the result as a JSON object with:
        - userTranscript (string)
        - pronunciation (number)
        - fluency (number)
        - content (number)
        - overall (number)
        - feedback (string, summary)
        - sectionFeedback (object with keys: pronunciation, fluency, content. Each value is a detailed string)
        - breakdown (object with keys: pronunciation, fluency, content)
      `;

      const ai = getAI();
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          { text: prompt },
          { inlineData: { mimeType: "audio/mp3", data: base64Audio } }
        ],
        config: { 
          responseMimeType: "application/json",
          maxOutputTokens: 1000,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              userTranscript: { type: Type.STRING },
              pronunciation: { type: Type.NUMBER },
              fluency: { type: Type.NUMBER },
              content: { type: Type.NUMBER },
              overall: { type: Type.NUMBER },
              feedback: { type: Type.STRING },
              sectionFeedback: {
                type: Type.OBJECT,
                properties: {
                  pronunciation: { type: Type.STRING },
                  fluency: { type: Type.STRING },
                  content: { type: Type.STRING }
                },
                required: ["pronunciation", "fluency", "content"]
              },
              breakdown: {
                type: Type.OBJECT,
                properties: {
                  pronunciation: { type: Type.NUMBER },
                  fluency: { type: Type.NUMBER },
                  content: { type: Type.NUMBER }
                },
                required: ["pronunciation", "fluency", "content"]
              }
            },
            required: ["userTranscript", "pronunciation", "fluency", "content", "overall", "feedback", "sectionFeedback", "breakdown"]
          }
        }
      });

      const res = JSON.parse(response.text || "{}");
      return {
        ...res,
        sectionFeedback: res.sectionFeedback || null,
        breakdown: res.breakdown || {
          pronunciation: res.pronunciation || 0,
          fluency: res.fluency || 0,
          content: res.content || 0
        }
      };
    }
  } catch (error) {
    console.error("AI Speech Analysis Error:", error);
    throw error;
  }
};

/**
 * Analyze writing for PTE tasks.
 * Uses ChatGPT as the primary engine for high-quality feedback.
 */
export const analyzeWriting = async (userSummary: string, originalTranscript: string, taskType: string) => {
  try {
    // 1. Try ChatGPT first (Best for Writing)
    try {
      const result = await openaiService.getFeedback(originalTranscript, userSummary);
      
      // Always use Gemini to generate high-quality PTE-style feedback based on OpenAI's analysis
      let finalFeedback = "";
      let sectionFeedback: any = null;
      try {
          const ai = getAI();
          const feedbackPrompt = `
            Act as a professional PTE Writing coach and examiner. 
            Original Task: "${originalTranscript}"
            Student Answer: "${userSummary}"
            Scores:
            - Overall: ${result.score || 0}/90
            - Grammar: ${result.grammar || 0}/90
            - Vocabulary: ${result.vocabulary || 0}/90
            - Spelling: ${result.spelling || 0}/90
            - Content: ${result.content || 0}/90
            
            Raw Feedback from AI: "${result.feedback || ""}"
            
            Your Task:
            1. Provide a polished, technical 3-4 sentence Summary Feedback in a coaching tone.
            2. Provide Individual Feedback for each section: Content, Grammar, Vocabulary, Spelling, Structure, Form, and Linguistic Range.
               - Each section feedback MUST explicitly refer to the PTE Academic scoring criteria.
               - For Content: Mention how well the student addressed the prompt and key points.
               - For Grammar: Mention sentence structure, complexity, and error frequency.
               - For Vocabulary: Mention range, precision, and academic word usage.
               - For Spelling: Mention consistency and impact on readability.
               - For Structure/Form: Mention logical flow, paragraphing, and word count requirements (e.g. 200-300 words for Essay).
               - Explain exactly how the user can effectively improve to get a higher score (e.g., "To improve vocabulary score, use more academic synonyms for common words").
            
            Return the result as a JSON object with:
            - feedback (string, summary)
            - sectionFeedback (object with keys: content, grammar, vocabulary, spelling, structure, form, linguisticRange. Each value is a detailed string referring to PTE standards)
          `;
          const feedbackRes = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: feedbackPrompt,
            config: {
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  feedback: { type: Type.STRING },
                  sectionFeedback: {
                    type: Type.OBJECT,
                    properties: {
                      content: { type: Type.STRING },
                      grammar: { type: Type.STRING },
                      vocabulary: { type: Type.STRING },
                      spelling: { type: Type.STRING },
                      structure: { type: Type.STRING },
                      form: { type: Type.STRING },
                      linguisticRange: { type: Type.STRING }
                    },
                    required: ["content", "grammar", "vocabulary", "spelling", "structure", "form", "linguisticRange"]
                  }
                },
                required: ["feedback", "sectionFeedback"]
              }
            }
          });
          const aiResult = JSON.parse(feedbackRes.text || "{}");
          finalFeedback = aiResult.feedback || result.feedback || "Good effort! Your writing shows potential, but focus on grammar and vocabulary consistency.";
          sectionFeedback = aiResult.sectionFeedback;
      } catch (e) {
          finalFeedback = result.feedback || "Good effort! Your writing shows potential, but focus on grammar and vocabulary consistency.";
      }

      return {
        overall: result.score || 0,
        feedback: finalFeedback.trim(),
        sectionFeedback,
        breakdown: {
          grammar: result.grammar || result.score || 0,
          vocabulary: result.vocabulary || result.score || 0,
          spelling: result.spelling || result.score || 0,
          content: result.content || result.score || 0,
          structure: result.structure || result.score || 0,
          form: result.form || result.score || 0,
          linguistic: result.linguistic || result.score || 0
        }
      };
    } catch (openaiError) {
      console.warn("OpenAI failed, falling back to Gemini:", openaiError);

      // 2. Fallback to Gemini
      const prompt = `
        Act as a strict PTE Academic examiner and coach. 
        Task: ${taskType}
        Original: "${originalTranscript}"
        User: "${userSummary}"
        
        Analyze the user's writing for PTE Academic standards (0-90) on:
        - Content (Addressing the prompt and key points)
        - Grammar (Sentence structure and accuracy)
        - Vocabulary (Range and precision)
        - Spelling (Consistency and readability)
        - Structure (Logical flow and paragraphing)
        - Form (Word count requirements)
        - Linguistic Range (Complexity of language)
        
        Your Task:
        1. Provide a score (0-90) for each category and an overall score.
        2. Provide a high-quality Summary Feedback (3-4 sentences).
        3. Provide Individual Feedback for each section (Content, Grammar, Vocabulary, Spelling, Structure, Form, Linguistic Range).
           - Each section feedback MUST explicitly refer to the PTE Academic scoring criteria.
           - Explain exactly how the user can effectively improve to get a higher score.
        
        Return the result as a JSON object with:
        - overall (number)
        - feedback (string, summary)
        - sectionFeedback (object with keys: content, grammar, vocabulary, spelling, structure, form, linguisticRange. Each value is a detailed string)
        - breakdown (object with keys: grammar, vocabulary, spelling, content, structure, form, linguistic)
      `;

      const ai = getAI();
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: { 
          responseMimeType: "application/json",
          maxOutputTokens: 1000,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              overall: { type: Type.NUMBER },
              feedback: { type: Type.STRING },
              sectionFeedback: {
                type: Type.OBJECT,
                properties: {
                  content: { type: Type.STRING },
                  grammar: { type: Type.STRING },
                  vocabulary: { type: Type.STRING },
                  spelling: { type: Type.STRING },
                  structure: { type: Type.STRING },
                  form: { type: Type.STRING },
                  linguisticRange: { type: Type.STRING }
                },
                required: ["content", "grammar", "vocabulary", "spelling", "structure", "form", "linguisticRange"]
              },
              breakdown: {
                type: Type.OBJECT,
                properties: {
                  grammar: { type: Type.NUMBER },
                  vocabulary: { type: Type.NUMBER },
                  spelling: { type: Type.NUMBER },
                  content: { type: Type.NUMBER },
                  structure: { type: Type.NUMBER },
                  form: { type: Type.NUMBER },
                  linguistic: { type: Type.NUMBER }
                },
                required: ["grammar", "vocabulary", "spelling", "content", "structure", "form", "linguistic"]
              }
            },
            required: ["overall", "feedback", "sectionFeedback", "breakdown"]
          }
        }
      });

      const res = JSON.parse(response.text || "{}");
      return {
        overall: res.overall || 0,
        feedback: res.feedback || "Good effort! Your writing shows potential, but focus on grammar and vocabulary consistency.",
        sectionFeedback: res.sectionFeedback || null,
        breakdown: res.breakdown || {
          grammar: res.grammar || 0,
          vocabulary: res.vocabulary || 0,
          spelling: res.spelling || 0,
          content: res.content || 0,
          structure: res.structure || 0,
          form: res.form || 0,
          linguistic: res.linguistic || 0
        }
      };
    }
  } catch (error) {
    console.error("AI Writing Analysis Error:", error);
    throw error;
  }
};
