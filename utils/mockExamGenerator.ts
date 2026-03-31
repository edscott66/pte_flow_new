import { MULTIPLE_CHOICE_READING_SINGLE_QUESTIONS } from '../constants/multipleChoiceReadingSingleData';
import { READ_ALOUD_QUESTIONS } from '../constants/readAloudData';
import { REPEAT_SENTENCE_QUESTIONS } from '../constants/repeatSentenceData';
import { DESCRIBE_IMAGE_QUESTIONS } from '../constants/describeImageData';
import { RETELL_LECTURE_QUESTIONS } from '../constants/retellLectureData';
import { ANSWER_SHORT_QUESTION_DATA } from '../constants/answerShortQuestionData';
import { SUMMARIZE_WRITTEN_QUESTIONS } from '../constants/summarizeWrittenData';
import { ESSAY_QUESTIONS } from '../constants/essayData';
import { FILL_BLANKS_RW_QUESTIONS } from '../constants/fillBlanksRWData';
import { MULTIPLE_CHOICE_QUESTIONS } from '../constants/multipleChoiceData';
import { REORDER_PARAGRAPHS_QUESTIONS } from '../constants/reOrderParagraphsData';
import { MULTIPLE_CHOICE_SINGLE_QUESTIONS } from '../constants/multipleChoiceSingleData';
import { FILL_BLANKS_QUESTIONS } from '../constants/fillBlanksData';
import { SUMMARIZE_SPOKEN_QUESTIONS } from '../constants/summarizeSpokenData';
import { LISTENING_FILL_BLANKS_QUESTIONS } from '../constants/listeningFillBlanksData';
import { HIGHLIGHT_CORRECT_SUMMARY_QUESTIONS } from '../constants/highlightCorrectSummaryData';
import { SELECT_MISSING_WORD_QUESTIONS } from '../constants/selectMissingWordData';
import { HIGHLIGHT_INCORRECT_QUESTIONS } from '../constants/highlightIncorrectData';
import { WRITE_DICTATION_QUESTIONS } from '../constants/writeDictationData';
import { SUMMARIZE_GROUP_QUESTIONS } from '../constants/summarizeGroupData';
import { RESPOND_SITUATION_QUESTIONS } from '../constants/respondSituationData';
// Make sure this matches your actual export name in the constants file
import { MULTIPLE_CHOICE_LISTENING_MULTI_QUESTIONS } from '../constants/multipleChoiceListeningMultiData';

// --- SAFE RANDOM PICKER ---
const pickRandom = (data: any[], count: number, type: string) => {
  if (!data || !Array.isArray(data) || data.length === 0) return[];
  const shuffled = [...data].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count).map(q => ({ ...q, type: type })); 
};

// --- MOCK EXAM BUILDER ---
export const generateMockExam = () => {
  let examQuestions: any[] =[];

  // 1. Personal Introduction (Always loads first, proving the exam started)
  examQuestions.push({
    id: 'intro-1',
    type: 'personal-intro',
    title: 'Personal Introduction',
    prompt: "Please read the prompt below and introduce yourself. You have 25 seconds to prepare, and 30 seconds to speak. Talk about your interests, your home country, and why you are taking this exam."
  });

  // --- CRASH-PROOF ADDER FUNCTION ---
  // If an import is missing or broken, it skips it safely instead of crashing.
  const safeAdd = (dataArray: any, count: number, typeString: string) => {
      try {
          if (dataArray && Array.isArray(dataArray)) {
              const items = pickRandom(dataArray, count, typeString);
              examQuestions = examQuestions.concat(items);
          } else {
              console.warn(`Mock Exam Warning: Data for '${typeString}' is missing or not an array.`);
          }
      } catch (e) {
          console.error(`Mock Exam Error adding '${typeString}':`, e);
      }
  };

  // --- PART 1: SPEAKING & WRITING ---
  safeAdd(READ_ALOUD_QUESTIONS, 7, 'read-aloud');
  safeAdd(REPEAT_SENTENCE_QUESTIONS, 12, 'repeat-sentence');
  safeAdd(DESCRIBE_IMAGE_QUESTIONS, 4, 'describe-image');
  safeAdd(RESPOND_SITUATION_QUESTIONS, 2, 'respond-to-situation');
  safeAdd(RETELL_LECTURE_QUESTIONS, 2, 'retell-lecture');
  safeAdd(SUMMARIZE_GROUP_QUESTIONS, 2, 'summarize-group-discussion');
  safeAdd(ANSWER_SHORT_QUESTION_DATA, 6, 'answer-short-question');
  safeAdd(SUMMARIZE_WRITTEN_QUESTIONS, 2, 'summarize-written');
  safeAdd(ESSAY_QUESTIONS, 1, 'essay');

  // --- PART 2: READING ---
  safeAdd(FILL_BLANKS_RW_QUESTIONS, 6, 'fill-blanks-rw');
  safeAdd(MULTIPLE_CHOICE_QUESTIONS, 2, 'multiple-choice');
  safeAdd(REORDER_PARAGRAPHS_QUESTIONS, 3, 're-order-paragraphs');
  safeAdd(MULTIPLE_CHOICE_READING_SINGLE_QUESTIONS, 2, 'multiple-choice-r-single');
  safeAdd(FILL_BLANKS_QUESTIONS, 5, 'fill-blanks');

  // --- PART 3: LISTENING ---
  safeAdd(SUMMARIZE_SPOKEN_QUESTIONS, 2, 'summarize-spoken');
  safeAdd(MULTIPLE_CHOICE_LISTENING_MULTI_QUESTIONS, 2, 'multiple-choice-l-multi');
  safeAdd(LISTENING_FILL_BLANKS_QUESTIONS, 3, 'fill-blanks-listening');
  safeAdd(HIGHLIGHT_CORRECT_SUMMARY_QUESTIONS, 2, 'highlight-correct-summary');
  safeAdd(MULTIPLE_CHOICE_SINGLE_QUESTIONS, 2, 'multiple-choice-l-single'); // Reusing Reading Single MC data if you don't have a separate Listening one
  safeAdd(SELECT_MISSING_WORD_QUESTIONS, 2, 'select-missing-word');
  safeAdd(HIGHLIGHT_INCORRECT_QUESTIONS, 3, 'highlight-incorrect');
  safeAdd(WRITE_DICTATION_QUESTIONS, 4, 'write-dictation');

  return examQuestions;
};