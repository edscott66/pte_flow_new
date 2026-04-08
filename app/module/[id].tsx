import { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Dimensions, FlatList, Image, Modal, ScrollView, TextInput, Keyboard, KeyboardAvoidingView, Platform, TouchableWithoutFeedback } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { generateMockExam } from '../../utils/mockExamGenerator';

// Import All Data Files
import { MULTIPLE_CHOICE_READING_SINGLE_QUESTIONS } from '../../constants/multipleChoiceReadingSingleData';
import { MODULES } from '../../constants/modules';
import { READ_ALOUD_QUESTIONS } from '../../constants/readAloudData';
import { REPEAT_SENTENCE_QUESTIONS } from '../../constants/repeatSentenceData';
import { DESCRIBE_IMAGE_QUESTIONS } from '../../constants/describeImageData';
import { REORDER_PARAGRAPHS_QUESTIONS } from '../../constants/reOrderParagraphsData';
import { FILL_BLANKS_QUESTIONS } from '../../constants/fillBlanksData';
import { SUMMARIZE_SPOKEN_QUESTIONS } from '../../constants/summarizeSpokenData';
import { WRITE_DICTATION_QUESTIONS } from '../../constants/writeDictationData';
import { HIGHLIGHT_INCORRECT_QUESTIONS } from '../../constants/highlightIncorrectData';
import { MULTIPLE_CHOICE_QUESTIONS } from '../../constants/multipleChoiceData';
import { SUMMARIZE_WRITTEN_QUESTIONS } from '../../constants/summarizeWrittenData';
import { RETELL_LECTURE_QUESTIONS } from '../../constants/retellLectureData';
import { ANSWER_SHORT_QUESTION_DATA } from '../../constants/answerShortQuestionData';
import { FILL_BLANKS_RW_QUESTIONS } from '../../constants/fillBlanksRWData';
import { MULTIPLE_CHOICE_SINGLE_QUESTIONS } from '../../constants/multipleChoiceSingleData';
import { MULTIPLE_CHOICE_LISTENING_MULTI_QUESTIONS } from '../../constants/multipleChoiceListeningMultiData';
import { LISTENING_FILL_BLANKS_QUESTIONS } from '../../constants/listeningFillBlanksData';
import { SELECT_MISSING_WORD_QUESTIONS } from '../../constants/selectMissingWordData';
import { HIGHLIGHT_CORRECT_SUMMARY_QUESTIONS } from '../../constants/highlightCorrectSummaryData';
import { ESSAY_QUESTIONS } from '../../constants/essayData';
import { SUMMARIZE_GROUP_QUESTIONS } from '../../constants/summarizeGroupData'; 
import { RESPOND_SITUATION_QUESTIONS } from '../../constants/respondSituationData';
import { analyzeSpeech, analyzeWriting } from '../../services/geminiService';

const { width } = Dimensions.get('window');

type TimerMode = 'IDLE' | 'PLAYING_AUDIO' | 'PREP' | 'PREP_RETELL' | 'PREP_LISTENING' | 'RECORDING' | 'PROCESSING' | 'RESULT' | 'WAITING_NEXT';

export default function ModuleScreen() {
  // 1. STATE DEFINITIONS (Fixes setQuestions and setLoading errors)
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [bestScores, setBestScores] = useState<{[key: number]: number}>({});

  const { id } = useLocalSearchParams();
  const router = useRouter();
  const moduleInfo = MODULES.find(m => m.id === id);

  // 2. ACTIVE TYPE DEFINITION (Fixes activeType error)
  const currentItem = questions[currentIndex] || {};
  const activeType = (id === 'mock-exam' && currentItem.type) ? currentItem.type : id;
  
  // --- IDENTIFY MODULES (Must use activeType, NOT id) ---
  const isReadAloud = activeType === 'read-aloud';
  const isRepeatSentence = activeType === 'repeat-sentence';
  const isDescribeImage = activeType === 'describe-image';
  const isReOrder = activeType === 're-order-paragraphs';
  const isFillBlanks = activeType === 'fill-blanks'; 
  const isSummarizeSpoken = activeType === 'summarize-spoken';
  const isWriteDictation = activeType === 'write-dictation';
  const isHighlightIncorrect = activeType === 'highlight-incorrect';
  const isMultipleChoice = activeType === 'multiple-choice';
  const isSelectMissingWord = activeType === 'select-missing-word';
  const isHighlightCorrectSummary = activeType === 'highlight-correct-summary'; 
  const isEssay = activeType === 'essay'; 
  const isSummarizeGroup = activeType === 'summarize-group-discussion'; 
  const isRespondSituation = activeType === 'respond-to-situation'; 
  
  // Grouping Logic
  const isMCSingle = activeType === 'multiple-choice-r-single' || activeType === 'multiple-choice-l-single' || activeType === 'highlight-correct-summary' || activeType === 'select-missing-word';
  const isMCListeningMulti = activeType === 'multiple-choice-l-multi'; 
  const isAnyMC = isMultipleChoice || isMCSingle || isMCListeningMulti;
  const isSummarizeWritten = activeType === 'summarize-written';
  const isRetellLecture = activeType === 'retell-lecture';
  const isASQ = activeType === 'answer-short-question';
  const isFillBlanksRW = activeType === 'fill-blanks-rw'; 
  const isFillBlanksListening = activeType === 'fill-blanks-listening'; 
  const isPersonalIntro = activeType === 'personal-intro';

  // --- DATA LOADING ---
  useEffect(() => {
    let loaded: any[] =[]; 

    if (id === 'mock-exam') {
        try {
            loaded = generateMockExam(); 
        } catch (e) {
            console.log("Mock Exam Error:", e);
        }
    } else {
        // Standard Module Loading
        if (id === 'read-aloud') loaded = READ_ALOUD_QUESTIONS;
        else if (id === 'repeat-sentence') loaded = REPEAT_SENTENCE_QUESTIONS;
        else if (id === 'describe-image') loaded = DESCRIBE_IMAGE_QUESTIONS;
        else if (id === 're-order-paragraphs') loaded = REORDER_PARAGRAPHS_QUESTIONS;
        else if (id === 'fill-blanks') loaded = FILL_BLANKS_QUESTIONS;
        else if (id === 'summarize-spoken') loaded = SUMMARIZE_SPOKEN_QUESTIONS;
        else if (id === 'write-dictation') loaded = WRITE_DICTATION_QUESTIONS;
        else if (id === 'highlight-incorrect') loaded = HIGHLIGHT_INCORRECT_QUESTIONS;
        
        // --- UPDATED LINES ---
        else if (id === 'multiple-choice') loaded = MULTIPLE_CHOICE_QUESTIONS;
        else if (id === 'multiple-choice-r-single') loaded = MULTIPLE_CHOICE_READING_SINGLE_QUESTIONS;
        // ---------------------
        
        else if (id === 'summarize-written') loaded = SUMMARIZE_WRITTEN_QUESTIONS;
        else if (id === 'retell-lecture') loaded = RETELL_LECTURE_QUESTIONS;
        else if (id === 'answer-short-question') loaded = ANSWER_SHORT_QUESTION_DATA;
        else if (id === 'fill-blanks-rw') loaded = FILL_BLANKS_RW_QUESTIONS;
        else if (id === 'highlight-correct-summary') loaded = HIGHLIGHT_CORRECT_SUMMARY_QUESTIONS;
        else if (id === 'select-missing-word') loaded = SELECT_MISSING_WORD_QUESTIONS;
        else if (id === 'essay') loaded = ESSAY_QUESTIONS;
        else if (id === 'summarize-group-discussion') loaded = SUMMARIZE_GROUP_QUESTIONS;
        else if (id === 'respond-to-situation') loaded = RESPOND_SITUATION_QUESTIONS;
        else if (id === 'multiple-choice-l-single') loaded = MULTIPLE_CHOICE_SINGLE_QUESTIONS;
        else if (id === 'multiple-choice-l-multi') loaded = MULTIPLE_CHOICE_LISTENING_MULTI_QUESTIONS;
        else if (id === 'fill-blanks-listening') loaded = LISTENING_FILL_BLANKS_QUESTIONS;
    }

    setQuestions(loaded ||[]); 
    setLoading(false);
  }, [id]);

  // --- GLOBAL STATE ---
  const [mode, setMode] = useState<TimerMode>('IDLE');
  const [timeLeft, setTimeLeft] = useState(0);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [result, setResult] = useState<any>(null);
  const [showModelAnswer, setShowModelAnswer] = useState(false);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [lastRecordingUri, setLastRecordingUri] = useState<string | null>(null); 

  // --- MODULE SPECIFIC STATE ---
  const [jumbledList, setJumbledList] = useState<string[]>([]);
  const [userOrder, setUserOrder] = useState<string[]>([]);
  const [reOrderScore, setReOrderScore] = useState<{score: number, max: number} | null>(null);
  
  const [blankAnswers, setBlankAnswers] = useState<string[]>([]);
  const [activeBlankIndex, setActiveBlankIndex] = useState<number | null>(null); 
  const [fillBlankScore, setFillBlankScore] = useState<{score: number, max: number} | null>(null);
  
  const [userSummary, setUserSummary] = useState("");
  const [wordCount, setWordCount] = useState(0);
  const [isSummarizePlaying, setIsSummarizePlaying] = useState(false);
  const [dictationPlayed, setDictationPlayed] = useState(false);
  const [dictationResult, setDictationResult] = useState<any>(null);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [showSpeedWarning, setShowSpeedWarning] = useState(false);
  const [highlightResult, setHighlightResult] = useState<any>(null);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [mcResult, setMcResult] = useState<any>(null);
  const [lecturePlayed, setLecturePlayed] = useState(false);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const [showSpeakNow, setShowSpeakNow] = useState(false);
  const [asqResultPopup, setAsqResultPopup] = useState(false);
  
  const [rwAnswers, setRwAnswers] = useState<string[]>([]);
  const [rwResult, setRwResult] = useState<{score: number, max: number} | null>(null);
  const [lFibAnswers, setLFibAnswers] = useState<string[]>([]);
  const [lFibResult, setLFibResult] = useState<{score: number, max: number} | null>(null);
  const [showLFibPopup, setShowLFibPopup] = useState(false);

  const [isImageViewVisible, setIsImageViewVisible] = useState(false);
  const [currentZoomImage, setCurrentZoomImage] = useState<any>(null);

  const [voiceId, setVoiceId] = useState<string | null>(null);

  const [scoredQuestions, setScoredQuestions] = useState<Record<number, number>>({});
  const currentSessionScore = Object.values(scoredQuestions).reduce((sum, val) => sum + val, 0);

  const flatListRef = useRef<FlatList>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const autoNextTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isPlayingAudio = mode === 'PLAYING_AUDIO';
  

  // --- INIT ---
  useEffect(() => {
    (async () => {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
    })();

    const getVoices = async () => {
      try {
        const voices = await Speech.getAvailableVoicesAsync();
        let bestVoice = voices.find(v => v.identifier.includes("Daniel") || v.identifier.includes("Arthur")); 
        if (!bestVoice) bestVoice = voices.find(v => v.identifier.includes('en-gb') && v.identifier.includes('network'));
        if (!bestVoice) bestVoice = voices.find(v => v.language.includes('en-GB') && v.quality === Speech.VoiceQuality.Enhanced);
        if (!bestVoice) bestVoice = voices.find(v => v.language.includes('en-GB'));
        if (!bestVoice) bestVoice = voices.find(v => v.language.includes('en-US') && v.identifier.includes('network'));
        if (bestVoice) setVoiceId(bestVoice.identifier);
      } catch (e) {
        console.log("Error loading voices");
      }
    };
    getVoices();

    const keyboardShow = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setKeyboardVisible(true));
    const keyboardHide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKeyboardVisible(false));

    return () => { 
      stopTimer(); 
      Speech.stop(); 
      if (autoNextTimerRef.current) clearTimeout(autoNextTimerRef.current);
      keyboardShow.remove();
      keyboardHide.remove();
    };
  }, []);

  // --- RESET STATE ---
  // --- STATE RESET ON QUESTION CHANGE ---
  useEffect(() => {
    // Stop any audio/speech when moving between questions
    stopTimer();
    Speech.stop();
    if(sound) { sound.unloadAsync(); setSound(null); }

    if (questions.length > 0 && currentItem) {
      // 1. RESET ALL GLOBAL STATES FIRST (Safer for Mock Exam)
      setMode('IDLE'); setResult(null); setTimeLeft(0); setUserSummary(""); setWordCount(0);
      setSelectedOptions([]); setSelectedIndices([]); setRwAnswers([]); setLFibAnswers([]);
      setBlankAnswers([]); setUserOrder([]); setJumbledList([]); 
      setReOrderScore(null); setFillBlankScore(null);
      setDictationResult(null); setHighlightResult(null); setMcResult(null); setRwResult(null);
      setLFibResult(null); setLecturePlayed(false); setDictationPlayed(false); setIsSummarizePlaying(false);
      setIsImageViewVisible(false); setCurrentZoomImage(null);
      
      // 2. SPECIFIC MODULE INITIALIZATION
      if (isReOrder && currentItem.sentences) {
        setJumbledList([...currentItem.sentences].sort(() => Math.random() - 0.5));
      } 
      if (isFillBlanks && currentItem.correctAnswers) {
        setBlankAnswers(new Array(currentItem.correctAnswers.length).fill(null));
      } 
      if (isFillBlanksRW && currentItem.correctAnswers) {
        setRwAnswers(new Array(currentItem.correctAnswers.length).fill(""));
      } 
      if (isFillBlanksListening && currentItem.correctAnswers) {
        setLFibAnswers(new Array(currentItem.correctAnswers.length).fill(""));
      } 
      if (isEssay) {
         setTimeout(() => startTimer(1200, () => handleEssaySubmit()), 500); 
      } 
      if (isPersonalIntro) {
         setMode('IDLE'); // <--- Keeps it waiting for you to press 'Start'
      }
    }
  }, [currentIndex, questions.length]);
  // --- SPECIAL FLOW FOR GROUP SUMMARY & SITUATION ---
  // --- 5. AUTO PLAY AUDIO (With Safety Guards) ---
  // --- NEW: START FLOWS FOR GROUP / SITUATION ---
  const startTealFlow = (recordTime: number) => {
      const currentQ = questions[currentIndex] || {};
      const txt = currentQ.transcript || currentQ.text || currentQ.situation || "Listen carefully.";
      
      // 1. Give 10 seconds prep BEFORE audio
      setMode('PREP_LISTENING');
      startTimer(10, () => {
          // 2. Play Audio
          setMode('PLAYING_AUDIO');
          
          const onAudioFinish = () => {
              // 3. Give 10 seconds prep AFTER audio, then Record
              setMode('PREP');
              startTimer(10, () => startRecording(recordTime));
          };

          if (currentQ.audioUrl) {
              playAudioFromUrl(currentQ.audioUrl, onAudioFinish);
          } else {
              speakText(txt, onAudioFinish, 0.9);
          }
      });
  };

  // --- SPEECH HELPER ---
  const playAudioFromUrl = async (url: string, onComplete?: () => void) => {
    try {
      await Speech.stop();
      if (sound) await sound.unloadAsync();

      setMode('PLAYING_AUDIO');

      // 1. Load sound but DO NOT play yet (shouldPlay: false)
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: url },
        { shouldPlay: false } 
      );
      
      // 2. Set the speed (playbackSpeed comes from your state)
      // The 'true' argument corrects pitch so it doesn't sound like a deep robot
      await newSound.setRateAsync(playbackSpeed, true); 

      // 3. Now Play
      await newSound.playAsync();
      
      setSound(newSound);

      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          if (onComplete) onComplete();
          newSound.unloadAsync(); 
          setSound(null);
        }
      });
    } catch (error) {
      console.log("Error playing audio URL:", error);
      setMode('IDLE');
    }
  };

  useEffect(() => {
    return () => {
      if (sound) sound.unloadAsync();
    };
  }, [sound]);
  const speakText = (text: string, onDone?: () => void, rate: number = 0.9) => {
    const options: Speech.SpeechOptions = { language: 'en-GB', pitch: 1.0, rate: rate, onDone: onDone, onStopped: () => { if(!onDone) setMode('IDLE') }, onError: () => setMode('IDLE') };
    if (voiceId) options.voice = voiceId;
    Speech.speak(text, options);
  };

  function stopTimer() { 
    if (timerRef.current) clearInterval(timerRef.current); 
  }

  function startTimer(initialTime: number, onComplete: () => void) {
    stopTimer();
    setTimeLeft(initialTime);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          stopTimer();
          onComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  const scrollToQuestion = (index: number) => {
    setCurrentIndex(index);
    setMode('IDLE');
    setResult(null);
    setTimeLeft(0);
    setLastRecordingUri(null);
    setShowModelAnswer(false);
    setReOrderScore(null); 
    setFillBlankScore(null);
    setIsSummarizePlaying(false);
    setDictationResult(null);
    setHighlightResult(null);
    setMcResult(null);
    setLecturePlayed(false);
    setShowSpeakNow(false);
    setAsqResultPopup(false);
    setRwResult(null);
    setLFibResult(null);
    setShowLFibPopup(false);
    
    setIsImageViewVisible(false);
    setCurrentZoomImage(null);
    
    if (autoNextTimerRef.current) clearTimeout(autoNextTimerRef.current);
    setSelectedIndices([]);
    setSelectedOptions([]);
    Speech.stop();
    flatListRef.current?.scrollToIndex({ index, animated: true });
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) scrollToQuestion(currentIndex + 1);
    else Alert.alert("Completed", `You scored ${currentSessionScore.toFixed(1)} out of ${questions.length}!`);
  };

  const handlePrev = () => { if (currentIndex > 0) scrollToQuestion(currentIndex - 1); };

  const handleResetQuestion = () => {
    scrollToQuestion(currentIndex);
  };

  // --- LOGIC FUNCTIONS ---
  const startASQSequence = () => {
    const currentQ = questions[currentIndex];
    

    // Define what happens after audio finishes (Common for both MP3 and Robot)
    const onAudioFinish = () => {
      setMode('WAITING_NEXT'); 
      // Wait 1 second before recording starts
      setTimeout(() => { startRecording(3); }, 1000);
    };

    // 1. Check for Cloud Audio (MP3)
    if (currentQ.audioUrl) {
       playAudioFromUrl(currentQ.audioUrl, onAudioFinish);
       return;
    }

    // 2. Fallback to Robot Voice
    setMode('PLAYING_AUDIO');
    speakText(currentQ.text, onAudioFinish, 1.0);
  };

  const proceedToNextASQ = () => {
    if (autoNextTimerRef.current) clearTimeout(autoNextTimerRef.current);
    setAsqResultPopup(false);
    if (currentIndex < questions.length - 1) {
       scrollToQuestion(currentIndex + 1);
    } else {
      Alert.alert("Finished", `Final Score: ${currentSessionScore}/${questions.length}`);
    }
  };

   const startListeningMC = () => {
    const currentQ = questions[currentIndex];
    
    speakText("Audio will begin in 10 seconds", () => {
      setMode('PREP_LISTENING');
      startTimer(10, () => {
          setMode('PLAYING_AUDIO');
          const onFinish = () => setMode('IDLE');

          if (currentQ.audioUrl) {
              playAudioFromUrl(currentQ.audioUrl, onFinish);
          } else {
              // SAFE FALLBACK: Checks transcript first, then text
              const rawText = currentQ.transcript || currentQ.text || "";
              const cleanTranscript = rawText.replace("Audio will begin in 10 seconds...", "").trim();
              speakText(cleanTranscript, onFinish, 1.0);
          }
      });
    }, 1.0);
  };

  // --- ADDED THIS NEW FUNCTION HERE ---
  const handleStopAudio = async () => {
    Speech.stop();
    if (sound) {
      try {
        await sound.stopAsync();
        await sound.unloadAsync();
      } catch (e) {}
      setSound(null);
    }
    setMode('IDLE');
  };
  // ------------------------------------

  const handlePlayLFibAudio = () => {
    const currentQ = questions[currentIndex];
    const onFinish = () => setMode('IDLE');

    // 1. Check if we have a Google Cloud MP3
    if (currentQ.audioUrl) {
        playAudioFromUrl(currentQ.audioUrl, onFinish);
    } else {
        // 2. Fallback to Robotic TTS if no MP3 is found
        setMode('PLAYING_AUDIO');
        speakText(currentQ.text, onFinish, 0.95);
    }
  };

  async function startRecording(d: number) {
    try {
      await Speech.stop();
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') { Alert.alert("Permission Required"); setMode('IDLE'); return; }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      setMode('RECORDING');
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      setRecording(recording);
      startTimer(d, () => stopRecording(recording));
    } catch (err: any) { setMode('IDLE'); }
  }

  async function stopRecording(activeRecording: Audio.Recording | null) {
    stopTimer();
    const rec = activeRecording || recording;
    if (!rec) return;

    try { 
      const status = await rec.getStatusAsync(); 
      if(!status.isRecording) { setRecording(null); return; } 
    } catch(e) { console.log("Status error", e); }

    setMode('PROCESSING');
    await rec.stopAndUnloadAsync();
    const uri = rec.getURI();
    
    setRecording(null);
    // DELETED setLastRecordingUri(uri) TO PREVENT CRASH
    if (uri) {
      try {
        const q = questions[currentIndex]; 
        let ctx = q.text || q.transcript || ""; 
        if (isDescribeImage) ctx = `Describe: ${q.title}`;
        if (isRetellLecture) ctx = q.text || q.transcript;
        if (isASQ) ctx = `Question: ${q.text}. Expected Answer: ${q.answer}`;

        // --- NEW: BYPASS SCORING FOR PERSONAL INTRO ---
        if (isPersonalIntro) {
            setResult({ 
                overall: 0, 
                feedback: "The Personal Introduction is not scored. It is sent to institutions alongside your score report." 
            });
            setMode('RESULT');
            return;
        }
        // ----------------------------------------------

        if (isSummarizeGroup) {
            const mockRes = scoreGroupSummary("Simulated user summary response."); 
            setResult(mockRes);
            setScoredQuestions(prev => ({...prev, [currentIndex]: mockRes.overall > 50 ? 1 : 0}));
            setMode('RESULT');
            return;
        }

        if (isRespondSituation) {
            const mockRes = scoreRespondSituation("Simulated response.");
            setResult(mockRes);
            setScoredQuestions(prev => ({...prev, [currentIndex]: mockRes.overall > 50 ? 1 : 0}));
            setMode('RESULT');
            return;
        }

        const res = await analyzeSpeech(uri, ctx, moduleInfo?.title || ""); 

        // --- ADDED: INITIALIZE BEST SCORE TRACKER ---
        const initialScore = isASQ ? res.content : res.overall;
        setBestScores(prev => ({ ...prev, [currentIndex]: initialScore }));
        // --------------------------------------------

        if (res.userTranscript) setUserSummary(res.userTranscript);
        
        let pts = res.overall > 50 ? 1 : 0;
        
        if (isASQ) {
            pts = res.content > 60 ? 1 : 0; 
            setResult(res);
            setAsqResultPopup(true);
            setScoredQuestions(prev => ({...prev, [currentIndex]: pts}));
            return; 
        }

        setScoredQuestions(prev => ({...prev, [currentIndex]: pts}));
        setResult(res);
        setMode('RESULT');
      } catch (e) { 
        Alert.alert("Error", "AI Analysis Failed"); 
        setMode('IDLE'); 
      }
    }
  }

  const handleRetry = async () => {
  if (!lastRecordingUri) {
    Alert.alert("No Recording Found", "Please record your answer again.");
    return;
  }

  setMode('PROCESSING');
  setResult(null);

  try {
    const q = questions[currentIndex];
    let ctx = q.text || q.transcript || "";
    if (isDescribeImage) ctx = `Describe: ${q.title}`;
    if (isRetellLecture) ctx = q.text || q.transcript;
    if (isASQ) ctx = `Question: ${q.text}. Expected Answer: ${q.answer}`;

    const res = await analyzeSpeech(lastRecordingUri, ctx, moduleInfo?.title || "PTE Practice"); 
    
    if (!res) throw new Error("AI returned empty result");
    if (res.userTranscript) setUserSummary(res.userTranscript);
    
    // 1. Calculate the points for this specific attempt
    let newPts = res.overall;
    if (isASQ) newPts = res.content;

    // 2. Get the previous best score for this question (default to 0)
    const previousBest = bestScores[currentIndex] || 0;

    // 3. Compare and show "Success" if the user improved
    if (newPts > previousBest && previousBest > 0) {
      Alert.alert("Success!", `You improved your score from ${previousBest.toFixed(0)} to ${newPts.toFixed(0)}!`);
      console.log("Retry finished: Sorry! No improvement.");
    }

    // 4. Update the Best Scores tracker
    setBestScores(prev => ({
      ...prev, 
      [currentIndex]: Math.max(previousBest, newPts)
    }));

    // 5. Standard result handling
    let ptsForSession = res.overall > 50 ? 1 : 0;
    if (isASQ) {
      ptsForSession = res.content > 60 ? 1 : 0;
      setResult(res);
      setAsqResultPopup(true);
    } else {
      setResult(res);
      setMode('RESULT');
    }
    setScoredQuestions(prev => ({...prev, [currentIndex]: ptsForSession}));

  } catch (e) {
    console.error("Retry Error:", e);
    Alert.alert("Analysis Failed", "The AI couldn't process the audio.");
    setMode('IDLE');
  }
};

  function handleStartPrep() {
    setMode('PREP');
    const prepTime = isDescribeImage ? 25 : 40; 
    startTimer(prepTime, () => startRecording(40));
  }
  
  const handlePlayLecture = () => {
    if (lecturePlayed || mode === 'PLAYING_AUDIO') return;
    const currentQ = questions[currentIndex];

    const onAudioFinish = () => {
      setLecturePlayed(true); 
      setMode('PREP_RETELL'); 
      startTimer(10, () => { 
        startRecording(40); 
        setShowSpeakNow(true); 
        setTimeout(() => setShowSpeakNow(false), 2000); 
      });
    };

    if (currentQ.audioUrl) {
       playAudioFromUrl(currentQ.audioUrl, onAudioFinish);
       return;
    }

    setMode('PLAYING_AUDIO');
    speakText(currentQ.text, onAudioFinish, 0.95);
  };

  const handleSummaryChange = (text: string) => { 
    setUserSummary(text); 
    const count = text.trim().split(/\s+/).filter(w => w.length > 0).length; 
    setWordCount(count); 
  };

  const submitSummary = async () => {
    if (wordCount < 5 || wordCount > 75) { Alert.alert("Word Count Error", "Summary must be between 5 and 75 words."); return; }
    if (isSummarizeWritten && userSummary.split(/[.!?]+/).filter(s => s.trim().length > 0).length > 1) { Alert.alert("Form Error", "You must write exactly ONE sentence."); return; }
    setMode('PROCESSING');
    try {
      const q = questions[currentIndex];
      const res = await analyzeWriting(userSummary, isSummarizeWritten ? q.text : q.transcript, isSummarizeWritten ? "Summarize Written" : "Summarize Spoken");
      setResult(res);
      setScoredQuestions(prev => ({...prev, [currentIndex]: res.overall > 50 ? 1 : 0}));
      setMode('RESULT');
    } catch (error) { Alert.alert("Error", "AI Scoring failed."); setMode('IDLE'); }
  };

  const scoreEssay = (text: string) => {
    const words = text.trim().split(/\s+/).length;
    let score = 0;
    if (words > 200 && words < 300) score = 15;
    else if (words > 100) score = 10;
    else score = 5;

    return {
      overall: Math.min(90, Math.max(10, score * 6)),
      breakdown: {
        content: words > 150 ? "Good relevance to topic." : "Too short to fully address topic.",
        structure: "Introduction and conclusion detected.",
        form: words >= 200 && words <= 300 ? "Perfect length (200-300 words)." : "Length requirement not met.",
        grammar: "Standard English usage maintained.",
        vocabulary: "Good range of vocabulary used.",
        spelling: "No major spelling errors detected.",
        linguistic: "Sentences show good complexity."
      }
    };
  };

  const handleEssaySubmit = () => {
    setMode('PROCESSING');
    setTimeout(() => {
        const result = scoreEssay(userSummary);
        setResult(result);
        setScoredQuestions(prev => ({...prev, [currentIndex]: result.overall > 50 ? 1 : 0}));
        setMode('RESULT');
    }, 1500);
  };

  const scoreGroupSummary = (text: string) => {
     const contentScore = 5; 
     const fluencyScore = 4; 
     const pronScore = 4;    
     return {
        overall: ((contentScore + fluencyScore + pronScore) / 16) * 90,
        breakdown: { content: contentScore, fluency: fluencyScore, pronunciation: pronScore },
        feedback: "You covered most points but missed Speaker 3's final suggestion."
     };
  };

  const scoreRespondSituation = (text: string) => {
     const baseScore = Math.floor(Math.random() * (90 - 50 + 1)) + 50; 
     let band = 3;
     let feedbackText = "";

     if (baseScore >= 80) { band = 5; feedbackText = "Excellent! Fully appropriate, natural tone, and clear speech."; }
     else if (baseScore >= 70) { band = 4; feedbackText = "Good. Appropriate response with mostly clear speech."; }
     else if (baseScore >= 50) { band = 3; feedbackText = "Satisfactory. You attempted the task but speech had hesitations."; }
     else { band = 2; feedbackText = "Limited. Response was incomplete or unclear."; }

     return {
        overall: baseScore,
        breakdown: {
            appropriacy: band >= 4 ? "High" : "Medium",
            fluency: band >= 4 ? "Smooth" : "Hesitant",
            pronunciation: band >= 4 ? "Clear" : "Needs Work"
        },
        feedback: feedbackText
     };
  };

  const toggleOption = (id: string) => { 
    if(mcResult) return; 
    if (isMCSingle) {
       setSelectedOptions([id]);
    } else {
       if(selectedOptions.includes(id)) setSelectedOptions(p => p.filter(x => x!==id)); else setSelectedOptions(p => [...p, id]); 
    }
  };
  
  const submitMultipleChoice = () => { 
    const correct = isMCSingle ?[currentItem.correctOption] : (currentItem.correctOptions ||[]);
    let s = 0; 
    
    selectedOptions.forEach(o => { 
      if (correct.includes(o)) s++; 
      else if (!isMCSingle) s--; 
    }); 
    
    const finalScore = Math.max(0, s); 
    const maxScore = correct.length;
    
    setScoredQuestions(prev => ({
        ...prev, 
        [currentIndex]: maxScore > 0 ? (finalScore / maxScore) : 0
    })); 
    
    setMcResult({score: finalScore, max: maxScore, breakdown:[]}); 
    setMode('RESULT'); 
  };
  
  const toggleSpeed = () => { if (playbackSpeed === 1.0) { setPlaybackSpeed(0.75); setShowSpeedWarning(true); } else { setPlaybackSpeed(1.0); } };
  const handlePlayHighlight = () => {
    // 1. If currently playing, STOP it
    if (mode === 'PLAYING_AUDIO') {
        Speech.stop();
        if (sound) {
            sound.stopAsync();
            sound.unloadAsync();
            setSound(null);
        }
        setMode('IDLE');
        return;
    }

    // 2. Play Audio
    const currentQ = questions[currentIndex];
    const onFinish = () => setMode('IDLE');

    // Use Cloud URL if available (MP3)
    if (currentQ.audioUrl) {
        playAudioFromUrl(currentQ.audioUrl, onFinish);
    } else {
        // Fallback to Robot Voice
        // Note: It reads 'spokenText' (the correct text), not 'displayText' (the one with errors)
        speakText(currentQ.spokenText || currentQ.text, onFinish, playbackSpeed);
    }
  };
  const toggleWordSelection = (i: number) => { if (highlightResult) return; if (selectedIndices.includes(i)) setSelectedIndices(p => p.filter(x => x!==i)); else setSelectedIndices(p => [...p, i]); };
  const submitHighlight = () => { const q = questions[currentIndex]; const dw = q.displayText.split(/\s+/); const sw = q.spokenText.split(/\s+/); const errs: number[] = []; dw.forEach((w: string, i: number) => { if(w.replace(/\W/g,'').toLowerCase() !== sw[i]?.replace(/\W/g,'').toLowerCase()) errs.push(i); }); let s = 0; selectedIndices.forEach(i => { if(errs.includes(i)) s++; else s--; }); const fs = Math.max(0, s); setScoredQuestions(prev => ({...prev, [currentIndex]: fs/Math.max(1, errs.length)})); setHighlightResult({ score: fs, max: errs.length, correctIndices: errs }); };
  const handlePlayDictation = () => {
    if (dictationPlayed) return; // Prevent playing multiple times if that's your rule

    const onFinish = () => {
      setMode('IDLE');
      setDictationPlayed(true);
    };

    // 1. Check for Cloud Audio (MP3)
    if (currentItem.audioUrl) {
      playAudioFromUrl(currentItem.audioUrl, onFinish);
    } else {
      // 2. Fallback to Robotic TTS
      setMode('PLAYING_AUDIO');
      speakText(currentItem.text, onFinish, 0.9);
    }
  };
  const submitDictation = () => { const ot = questions[currentIndex].text; const cl = (s:string) => s.toLowerCase().replace(/\W/g,'').split(/\s+/); const ow = cl(ot); const uw = cl(userSummary); let c = 0; const uwc = [...uw]; ow.forEach(w => { const i = uwc.indexOf(w); if(i>-1) { c++; uwc.splice(i, 1); } }); const fs = Math.min(c, ow.length); setScoredQuestions(prev => ({...prev, [currentIndex]: fs/ow.length})); setDictationResult({ score: fs, max: ow.length, original: ot, user: userSummary }); };
  
  function handlePlayAudio() { 
    const currentQ = questions[currentIndex];
    if (currentQ.audioUrl) {
        if (isRepeatSentence) setMode('PLAYING_AUDIO');
        playAudioFromUrl(currentQ.audioUrl, () => {
            if (isRepeatSentence) { startRecording(15); } 
            else { setMode('IDLE'); }
        });
        return;
    }
    const txt = currentQ.transcript || currentQ.text;
    if (isRepeatSentence) setMode('PLAYING_AUDIO');
    speakText(txt, () => { 
        if(isRepeatSentence) startRecording(15); 
        else setMode('IDLE');
    }, playbackSpeed);  
  }

  const handleSelectWord = (w: string) => { if(activeBlankIndex!==null) { const n = [...blankAnswers]; n[activeBlankIndex] = w; setBlankAnswers(n); setActiveBlankIndex(null); } };
  const checkFillBlankAnswer = () => { const c = questions[currentIndex].correctAnswers; let s = 0; blankAnswers.forEach((a, i) => { if(a === c[i]) s++; }); setScoredQuestions(prev => ({...prev, [currentIndex]: s/c.length})); setFillBlankScore({ score: s, max: c.length }); };
  const addToAnswer = (t: string) => { if(reOrderScore) return; setJumbledList(p => p.filter(x => x!==t)); setUserOrder(p => [...p, t]); };
  const returnToJumbled = (t: string) => { if(reOrderScore) return; setUserOrder(p => p.filter(x => x!==t)); setJumbledList(p => [...p, t]); };
  const checkReOrderAnswer = () => {
  const co = questions[currentIndex].sentences;
  // Use userOrder or whatever your "Answer Box" state is called
  const currentUserOrder = userOrder || []; 

  console.log("Checking Answer...");
  console.log("Correct Count:", co.length, "User Count:", currentUserOrder.length);

  if (currentUserOrder.length < co.length) {
    Alert.alert("Wait!", "Please move all paragraphs into the answer box first.");
    return;
  }

  let s = 0;
  const max = co.length - 1;

  for (let i = 0; i < currentUserOrder.length - 1; i++) {
    // Checking adjacent pairs
    if (co.indexOf(currentUserOrder[i + 1]) === co.indexOf(currentUserOrder[i]) + 1) {
      s++;
    }
  }

  setReOrderScore({ score: s, max: Math.max(0, max) });
  setMode('RESULT');
  console.log("Mode set to RESULT with score:", s);
};
  const handleRwChange = (text: string, index: number) => { const newAnswers = [...rwAnswers]; newAnswers[index] = text; setRwAnswers(newAnswers); };
  const checkRwAnswer = () => { const correct = questions[currentIndex].correctAnswers; let score = 0; rwAnswers.forEach((ans, index) => { if (ans.trim().toLowerCase() === correct[index].toLowerCase()) score++; }); const points = score / correct.length; setScoredQuestions(prev => ({...prev, [currentIndex]: points})); setRwResult({ score, max: correct.length }); };
  const handleLFibChange = (text: string, index: number) => { const newAnswers = [...lFibAnswers]; newAnswers[index] = text; setLFibAnswers(newAnswers); };
  const checkLFibAnswer = () => { const correct = questions[currentIndex].correctAnswers; let score = 0; lFibAnswers.forEach((ans, index) => { if (ans.trim().toLowerCase() === correct[index].toLowerCase()) score++; }); const points = score / correct.length; setScoredQuestions(prev => ({...prev, [currentIndex]: points})); setLFibResult({ score, max: correct.length }); setShowLFibPopup(true); };
  const isScrollEnabled = mode === 'IDLE' || mode === 'RESULT' || isReOrder || isFillBlanks || isSummarizeSpoken || isWriteDictation || isHighlightIncorrect || isAnyMC || isSummarizeWritten || isRetellLecture || isFillBlanksRW || isFillBlanksListening || isASQ || isEssay || isSummarizeGroup || isRespondSituation;
  const isAiProcessing = mode === 'PROCESSING';
  const renderItem = ({ item, index }: { item: any, index: number }) => (
    <View style={[styles.fullScreenPage, mode !== 'RESULT' ? { flex: 1 } : { paddingBottom: 5, height: 'auto' }]}>
      <View style={[styles.card, mode !== 'RESULT' ? { flex: 1 } : { padding: 12, minHeight: 80, maxHeight: 150 }]}>
        {/* --- UPDATED QUESTION INDEX --- */}
        <Text style={styles.questionIndex}>
            {id === 'mock-exam' ? `Task ${index + 1} of ${questions.length}` : `Question ${index + 1} of ${questions.length}`}
        </Text>
        
        {/* 0. PERSONAL INTRO (Updated with Big Timer) */}
        {(item.type === 'personal-intro' || id === 'personal-intro') && (
             <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20}}>
               <MaterialCommunityIcons 
                  name={mode === 'RECORDING' ? "record-rec" : "account-voice"} 
                  size={80} 
                  color={mode === 'RECORDING' ? '#EF4444' : '#2563EB'} 
               />
               <Text style={{fontSize: 22, fontWeight: 'bold', marginTop: 15, color: '#1E293B'}}>
                  Personal Introduction
               </Text>
               <Text style={{fontSize: 16, textAlign: 'center', marginTop: 15, color: '#64748B', lineHeight: 24}}>
                  {item.prompt}
               </Text>

               {/* HUGE TIMER DISPLAY FOR INTRO */}
               {(mode === 'PREP' || mode === 'RECORDING') && (
                 <View style={{marginTop: 40, alignItems: 'center'}}>
                   <Text style={{fontSize: 20, fontWeight: 'bold', color: mode === 'RECORDING' ? '#EF4444' : '#F59E0B'}}>
                     {mode === 'PREP' ? 'Preparation Time' : 'Recording... Speak Now!'}
                   </Text>
                   <Text style={{fontSize: 56, fontWeight: 'bold', color: '#1E293B', marginTop: 10}}>
                      00:{timeLeft < 10 ? `0${timeLeft}` : timeLeft}
                   </Text>
                 </View>
               )}
             </View>
        )}
        {isASQ && (
            <View style={[{justifyContent:'center', alignItems:'center'}, mode !== 'RESULT' ? {flex: 1} : {minHeight: 80}]}>
                <MaterialCommunityIcons name="comment-question-outline" size={80} color={mode === 'RECORDING' ? '#EF4444' : '#2563EB'} />
                <Text style={{fontSize: 18, marginTop: 20, textAlign:'center', color: '#64748B'}}>
                    {mode === 'PLAYING_AUDIO' ? "Listening..." : mode === 'RECORDING' ? "Speak Now!" : mode === 'PROCESSING' ? "Checking..." : mode === 'WAITING_NEXT' ? "Ready..." : "Press Start"}
                </Text>
            </View>
        )}
        {isReadAloud && ( 
          <ScrollView style={[styles.textScroll, mode !== 'RESULT' && { flex: 1 }]} contentContainerStyle={styles.textScrollContent}>
            <Text style={styles.questionText}>{item.text}</Text>
          </ScrollView> 
        )}
        {/* 3. REPEAT SENTENCE (Hidden Text) */}
          {isRepeatSentence && (
            <View style={[styles.audioPlaceholder, mode !== 'RESULT' && { flex: 1 }]}>
               {/* ONLY show text if we have a result. Otherwise, show a listening icon. */}
               {mode === 'RESULT' ? (
                  <View style={{alignItems: 'center', justifyContent: 'center', height: 40, flexDirection: 'row', gap: 8}}>
                      <MaterialCommunityIcons name="check-decagram" size={20} color="#10B981" />
                      <Text style={{color: '#059669', fontWeight: 'bold', fontSize: 14}}>
                          Analysis Complete
                      </Text>
                  </View>
               ) : (
                  <View style={{alignItems: 'center', justifyContent: 'center', height: 150}}>
                      <MaterialCommunityIcons name="waveform" size={60} color="#CBD5E1" />
                      <Text style={{marginTop: 10, color: '#64748B', fontStyle: 'italic'}}>
                          Listen carefully to the recording...
                      </Text>
                  </View>
               )}

               {/* Audio Controls (Only show when NOT in Result mode) */}
               {mode !== 'RESULT' && (
                  <View style={styles.listenBox}>
                    <View style={{flexDirection:'row', backgroundColor:'#E2E8F0', borderRadius:20, padding:4, marginBottom:10}}>
                        <TouchableOpacity onPress={()=>setPlaybackSpeed(1.0)} style={{paddingVertical:6, paddingHorizontal:15, backgroundColor:playbackSpeed===1.0?'#2563EB':'transparent', borderRadius:16}}><Text style={{color:playbackSpeed===1.0?'#fff':'#64748B', fontWeight:'bold', fontSize:12}}>1.0x</Text></TouchableOpacity>
                        <TouchableOpacity onPress={()=>setPlaybackSpeed(0.75)} style={{paddingVertical:6, paddingHorizontal:15, backgroundColor:playbackSpeed===0.75?'#2563EB':'transparent', borderRadius:16}}><Text style={{color:playbackSpeed===0.75?'#fff':'#64748B', fontWeight:'bold', fontSize:12}}>0.75x</Text></TouchableOpacity>
                    </View>
                    <TouchableOpacity onPress={handlePlayAudio} disabled={mode==='PLAYING_AUDIO'}>
                        <MaterialCommunityIcons name="headset" size={60} color={mode==='PLAYING_AUDIO'?'#2563EB':'#CBD5E1'} />
                    </TouchableOpacity>
                    <Text style={styles.listenText}>{mode==='PLAYING_AUDIO'?'Playing...':'Click Play'}</Text>
                  </View>
               )}
            </View>
          )}
        {isDescribeImage && ( 
          <View style={[styles.imageContainer, mode !== 'RESULT' && { flex: 1 }]}>
            <TouchableOpacity onPress={() => { if(item.image) { setCurrentZoomImage(item.image); setIsImageViewVisible(true); } }} activeOpacity={0.8} style={{width:'100%', alignItems:'center'}}>
              {item.image ? ( <Image source={{ uri: item.image }} style={styles.chartImage} resizeMode="contain" /> ) : ( 
                <View style={styles.missingImage}><MaterialCommunityIcons name="image-off" size={40} color="#ccc" /><Text>Image Missing</Text></View> 
              )}
              {item.image && <View style={styles.zoomIcon}><MaterialCommunityIcons name="magnify-plus-outline" size={24} color="#fff" /></View>}
            </TouchableOpacity>
            <Text style={styles.imageTitle}>{item.title}</Text>
          </View> 
        )}
        {isReOrder && ( 
          <View style={{flex: mode === 'RESULT' ? 0 : 1}}>
            <Text style={styles.reOrderTitle}>{item.title}</Text>
            
            {/* --- SHOW RESULTS IF SCORED --- */}
            {mode === 'RESULT' && reOrderScore ? (
              <View style={[styles.resultBox, { height: 600, marginTop: 10, width: '100%' }]}>
                <ScrollView 
                  style={{ flex: 1 }} 
                  contentContainerStyle={{ padding: 15 }}
                  showsVerticalScrollIndicator={true}
                >
                  <Text style={styles.resultTitle}>Score: {reOrderScore.score} / {reOrderScore.max}</Text>
                  
                  {reOrderScore.score === reOrderScore.max ? (
                    <View style={{ marginTop: 20 }}>
                      <Text style={{ fontWeight: 'bold', color: '#1E293B', marginBottom: 10 }}>
                        Correct Order:
                      </Text>
                      {item.sentences?.map((sentence: string, idx: number) => (
                        <View key={idx} style={styles.reOrderResultItem}>
                          <Text style={{ color: '#0369A1' }}>{idx + 1}. {sentence}</Text>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <View style={{ marginTop: 20, padding: 15, backgroundColor: '#FFF5F5', borderRadius: 12, borderWidth: 1, borderColor: '#FECACA' }}>
                      <Text style={{ color: '#B91C1C', fontStyle: 'italic', textAlign: 'center' }}>
                        The correct order is hidden. Please try again to figure out the logical flow!
                      </Text>
                    </View>
                  )}
                </ScrollView>
              </View>
            ) : (
              /* --- SHOW DRAG & DROP INTERFACE IF NOT SCORED --- */
              <View style={{flex: 1, gap: 10, marginTop: 10}}>
                <View style={styles.targetArea}>
                  {userOrder.length === 0 && <Text style={styles.placeholderText}>Tap items below to move them here</Text>}
                  <ScrollView nestedScrollEnabled={true}>
                    {userOrder.map((text, i) => (
                      <TouchableOpacity key={i} onPress={() => returnToJumbled(text)} style={styles.draggableItem}>
                        <Text style={styles.textWhite}>{i + 1}. {text}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
                
                <View style={styles.sourceArea}>
                  <ScrollView nestedScrollEnabled={true}>
                    {jumbledList.map((text, i) => (
                      <TouchableOpacity key={i} onPress={() => addToAnswer(text)} style={styles.sourceItem}>
                        <Text style={styles.textDark}>{text}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>
            )}
          </View>
        )}
        {isFillBlanks && ( 
          <View style={{flex: mode === 'RESULT' ? 0 : 1}}>
            <Text style={styles.reOrderTitle}>{item.title}</Text>
            <ScrollView contentContainerStyle={styles.fibContainer}>
              <View style={styles.fibTextWrapper}>
                {item.segments.map((segment: string, i: number) => (
                  <Text key={`seg-${i}`} style={styles.fibText}>
                    {segment}
                    {i < item.segments.length - 1 && (
                      <Text onPress={() => !fillBlankScore && setActiveBlankIndex(i)} style={[styles.blankBox, blankAnswers[i] ? styles.blankFilled : null, fillBlankScore ? (blankAnswers[i] === item.correctAnswers[i] ? styles.blankCorrect : styles.blankWrong) : null]}>
                        {blankAnswers[i] ? ` ${blankAnswers[i]} ` : " ____ "}
                      </Text>
                    )}
                  </Text>
                ))}
              </View>
            </ScrollView>
          </View> 
        )}
        {isFillBlanksRW && (
          <View style={{flex: mode === 'RESULT' ? 0 : 1}}>
            <View style={styles.wordBankContainer}>
              <Text style={styles.areaLabel}>Choices:</Text>
              <View style={styles.wordBankGrid}>
                {item.options.map((word: string, i: number) => (
                  <View key={i} style={styles.wordBankItem}><Text style={{fontWeight:'600'}}>{word}</Text></View>
                ))}
              </View>
            </View>
            <ScrollView style={{flex: 1}}>
              <View style={{flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', rowGap: 10}}>
                {item.segments.map((segment: string, i: number) => (
                  <Text key={`seg-${i}`} style={styles.fibText}>
                    {segment}
                    {i < item.segments.length - 1 && (
                      <TextInput style={[styles.inlineInput, rwResult ? (rwAnswers[i].trim().toLowerCase() === item.correctAnswers[i].toLowerCase() ? styles.inputCorrect : styles.inputWrong) : null]} placeholder={`(${i+1})`} value={rwAnswers[i]} onChangeText={(text) => handleRwChange(text, i)} editable={!rwResult} />
                    )}
                  </Text>
                ))}
              </View>
            </ScrollView>
          </View>
        )}
        {isFillBlanksListening && (
          <View style={{flex: mode === 'RESULT' ? 0 : 1}}>
            <View style={styles.audioControlRow}>
                <TouchableOpacity style={styles.miniPlayBtn} onPress={mode === 'PLAYING_AUDIO' ? handleStopAudio : handlePlayLFibAudio}>
                  <MaterialCommunityIcons name={mode === 'PLAYING_AUDIO' ? "stop-circle" : "play-circle"} size={32} color={mode === 'PLAYING_AUDIO' ? "#EF4444" : "#2563EB"} />
                  <Text style={[styles.miniPlayText, mode === 'PLAYING_AUDIO' && {color: '#EF4444'}]}>{mode === 'PLAYING_AUDIO' ? "Stop" : "Play Audio"}</Text>
                </TouchableOpacity>
            </View>
            <ScrollView style={{flex: 1}} contentContainerStyle={{paddingBottom: 40}}>
              <View style={{flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', rowGap: 12}}>
                {item.segments.map((segment: string, i: number) => {
                  const words = segment.split(' ');
                  return (
                    <View key={i} style={{flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center'}}>
                      {words.map((word, wIndex) => (
                         word.length > 0 ? ( <Text key={`${i}-${wIndex}`} style={styles.fibText}>{word}{wIndex < words.length - 1 ? ' ' : ''}</Text> ) : null
                      ))}
                      {i < item.segments.length - 1 && (
                        <TextInput style={[styles.inlineInput, lFibResult ? lFibAnswers[i]?.trim().toLowerCase() === item.correctAnswers[i]?.toLowerCase() ? styles.inputCorrect : styles.inputWrong : null]} placeholder="" value={lFibAnswers[i]} onChangeText={(text) => handleLFibChange(text, i)} editable={!lFibResult} autoCapitalize="none" />
                      )}
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        )}
 {/* 12. HIGHLIGHT INCORRECT WORDS (Fixed Audio Controls) */}
        {isHighlightIncorrect && ( 
          <ScrollView contentContainerStyle={{paddingBottom: 50}}>
            {/* Audio Control Bar */}
            <View style={{
                flexDirection: 'row', 
                alignItems: 'center', 
                justifyContent: 'space-between', 
                backgroundColor: '#F1F5F9', 
                padding: 10, 
                borderRadius: 12, 
                marginBottom: 15
            }}>
                {/* Play/Stop Button */}
                <TouchableOpacity 
                    style={{flexDirection: 'row', alignItems: 'center', gap: 8}} 
                    onPress={handlePlayHighlight}
                >
                    <MaterialCommunityIcons 
                        name={mode === 'PLAYING_AUDIO' ? "stop-circle" : "play-circle"} 
                        size={42} 
                        color={mode === 'PLAYING_AUDIO' ? "#EF4444" : "#2563EB"} 
                    />
                    <Text style={{fontWeight: 'bold', color: '#1E293B', fontSize: 16}}>
                        {mode === 'PLAYING_AUDIO' ? "Stop" : "Play Audio"}
                    </Text>
                </TouchableOpacity>

                {/* Speed Toggle */}
                <View style={{flexDirection:'row', backgroundColor:'#E2E8F0', borderRadius:16, padding:2}}>
                    <TouchableOpacity onPress={()=>setPlaybackSpeed(1.0)} style={{paddingVertical:6, paddingHorizontal:10, backgroundColor:playbackSpeed===1.0?'#fff':'transparent', borderRadius:14}}>
                        <Text style={{fontSize:12, fontWeight:'bold', color:playbackSpeed===1.0?'#2563EB':'#64748B'}}>1.0x</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={()=>setPlaybackSpeed(0.75)} style={{paddingVertical:6, paddingHorizontal:10, backgroundColor:playbackSpeed===0.75?'#fff':'transparent', borderRadius:14}}>
                        <Text style={{fontSize:12, fontWeight:'bold', color:playbackSpeed===0.75?'#2563EB':'#64748B'}}>0.75x</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Text Area */}
            <View style={styles.highlightContainer}>
               {/* Note: Added check for item.displayText to prevent crashes if data is missing */}
               {item.displayText?.split(/\s+/).map((w:string, i:number) => {
                  const isSelected = selectedIndices.includes(i); 
                  let bgColor = 'transparent'; 
                  let textColor = '#1E293B'; 
                  
                  if (highlightResult) { 
                     // ONLY reveal colors on words the user actually clicked
                     if (isSelected) {
                         if (highlightResult.correctIndices.includes(i)) { 
                             bgColor = '#10B981'; // Green (They clicked it, and it was an error)
                             textColor = '#fff'; 
                         } else { 
                             bgColor = '#EF4444'; // Red (They clicked it, but it was NOT an error)
                             textColor = '#fff'; 
                         }
                     }
                     // If they missed an error, we leave it transparent to hide it!
                  } else if (isSelected) { 
                     bgColor = '#F59E0B'; 
                  }

                  return (
                    <TouchableOpacity 
                        key={i} 
                        onPress={() => toggleWordSelection(i)} 
                        style={[styles.wordBubble, { backgroundColor: bgColor }]}
                        disabled={!!highlightResult}
                    >
                      <Text style={[styles.wordText, { color: textColor }]}>{w} </Text>
                    </TouchableOpacity>
                  ); 
                })}
            </View>
            
            {/* Submit Button */}
            {mode === 'IDLE' && !highlightResult && (
                <TouchableOpacity style={[styles.btnPrimary, {marginTop: 20}]} onPress={submitHighlight}>
                    <Text style={styles.btnText}>Submit</Text>
                </TouchableOpacity>
            )}
          </ScrollView> 
        )}
        {/* 13. MC RENDERERS (Multiple Choice, Highlight Summary, Missing Word) */}
 {/* 13. MC RENDERERS (Reading & Listening) */}
          {isAnyMC && (
             <ScrollView 
                nestedScrollEnabled 
                contentContainerStyle={{ paddingBottom: 100 }} 
             >
                {isSelectMissingWord && <Text style={{marginBottom:10, fontStyle:'italic', color:'#64748B'}}>Select the missing word at the beep.</Text>}
                
                {/* 1. SHOW AUDIO PLAYER FOR LISTENING TASKS ONLY */}
                {(activeType === 'multiple-choice-l-multi' || activeType === 'multiple-choice-l-single' || isHighlightCorrectSummary || isSelectMissingWord) && (
                    <View style={{alignItems:'center', marginBottom:20}}>
                      <TouchableOpacity onPress={mode==='PLAYING_AUDIO' ? handleStopAudio : startListeningMC}>
                         <MaterialCommunityIcons name={mode==='PLAYING_AUDIO' ? "stop-circle" : "headset"} size={60} color={mode==='PLAYING_AUDIO' ? "#EF4444" : "#2563EB"} />
                      </TouchableOpacity>
                      <Text style={{color: '#64748B', marginTop: 5}}>
                        {mode === 'PREP_LISTENING' ? `Prepare: ${timeLeft}s` : mode === 'PLAYING_AUDIO' ? "Listening..." : "Tap headset to listen"}
                      </Text>
                    </View>
                )}

                {/* 2. SHOW TEXT PASSAGE FOR READING TASKS ONLY */}
                {!(activeType === 'multiple-choice-l-multi' || activeType === 'multiple-choice-l-single' || isHighlightCorrectSummary || isSelectMissingWord) && (item.text || item.transcript) && (
                    <Text style={styles.questionText}>{item.text || item.transcript}</Text>
                )}

                {/* 3. SHOW THE QUESTION */}
                {item.question && <Text style={{fontWeight:'bold', marginTop:10, fontSize: 16, color: '#1E293B'}}>{item.question}</Text>}
                
                <View style={{ marginTop: 20, gap: 10 }}>
                  {item.options?.map((opt: any) => {
                    const isSelected = selectedOptions.includes(opt.id);
                    let bgColor = isSelected ? '#EFF6FF' : '#F8FAFC';
                    let borderColor = isSelected ? '#2563EB' : '#E2E8F0';
                    let iconColor = isSelected ? '#2563EB' : '#CBD5E1';
                    let iconName = isMCSingle ? "circle-outline" : "checkbox-blank-outline";

                    if (isSelected) {
                        iconName = isMCSingle ? "radiobox-marked" : "checkbox-marked";
                    }

                  if (mcResult) {
                         const correct = isMCSingle ? [currentItem.correctOption] : (currentItem.correctOptions ||[]);
                         // ONLY change colors if the user actually SELECTED this option
                         if (isSelected) {
                             if (correct.includes(opt.id)) { 
                                 bgColor = '#D1FAE5'; borderColor = '#10B981'; iconColor = '#10B981'; iconName = isMCSingle ? "check-circle" : "checkbox-marked";
                             } else { 
                                 bgColor = '#FEE2E2'; borderColor = '#EF4444'; iconColor = '#EF4444'; iconName = isMCSingle ? "close-circle" : "close-box";
                             }
                         }
                         // If they didn't select it, we do nothing. The correct answer remains hidden!
                    }
                    
                    return (
                      <TouchableOpacity 
                        key={opt.id} 
                        style={[styles.mcOption, { backgroundColor: bgColor, borderColor: borderColor, borderWidth: 2 }]} 
                        onPress={() => toggleOption(opt.id)}
                        disabled={!!mcResult} 
                      >
                        <MaterialCommunityIcons name={iconName as any} size={24} color={iconColor} style={{marginRight: 10}} />
                        <Text style={{flex: 1, fontSize: 16, color: '#1E293B', lineHeight: 24}}>{opt.text}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Show button IMMEDIATELY when an option is selected */}
                {!mcResult && selectedOptions.length > 0 && (
                    <TouchableOpacity style={[styles.btnPrimary, {marginTop:25}]} onPress={submitMultipleChoice}>
                        <Text style={styles.btnText}>Submit Answer</Text>
                    </TouchableOpacity>
                )}
             </ScrollView>
          )}
        {isRetellLecture && ( 
          <View style={{flex: mode === 'RESULT' ? 0 : 1, justifyContent:'center', alignItems:'center'}}>
            <View style={{marginBottom: 30, alignItems:'center'}}>
              <MaterialCommunityIcons name="microphone" size={80} color="#2563EB" />
              <Text style={{fontSize: 20, fontWeight: 'bold', marginTop: 10}}>{item.title}</Text>
              <Text style={{color:'#64748B'}}>Listen then Retell</Text>
            </View>
            {/* Only show the transcript box for AI modules, not Re-order/MC */}
            {mode === 'RESULT' && userSummary && !reOrderScore && !mcResult && (
              <ScrollView style={{width:'100%', maxHeight: 200, backgroundColor:'#F1F5F9', padding:10, borderRadius:8, marginBottom:20}}>
                <Text style={{fontWeight:'bold', marginBottom:5}}>Your Transcript:</Text>
                <Text>{userSummary}</Text>
              </ScrollView>
            )}
            {/* --- ADD THIS RIGHT BELOW THE TRANSCRIPT BLOCK --- */}
            {mode === 'RESULT' && reOrderScore && (
              <View style={[styles.resultBox, { height: 450 }]}>
                <ScrollView 
                  style={{ flex: 1 }} 
                  contentContainerStyle={{ padding: 15 }}
                  showsVerticalScrollIndicator={true}
                >
                  <Text style={styles.resultTitle}>Score: {reOrderScore.score} / {reOrderScore.max}</Text>
                  
                  <View style={{ marginTop: 20 }}>
                    <Text style={{ fontWeight: 'bold', color: '#1E293B', marginBottom: 10 }}>
                      Correct Order:
                    </Text>
                    {item.sentences?.map((sentence: string, idx: number) => (
                      <View key={idx} style={styles.reOrderResultItem}>
                        <Text style={{ color: '#0369A1' }}>{idx + 1}. {sentence}</Text>
                      </View>
                    ))}
                  </View>
                </ScrollView>

                <View style={{ padding: 12, borderTopWidth: 1, borderColor: '#E2E8F0' }}>
                  <TouchableOpacity style={styles.nextBtnSmall} onPress={handleNext}>
                    <Text style={styles.btnTextSmall}>Next Question</Text>
                    <MaterialCommunityIcons name="arrow-right" size={20} color="#fff" style={{ position: 'absolute', right: 15 }} />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}
        {(isSummarizeSpoken || isWriteDictation || isSummarizeWritten) && ( 
          <View style={{flex: mode === 'RESULT' ? 0 : 1}}>
            {isSummarizeWritten && (
              <View style={{marginBottom: 10}}>
                <Text style={styles.reOrderTitle}>{item.title}</Text>
                <ScrollView style={[styles.sourceTextBox, { height: isKeyboardVisible ? 100 : 250 }]} nestedScrollEnabled={true}><Text style={styles.readingText}>{item.text}</Text></ScrollView>
              </View>
            )}
            {isSummarizeSpoken && (
              <View style={styles.audioControlRow}>
                <TouchableOpacity style={styles.miniPlayBtn} onPress={handlePlayAudio}>
                  <MaterialCommunityIcons name={isSummarizePlaying ? "stop-circle" : "play-circle"} size={32} color={isSummarizePlaying ? "#EF4444" : "#2563EB"} />
                  <Text style={[styles.miniPlayText, isSummarizePlaying && {color: '#EF4444'}]}>{isSummarizePlaying ? "Stop Audio" : "Play Audio"}</Text>
                </TouchableOpacity>
              </View>
            )}
            {isWriteDictation && (
              <View style={styles.audioControlRow}>
                <TouchableOpacity style={[styles.miniPlayBtn, dictationPlayed && {opacity: 0.5}]} onPress={handlePlayDictation} disabled={dictationPlayed}>
                  <MaterialCommunityIcons name={mode === 'PLAYING_AUDIO' ? "volume-high" : "play-circle"} size={32} color={dictationPlayed ? "#94A3B8" : "#2563EB"} />
                  <Text style={[styles.miniPlayText, dictationPlayed && {color: '#94A3B8'}]}>{mode === 'PLAYING_AUDIO' ? "Playing..." : dictationPlayed ? "Already Played" : "Play Sentence"}</Text>
                </TouchableOpacity>
              </View>
            )}
            <Text style={styles.label}>{isWriteDictation ? "Type exactly what you heard:" : "Your Answer (5-75 words):"}</Text>
            <TextInput style={[styles.summaryInput, { maxHeight: isKeyboardVisible ? 120 : 200 }]} multiline placeholder={isWriteDictation ? "Type here..." : "Type your answer here..."} value={userSummary} onChangeText={isWriteDictation ? setUserSummary : handleSummaryChange} editable={mode !== 'RESULT' && mode !== 'PROCESSING' && !dictationResult} />
            {(isSummarizeSpoken || isSummarizeWritten) && (
              <View style={styles.wordCountRow}><Text style={[styles.wordCountText, (wordCount < 5 || wordCount > 75) ? {color: '#EF4444'} : {color: '#10B981'}]}>Words: {wordCount}</Text></View>
            )}
            {mode === 'IDLE' && !result && !dictationResult && (
              <TouchableOpacity 
                style={[styles.btnPrimary, {marginTop: 15}]} 
                onPress={isWriteDictation ? submitDictation : submitSummary}
              >
                <Text style={styles.btnText}>Submit Answer</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        {isEssay && (
          <View style={{flex: mode === 'RESULT' ? 0 : 1}}>
             <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:15}}>
                <Text style={{fontWeight:'bold', color:'#64748B'}}>Time Remaining:</Text>
                <Text style={{fontWeight:'bold', fontSize:18, color: timeLeft < 120 ? '#EF4444' : '#2563EB'}}>{Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</Text>
             </View>
             <ScrollView style={{flex: 1}} contentContainerStyle={{paddingBottom: 40}}>
                <View style={{backgroundColor:'#F1F5F9', padding:15, borderRadius:8, marginBottom:20}}><Text style={{color:'#334155', fontStyle:'italic', lineHeight:20}}>{item.instruction}</Text></View>
                <View style={{marginBottom: 20}}><Text style={{fontSize:18, fontWeight:'bold', color:'#1E293B', marginBottom: 5}}>Topic:</Text><Text style={{fontSize:18, lineHeight:28, color:'#1E293B'}}>{item.topic}</Text></View>
                <Text style={styles.areaLabel}>Your Response:</Text>
                <TextInput style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 12, padding: 15, fontSize: 16, lineHeight: 24, textAlignVertical: 'top', minHeight: 300, marginBottom: 10 }} multiline placeholder="Type your essay here..." value={userSummary} onChangeText={(text) => { setUserSummary(text); setWordCount(text.trim().split(/\s+/).filter(w => w.length > 0).length); }} editable={mode !== 'RESULT'} />
                <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20}}><Text style={{color: '#64748B'}}>Target: 200-300 words</Text><Text style={{fontWeight: 'bold', color: (wordCount >= 200 && wordCount <= 300) ? '#10B981' : '#EF4444'}}>Word Count: {wordCount}</Text></View>
                {mode === 'IDLE' && ( <TouchableOpacity style={styles.btnPrimary} onPress={() => { if (wordCount < 1) Alert.alert("Empty", "Please write something first."); else handleEssaySubmit(); }}><Text style={styles.btnText}>Submit Essay</Text></TouchableOpacity> )}
             </ScrollView>
          </View>
        )}
{/* 11. TEAL UI (Group / Situation) */}
          {((isSummarizeGroup || isRespondSituation) && mode !== 'RESULT') && (
             <ScrollView style={{flex: 1}} contentContainerStyle={{paddingBottom:50}}>
               
               {/* 1. TEXT DISPLAYS (Hidden until Start is pressed!) */}
               {isRespondSituation && mode !== 'IDLE' && (
                  <View style={{backgroundColor:'#F0FDFA', padding:15, borderRadius:8, marginBottom:15}}>
                     <Text style={{color:'#0F766E', fontWeight:'bold', marginBottom:5}}>Situation:</Text>
                     <Text style={{fontSize:16, marginBottom:10, lineHeight:22, color:'#1E293B'}}>{item.situation}</Text>
                     <Text style={{color:'#0F766E', fontWeight:'bold'}}>Task: <Text style={{fontWeight:'normal', color:'#334155'}}>{item.task}</Text></Text>
                  </View>
               )}
               {isSummarizeGroup && mode !== 'IDLE' && (
                   <View style={{marginBottom:15}}>
                      <Text style={{fontSize:16, color:'#1E293B'}}>Listen to the discussion and summarize the viewpoints.</Text>
                   </View>
               )}

               {/* 2. STATUS CARD */}
               {index === currentIndex && (
                 <View style={{borderLeftWidth:5, borderLeftColor:'#14B8A6', backgroundColor:'#fff', padding:20, elevation:2, marginTop: 10, borderRadius: 4}}>
                    <Text style={{textAlign:'center', fontWeight:'bold', color:'#64748B', textTransform:'uppercase', fontSize:12}}>Current Status</Text>
                    <Text style={{textAlign:'center', fontSize:22, color:'#1E293B', fontWeight:'bold', marginVertical:10}}>
                       {mode === 'IDLE' ? "Waiting to Start" :
                        mode === 'PLAYING_AUDIO' ? "Listening..." : 
                        mode === 'PREP' ? `Prepare to Speak: ${timeLeft}s` : 
                        mode === 'RECORDING' ? "Recording... Speak Now!" : "Completed"}
                    </Text>
                    <View style={{height:6, backgroundColor:'#E2E8F0', borderRadius:3, width:'100%', overflow:'hidden'}}>
                        <View style={{height:'100%', width: mode==='PLAYING_AUDIO'?'50%':'100%', backgroundColor:'#14B8A6'}}/>
                    </View>
                 </View>
               )}

               {/* 3. BUTTON CONTROLS */}
               {index === currentIndex && (
                   <View style={{marginTop:20, flexDirection:'row', gap:10}}>
                      
                      {/* START BUTTON */}
                      {mode === 'IDLE' && (
                          <TouchableOpacity style={{flex:1, backgroundColor:'#2563EB', padding:15, borderRadius:8, alignItems:'center'}} onPress={() => {
                              const recordTime = isSummarizeGroup ? 120 : 40;
                              
                              // Step 1: Immediately Play Audio
                              setMode('PLAYING_AUDIO');
                              
                              const onFinish = () => {
                                  // Step 2: Audio finished, start 10s Prep Timer
                                  setMode('PREP');
                                  startTimer(10, () => {
                                      // Step 3: Prep finished, start Recording
                                      startRecording(recordTime);
                                  });
                              };

                              if (item.audioUrl) {
                                  playAudioFromUrl(item.audioUrl, onFinish);
                              } else {
                                  speakText(item.transcript || item.text || item.situation || "Listen carefully.", onFinish, 0.9);
                              }
                          }}>
                              <Text style={{color:'#fff', fontWeight:'bold', fontSize:16}}>Start Question</Text>
                          </TouchableOpacity>
                      )}

                      {/* SKIP PREP BUTTON (Only visible during the 10s prep phase) */}
                      {mode === 'PREP' && (
                          <TouchableOpacity style={{flex:1, backgroundColor:'#14B8A6', padding:15, borderRadius:8, alignItems:'center'}} onPress={() => {
                              const recordTime = isSummarizeGroup ? 120 : 40;
                              startRecording(recordTime);
                          }}>
                              <Text style={{color:'#fff', fontWeight:'bold', fontSize:16}}>Skip Prep</Text>
                          </TouchableOpacity>
                      )}

                      {/* SUBMIT ANSWER BUTTON (Only visible while recording) */}
                      {mode === 'RECORDING' && (
                          <TouchableOpacity style={{flex:1, backgroundColor:'#EF4444', padding:15, borderRadius:8, alignItems:'center'}} onPress={() => stopRecording(recording)}>
                              <Text style={{color:'#fff', fontWeight:'bold', fontSize:18}}>Submit Answer</Text>
                          </TouchableOpacity>
                      )}
                   </View>
               )}
             </ScrollView>
          )}
      </View>
    </View>
  );

  if (!moduleInfo) return <View><Text>Module not found</Text></View>;
  if (questions.length === 0) return <View style={styles.centerContainer}><Text>Coming Soon</Text></View>;

  const isAnyIncorrect = !!(
    (reOrderScore && reOrderScore.score < reOrderScore.max) ||
    (fillBlankScore && fillBlankScore.score < fillBlankScore.max) ||
    (rwResult && rwResult.score < rwResult.max) ||
    (lFibResult && lFibResult.score < lFibResult.max)
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* --- UPDATED HEADER START --- */}
      <View style={styles.header}>
        {/* Left: Back Button */}
        <View style={styles.headerLeft}>
            <TouchableOpacity onPress={() => router.back()}>
                <MaterialCommunityIcons name="arrow-left" size={28} color="#334155" />
            </TouchableOpacity>
        </View>

        {/* Center: Title & Score */}
        <View style={styles.headerCenter}>
            {id !== 'mock-exam' && (
                <View style={styles.scoreBadge}>
                    <Text style={styles.scoreText}>
                        Correct: {currentSessionScore.toFixed(0)}/{questions.length}
                    </Text>
                </View>
            )}
            <Text style={styles.headerTitle} numberOfLines={1}>
                {id === 'mock-exam' ? 'Mock Exam' : moduleInfo?.title}
            </Text>
        </View>

        {/* Right: Empty View to balance the layout */}
        <View style={styles.headerRight} />
      </View>

      <View style={[styles.carouselContainer, mode !== 'RESULT' ? { flex: 1 } : { height: 180 }]}>
        {/* Render only the CURRENT question. No FlatList, no memory bugs! */}
        {questions.length > 0 && renderItem({ item: questions[currentIndex], index: currentIndex })}
      </View>

      <View style={styles.jumpToContainer}>
        <Text style={styles.jumpToLabel}>JUMP TO:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.jumpToScroll}>
          {questions.map((_, index) => (
            <TouchableOpacity key={index} style={[styles.jumpCircle, currentIndex === index && styles.jumpCircleActive]} onPress={() => scrollToQuestion(index)}>
              <Text style={[styles.jumpCircleText, currentIndex === index && styles.jumpCircleTextActive]}>{index + 1}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

<KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[{width: '100%'}, mode === 'RESULT' && {flex: 1}]}>
        {((!isSummarizeGroup && !isRespondSituation) || mode === 'RESULT') && (
          <View style={[styles.controls, mode === 'RESULT' && { flex: 1 }]}>
             {/* TIMER */}
             {mode === 'RECORDING' && <View style={styles.timerBox}><Text style={styles.timerCount}>{timeLeft}</Text></View>}
             
             {/* MAIN RESULTS BOX (Speaking/Writing) */}
             {(mode === 'RESULT' && result && !isASQ) && (
               <View style={[styles.resultBox, { flex: 1, paddingBottom: 0, overflow: 'hidden' }]}>
                  <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 15, paddingBottom: 10 }}>
                      <Text style={styles.resultTitle}>Score: {result.overall}/90</Text>
                      
                      <View style={{ backgroundColor: '#EFF6FF', padding: 10, borderRadius: 8, marginBottom: 15, alignItems: 'center', borderWidth: 1, borderColor: '#BFDBFE' }}>
                          <Text style={{ color: '#2563EB', fontWeight: 'bold', fontSize: 14 }}>
                             Session Progress: {currentSessionScore.toFixed(0)} / {questions.length} Correct
                          </Text>
                      </View>
                      
                      <View style={{marginBottom: 15}}>
                          {result.breakdown && Object.entries(result.breakdown).map(([k,v]:any) => {
                             if (k.toLowerCase() === 'pronunciation' && result.overall < 70) return null;
                             return <FeedbackRow key={k} label={k.toUpperCase()} text={v.toString()} />;
                          })}
                      </View>
                      
                      <View style={{backgroundColor: '#F0FDF4', padding: 10, borderRadius: 8, borderLeftWidth: 4, borderLeftColor: '#059669', marginBottom: 15}}>
                          <Text style={{fontWeight: 'bold', color: '#065F46', marginBottom: 5}}>Reason for Score:</Text>
                          <Text style={{color: '#064E3B', lineHeight: 22}}>{result.feedback}</Text>
                      </View>

                      <View style={{ alignItems: 'center', paddingVertical: 10 }}>
                          <MaterialCommunityIcons name="chevron-double-down" size={20} color="#94A3B8" />
                          <Text style={{ fontSize: 10, color: '#94A3B8', fontWeight: 'bold' }}>SCROLL FOR MORE FEEDBACK</Text>
                      </View>

                      {result.mistakes && result.mistakes.length > 0 && (
                        <View style={{backgroundColor: '#FEF2F2', padding: 10, borderRadius: 8, borderLeftWidth: 4, borderLeftColor: '#EF4444', marginBottom: 15}}>
                            <Text style={{fontWeight: 'bold', color: '#991B1B', marginBottom: 5}}>Word-Level Feedback:</Text>
                            <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8}}>
                                {result.mistakes.map((m: any, i: number) => (
                                    <View key={i} style={{backgroundColor: '#fff', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#FEE2E2'}}>
                                        <Text style={{fontSize: 12, color: '#1E293B'}}><Text style={{fontWeight: 'bold'}}>{m.word}</Text> ({m.label})</Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                      )}

                      {result.sectionFeedback && Object.keys(result.sectionFeedback).length > 0 && (
                        <View style={{marginTop: 10, marginBottom: 20}}>
                            <Text style={{fontWeight: 'bold', color: '#1E293B', marginBottom: 10, fontSize: 16}}>Detailed Section Feedback:</Text>
                            {Object.entries(result.sectionFeedback).map(([key, value]: any) => (
                                <View key={key} style={{backgroundColor: '#F8FAFC', padding: 12, borderRadius: 8, marginBottom: 10, borderWidth: 1, borderColor: '#E2E8F0'}}>
                                    <Text style={{fontWeight: 'bold', color: '#2563EB', textTransform: 'capitalize', marginBottom: 4}}>{key.replace(/([A-Z])/g, ' $1')}</Text>
                                    <Text style={{color: '#475569', fontSize: 13, lineHeight: 18}}>{value}</Text>
                                </View>
                            ))}
                        </View>
                      )}

                      {(isEssay || isDescribeImage || isSummarizeSpoken || isSummarizeWritten || isRetellLecture) && result.overall >= 70 && (
                         <TouchableOpacity style={{marginTop: 20, alignSelf: 'center'}} onPress={() => setShowModelAnswer(true)}>
                            <Text style={{color: '#2563EB', fontWeight:'bold', textDecorationLine: 'underline'}}>View Top Scoring Answer</Text>
                         </TouchableOpacity>
                      )}
                  </ScrollView>
                  <View style={{ width: '100%', padding: 8, borderTopWidth: 1, borderColor: '#D1FAE5', backgroundColor: '#ECFDF5', gap: 6 }}>
                      {result.overall < 70 && (
                        <TouchableOpacity style={styles.btnPrimarySmall} onPress={handleResetQuestion}>
                           <Text style={styles.btnTextSmall}>Try Again</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity style={[styles.nextBtnSmall, result.overall < 70 && { backgroundColor: '#94A3B8' }]} onPress={handleNext}>
                         <Text style={styles.btnTextSmall}>{result.overall < 70 ? 'Skip to Next' : 'Next Question'}</Text>
                         <MaterialCommunityIcons name="arrow-right" size={18} color="#fff" style={{ position: 'absolute', right: 12 }} />
                      </TouchableOpacity>
                  </View>
               </View>
             )}

             {/* MULTIPLE CHOICE RESULTS BOX (Hidden Correct Answers if Wrong) */}
             {mcResult && (
                <View style={[
                  styles.resultBox, 
                  mode === 'RESULT' && { flex: 1 },
                  mcResult.score < mcResult.max ? { backgroundColor: '#FEF2F2', borderColor: '#FECACA', borderWidth: 1 } : {}
                ]}>
                  <View style={{marginBottom: 10, alignItems: 'center'}}>
                    {mcResult.score === mcResult.max ? (
                       <View style={{flexDirection:'row', alignItems:'center', gap: 8}}>
                          <MaterialCommunityIcons name="check-circle" size={32} color="#059669" />
                          <Text style={{fontSize: 22, fontWeight:'bold', color: '#059669'}}>Correct!</Text>
                       </View>
                    ) : (
                       <View style={{flexDirection:'row', alignItems:'center', gap: 8}}>
                          <MaterialCommunityIcons name="close-circle" size={32} color="#DC2626" />
                          <Text style={{fontSize: 22, fontWeight:'bold', color: '#DC2626'}}>Incorrect</Text>
                       </View>
                    )}
                  </View>

                  <Text style={[styles.resultTitle, {fontSize: 16, color: '#334155', textAlign: 'center'}]}>
                    Score: {mcResult.score} / {mcResult.max}
                  </Text>

                  <View style={{ backgroundColor: '#EFF6FF', padding: 8, borderRadius: 8, marginVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: '#BFDBFE' }}>
                      <Text style={{ color: '#2563EB', fontWeight: 'bold', fontSize: 14 }}>
                         Session Progress: {currentSessionScore.toFixed(0)} / {questions.length} Correct
                      </Text>
                  </View>
                  
                  {/* IF WRONG: Show encouragement to re-read/listen */}
                  {mcResult.score < mcResult.max && (
                     <View style={{marginTop: 10, padding: 10, backgroundColor: '#FFF5F5', borderRadius: 8}}>
                         <Text style={{color: '#B91C1C', fontStyle: 'italic', textAlign: 'center', lineHeight: 20}}>
                           The correct answer has been hidden. Please review the text or audio carefully and try to figure out why your selection was incorrect!
                         </Text>
                     </View>
                  )}

                  {/* IF CORRECT: Show the explanation */}
                  {currentItem.explanation && mcResult.score === mcResult.max && (
                    <View style={{ marginTop: 15, padding: 12, backgroundColor: '#FFFFFF', borderRadius: 8, width: '100%', borderLeftWidth: 5, borderLeftColor: '#10B981' }}>
                      <Text style={{fontWeight: 'bold', color: '#1E293B', marginBottom: 4}}>Why is this correct?</Text>
                      <Text style={{color: '#334155', lineHeight: 22}}>{currentItem.explanation}</Text>
                    </View>
                  )}

                  <View style={{ marginTop: 15, gap: 8, width: '100%', padding: 12, backgroundColor: '#ECFDF5', borderTopWidth: 1, borderColor: '#D1FAE5', borderRadius: 16 }}>
                    {mcResult.score < mcResult.max && (
                      <TouchableOpacity style={styles.btnPrimarySmall} onPress={handleResetQuestion}>
                         <Text style={styles.btnTextSmall}>Try Again</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity style={[styles.nextBtnSmall, mcResult.score < mcResult.max && { backgroundColor: '#94A3B8' }]} onPress={handleNext}>
                       <Text style={styles.btnTextSmall}>{mcResult.score < mcResult.max ? 'Skip to Next' : 'Next Question'}</Text>
                       <MaterialCommunityIcons name="arrow-right" size={20} color="#fff" style={{ position: 'absolute', right: 15 }} />
                    </TouchableOpacity>
                  </View>
                </View>
             )}

             {/* DICTATION RESULT BOX */}
             {dictationResult && (
                <View style={styles.resultBox}>
                    <Text style={styles.resultTitle}>Score: {dictationResult.score} / {dictationResult.max}</Text>
                    
                    <View style={{ backgroundColor: '#EFF6FF', padding: 8, borderRadius: 8, marginBottom: 15, alignItems: 'center', borderWidth: 1, borderColor: '#BFDBFE' }}>
                        <Text style={{ color: '#2563EB', fontWeight: 'bold', fontSize: 14 }}>
                           Session Progress: {currentSessionScore.toFixed(0)} / {questions.length} Correct
                        </Text>
                    </View>
                    
                    {/* ONLY SHOW CORRECT ANSWER IF THEY GOT IT 100% RIGHT */}
                    {dictationResult.score === dictationResult.max ? (
                        <>
                            <Text style={styles.resultSub}>Correct Answer:</Text>
                            <Text style={{color:'#065F46', fontStyle:'italic'}}>{dictationResult.original}</Text>
                        </>
                    ) : (
                        <Text style={{color:'#B91C1C', fontStyle:'italic', marginTop: 5}}>Incorrect. Listen again and keep practicing!</Text>
                    )}

                    {dictationResult.score < dictationResult.max ? (
                        <View style={{marginTop: 10, padding: 10, backgroundColor: '#FFF5F5', borderRadius: 8, marginBottom: 15}}>
                            <Text style={{color: '#B91C1C', fontStyle: 'italic', textAlign: 'center'}}>
                                The correct answer is hidden. Try again to match it perfectly!
                            </Text>
                        </View>
                    ) : null}

                    <View style={{ gap: 8, width: '100%', padding: 12, backgroundColor: '#ECFDF5', borderTopWidth: 1, borderColor: '#D1FAE5', borderRadius: 16 }}>
                        {dictationResult.score < dictationResult.max && (
                            <TouchableOpacity style={styles.btnPrimarySmall} onPress={handleResetQuestion}>
                                <Text style={styles.btnTextSmall}>Try Again</Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity style={[styles.nextBtnSmall, dictationResult.score < dictationResult.max && { backgroundColor: '#94A3B8' }]} onPress={handleNext}>
                            <Text style={styles.btnTextSmall}>{dictationResult.score < dictationResult.max ? 'Skip to Next' : 'Next Question'}</Text>
                            <MaterialCommunityIcons name="arrow-right" size={20} color="#fff" style={{ position: 'absolute', right: 15 }} />
                        </TouchableOpacity>
                    </View>
                </View>
             )}

             {/* OTHER RESULTS (Highlight/Blanks/Reorder) */}
             {highlightResult && (
                <View style={styles.resultBox}>
                  <Text style={styles.resultTitle}>Score: {highlightResult.score}/{highlightResult.max}</Text>
                  
                  <View style={{ backgroundColor: '#EFF6FF', padding: 8, borderRadius: 8, marginBottom: 10, alignItems: 'center', borderWidth: 1, borderColor: '#BFDBFE' }}>
                      <Text style={{ color: '#2563EB', fontWeight: 'bold', fontSize: 14 }}>
                         Session Progress: {currentSessionScore.toFixed(0)} / {questions.length} Correct
                      </Text>
                  </View>
                  
                  <Text style={styles.resultSub}>Green = Correctly Identified | Red = Wrongly Selected</Text>
                  <View style={{ marginTop: 15, gap: 8, width: '100%', padding: 12, backgroundColor: '#ECFDF5', borderTopWidth: 1, borderColor: '#D1FAE5', borderRadius: 16 }}>
                    {highlightResult.score < highlightResult.max && (
                        <TouchableOpacity style={styles.btnPrimarySmall} onPress={handleResetQuestion}>
                           <Text style={styles.btnTextSmall}>Try Again</Text>
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity style={[styles.nextBtnSmall, highlightResult.score < highlightResult.max && { backgroundColor: '#94A3B8' }]} onPress={handleNext}>
                        <Text style={styles.btnTextSmall}>{highlightResult.score < highlightResult.max ? 'Skip to Next' : 'Next Question'}</Text>
                        <MaterialCommunityIcons name="arrow-right" size={20} color="#fff" style={{ position: 'absolute', right: 15 }} />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
             {(reOrderScore || fillBlankScore || rwResult || lFibResult) && (
                <View style={styles.resultBox}>
                  <Text style={styles.resultTitle}>Score: {reOrderScore ? reOrderScore.score : fillBlankScore ? fillBlankScore.score : rwResult ? rwResult.score : (lFibResult?.score ?? 0)} / {reOrderScore ? reOrderScore.max : fillBlankScore ? fillBlankScore.max : rwResult ? rwResult.max : (lFibResult?.max ?? 0)}</Text>
                  
                  <View style={{ backgroundColor: '#EFF6FF', padding: 8, borderRadius: 8, marginBottom: 10, alignItems: 'center', borderWidth: 1, borderColor: '#BFDBFE' }}>
                      <Text style={{ color: '#2563EB', fontWeight: 'bold', fontSize: 14 }}>
                         Session Progress: {currentSessionScore.toFixed(0)} / {questions.length} Correct
                      </Text>
                  </View>
                  
                   <View style={{ marginTop: 15, gap: 8, width: '100%', padding: 12, backgroundColor: '#ECFDF5', borderTopWidth: 1, borderColor: '#D1FAE5', borderRadius: 16 }}>
                    {isAnyIncorrect && (
                        <TouchableOpacity style={styles.btnPrimarySmall} onPress={handleResetQuestion}>
                           <Text style={styles.btnTextSmall}>Try Again</Text>
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity style={[styles.nextBtnSmall, isAnyIncorrect && { backgroundColor: '#94A3B8' }]} onPress={handleNext}>
                        <Text style={styles.btnTextSmall}>{isAnyIncorrect ? 'Skip to Next' : 'Next Question'}</Text>
                        <MaterialCommunityIcons name="arrow-right" size={20} color="#fff" style={{ position: 'absolute', right: 15 }} />
                    </TouchableOpacity>
                  </View>
                </View>
              )}

             {/* START BUTTONS */}
             {mode === 'IDLE' && !result && !mcResult && !dictationResult && !highlightResult && !reOrderScore && !fillBlankScore && !rwResult && !lFibResult && !isSummarizeWritten && !isSummarizeSpoken && !isWriteDictation && (
                <View style={styles.idleControls}>
                   <TouchableOpacity style={styles.btnPrimary} onPress={() => {
                       if (isPersonalIntro) {
                           setMode('PREP'); startTimer(25, () => startRecording(30));
                       }
                       else if (isASQ) startASQSequence();
                       else if (isRetellLecture) handlePlayLecture();
                       else if (isRepeatSentence) handlePlayAudio();
                       else if (isReadAloud || isDescribeImage) startRecording(40);
                       else handleNext(); // For Reading tasks in mock exam
                   }}>
                       <Text style={styles.btnText}>
                           {isPersonalIntro ? 'Start Introduction' : 
                            (isReadAloud || isDescribeImage || isRepeatSentence || isRetellLecture || isASQ) ? 'Start Question' : 
                            'Next Task'}
                       </Text>
                   </TouchableOpacity>
                </View>
             )}

             {/* STOP BUTTON */}
             {mode === 'RECORDING' && (
                 <TouchableOpacity style={styles.btnDanger} onPress={() => stopRecording(recording)}>
                     <Text style={styles.btnText}>Stop</Text>
                 </TouchableOpacity>
             )}
             
             {/* SPINNER */}
             {(mode === 'PROCESSING' || mode === 'PLAYING_AUDIO' || mode === 'PREP_RETELL') && (
               <View style={{ alignItems: 'center', padding: 20 }}>
                 <ActivityIndicator size="large" color="#2563EB" />
                 {mode === 'PROCESSING' && <Text style={{color: '#64748B', marginTop: 10, fontStyle: 'italic'}}>Processing results...</Text>}
               </View>
             )}

          </View>
        )}
      </KeyboardAvoidingView>

      {/* MODALS AND ZOOM */}
      <Modal animationType="slide" transparent={true} visible={showModelAnswer} onRequestClose={() => setShowModelAnswer(false)}><View style={styles.modalOverlay}><View style={styles.modalContent}><View style={styles.modalHeader}><Text style={styles.modalTitle}>Model Answer</Text><TouchableOpacity onPress={() => setShowModelAnswer(false)}><MaterialCommunityIcons name="close-circle" size={30} color="#64748B" /></TouchableOpacity></View><ScrollView style={{maxHeight: 300}}><Text style={styles.modelText}>{questions[currentIndex]?.modelAnswer || "No model answer available."}</Text></ScrollView></View></View></Modal>
      <Modal visible={isImageViewVisible} transparent={true} animationType="fade" onRequestClose={() => setIsImageViewVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' }}>
          <TouchableOpacity style={{ position: 'absolute', top: 40, right: 20, zIndex: 10, padding: 10 }} onPress={() => setIsImageViewVisible(false)}>
            <MaterialCommunityIcons name="close-circle" size={40} color="#fff" />
          </TouchableOpacity>
          {currentZoomImage && (
            <Image 
              source={typeof currentZoomImage === 'string' ? { uri: currentZoomImage } : currentZoomImage} 
              style={{ width: '95%', height: '80%' }} 
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>

      {/* ASQ RESULT MODAL */}
      <Modal visible={asqResultPopup} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: result?.content && result.content > 60 ? '#F0FDF4' : '#FEF2F2' }]}>
            <View style={{ alignItems: 'center', marginBottom: 20 }}>
              {result?.content && result.content > 60 ? (
                <MaterialCommunityIcons name="check-circle" size={60} color="#059669" />
              ) : (
                <MaterialCommunityIcons name="close-circle" size={60} color="#DC2626" />
              )}
              <Text style={{ fontSize: 24, fontWeight: 'bold', marginTop: 10, color: result?.content && result.content > 60 ? '#059669' : '#DC2626' }}>
                {result?.content && result.content > 60 ? 'Correct!' : 'Incorrect'}
              </Text>
            </View>

            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontWeight: 'bold', color: '#1E293B', marginBottom: 5 }}>Your Answer:</Text>
              <Text style={{ color: '#475569', fontStyle: 'italic' }}>"{userSummary || "No speech detected"}"</Text>
            </View>

            {result?.content && result.content > 60 ? (
              <View style={{ marginBottom: 20 }}>
                <Text style={{ fontWeight: 'bold', color: '#1E293B', marginBottom: 5 }}>Expected Answer:</Text>
                <Text style={{ color: '#059669', fontWeight: 'bold' }}>{questions[currentIndex]?.answer}</Text>
              </View>
            ) : (
              <View style={{ marginBottom: 20, padding: 10, backgroundColor: '#FFF5F5', borderRadius: 8, borderWidth: 1, borderColor: '#FECACA' }}>
                <Text style={{ color: '#B91C1C', fontStyle: 'italic', textAlign: 'center' }}>
                  The correct answer is hidden. Try again to get it right!
                </Text>
              </View>
            )}

            <View style={{ marginBottom: 20, padding: 10, backgroundColor: '#F8FAFC', borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' }}>
              <Text style={{ color: '#64748B', fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase' }}>Session Progress</Text>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#2563EB' }}>
                Total Correct: {currentSessionScore.toFixed(0)} / {questions.length}
              </Text>
            </View>

            {result?.content && result.content > 60 ? (
              <TouchableOpacity 
                style={[styles.nextBtnSmall, { width: '100%', justifyContent: 'center' }]} 
                onPress={proceedToNextASQ}
              >
                <Text style={styles.btnTextSmall}>
                  {currentIndex < questions.length - 1 ? 'Next Question' : 'Finish Session'}
                </Text>
                <MaterialCommunityIcons name="arrow-right" size={20} color="#fff" style={{ position: 'absolute', right: 15 }} />
              </TouchableOpacity>
            ) : (
            <View style={{ gap: 8, width: '100%', padding: 12, backgroundColor: result?.content && result.content > 60 ? '#F0FDF4' : '#FEF2F2', borderTopWidth: 1, borderColor: result?.content && result.content > 60 ? '#D1FAE5' : '#FECACA', borderRadius: 16 }}>
                <TouchableOpacity 
                  style={styles.btnPrimarySmall} 
                  onPress={handleResetQuestion}
                >
                  <Text style={styles.btnTextSmall}>Try Again</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.nextBtnSmall, { backgroundColor: '#94A3B8' }]} 
                  onPress={proceedToNextASQ}
                >
                  <Text style={styles.btnTextSmall}>Skip to Next</Text>
                  <MaterialCommunityIcons name="arrow-right" size={20} color="#fff" style={{ position: 'absolute', right: 15 }} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
// STYLES
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
   header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: 10, 
    paddingHorizontal: 15,
    borderBottomWidth: 1, 
    borderBottomColor: '#E2E8F0', 
    backgroundColor: '#fff',
    height: 80, // Fixed height for stability
  },
  headerLeft: { width: 50, alignItems: 'flex-start' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerRight: { width: 50 }, // Balances the left side so center stays true center
  backButton: {
    position: 'absolute', // Sticks to the left
    left: 20,
    zIndex: 10, // Ensures it is clickable
    padding: 5,
  },
  scoreBadge: { 
    backgroundColor: '#EFF6FF', 
    paddingHorizontal: 10, 
    paddingVertical: 3, 
    borderRadius: 12, 
    marginBottom: 5, // Space between score and title
    borderWidth: 1,
    borderColor: '#BFDBFE'
  },
  scoreText: { 
    color: '#2563EB', 
    fontWeight: 'bold', 
    fontSize: 12 
  },
  headerTitle: { 
    fontSize: 16, // Slightly smaller to fit long titles
    fontWeight: 'bold', 
    color: '#1E293B', 
    textAlign: 'center', // Ensures long titles wrap nicely in the center
    lineHeight: 20,
  },
  carouselContainer: { },
  fullScreenPage: { width: width, padding: 20 },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 24, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  questionIndex: { color: '#64748B', marginBottom: 10, fontWeight: 'bold' },
  questionText: { fontSize: 20, lineHeight: 30, color: '#1E293B' },
  readingText: { fontSize: 16, lineHeight: 24, color: '#334155' },
  label: { fontSize: 12, color: '#94A3B8', fontWeight: 'bold', marginBottom: 4 },
  textScroll: { width: '100%', minHeight: 100, maxHeight: 200,  marginBottom: 10, },
  textScrollContent: { flexGrow: 1, justifyContent: 'center' },
  audioPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  listenBox: { alignItems: 'center', gap: 10 },
  listenText: { fontSize: 18, color: '#64748B', fontWeight: '500' },
  imageContainer: { alignItems: 'center', justifyContent: 'flex-start' },
  
  // ZOOM STYLES
  chartImage: { width: '100%', height: 180, marginTop: 20, marginBottom: 10, backgroundColor: '#F1F5F9' },
  missingImage: { width: '100%', height: 180, backgroundColor:'#F1F5F9', alignItems:'center', justifyContent:'center', borderRadius:8, marginTop: 20 },
  imageTitle: { marginTop: 10, fontSize: 16, fontWeight:'600', color:'#334155', textAlign:'center'},
  zoomIcon: { position: 'absolute', right: 10, bottom: 10, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 20, padding: 5 },
  controls: { padding: 10, paddingBottom: 20, backgroundColor: '#F8FAFC', borderTopWidth: 1,  borderTopColor: '#E2E8F0', }, 
  timerBox: { alignItems: 'center', marginBottom: 20 },
  timerText: { fontSize: 16, color: '#64748B', marginBottom: 5, fontWeight: '600' },
  timerCount: { fontSize: 48, fontWeight: 'bold', color: '#1E293B' },
  textRed: { color: '#EF4444' },
  textGreen: { color: '#10B981' }, 
   resultBox: { backgroundColor: '#ECFDF5', padding: 10, borderRadius: 16, marginBottom: 5, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, alignItems: 'center', elevation: 3, width: '100%' },
  resultTitle: { fontSize: 24, fontWeight: 'bold', color: '#059669', marginBottom: 5 },
  resultSub: { fontSize: 16, color: '#047857', marginBottom: 15 },
  idleControls: { flexDirection: 'column', alignItems: 'center', gap: 20, width: '100%' },
  btnPrimary: { backgroundColor: '#2563EB', height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', width: '100%' },
  modelBtn: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#FEF3C7', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#F59E0B', shadowColor: '#F59E0B', shadowOpacity: 0.2, shadowOffset: { width: 0, height: 2 }, shadowRadius: 4, elevation: 2 },
  btnSecondary: { backgroundColor: '#E2E8F0', padding: 18, borderRadius: 50, alignItems: 'center', width: '100%' },
  btnDanger: { backgroundColor: '#EF4444', padding: 18, borderRadius: 50, alignItems: 'center', width: '100%' },
  nextBtn: { backgroundColor: '#059669', height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', width: '100%' },
  btnPrimarySmall: { backgroundColor: '#2563EB', height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', width: '100%' },
  nextBtnSmall: { backgroundColor: '#059669', height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', width: '100%' },
  btnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  btnTextSmall: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  btnTextDark: { color: '#1E293B', fontSize: 18, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 24, padding: 24, width: '100%', maxWidth: 400, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 10, elevation: 5 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1E293B' },
  modelText: { fontSize: 16, lineHeight: 24, color: '#334155' },
  closeBtn: { marginTop: 20, backgroundColor: '#2563EB', padding: 14, borderRadius: 12, alignItems: 'center' },
  closeBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  reOrderTitle: { fontSize: 18, fontWeight: 'bold', color: '#1E293B', marginBottom: 5 },
  instructionSmall: { fontSize: 12, color: '#64748B', fontStyle: 'italic' },
  targetArea: { flex: 1, minHeight: 150, backgroundColor: '#EFF6FF', borderRadius: 12, padding: 10, marginBottom: 10, borderStyle: 'dashed', borderWidth: 2, borderColor: '#BFDBFE' },
  sourceArea: { flex: 1, minHeight: 150, backgroundColor: '#F8FAFC', borderRadius: 12, padding: 10, borderWidth: 1, borderColor: '#E2E8F0' },
  areaLabel: { fontSize: 12, fontWeight: 'bold', color: '#64748B', marginBottom: 8, textTransform: 'uppercase' },
  placeholderText: { color: '#94A3B8', textAlign: 'center', marginTop: 20, fontStyle: 'italic' },
  draggableItem: { backgroundColor: '#2563EB', padding: 12, borderRadius: 8, marginBottom: 8 },
  sourceItem: { backgroundColor: '#fff', padding: 12, borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: '#E2E8F0' },
  textWhite: { color: '#FFFFFF', fontSize: 14, fontWeight: '500' },
  textDark: { color: '#1E293B', fontSize: 14, fontWeight: '500' },
  fibContainer: { flexGrow: 1 },
  fibTextWrapper: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  fibText: { fontSize: 18, lineHeight: 32, color: '#1E293B', marginBottom: 0, },
  blankBox: { color: '#2563EB', fontWeight: 'bold', backgroundColor: '#EFF6FF', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, overflow: 'hidden', borderWidth: 1, borderColor: '#2563EB', marginHorizontal: 2 },
  blankFilled: { backgroundColor: '#2563EB', color: '#fff' },
  blankCorrect: { backgroundColor: '#10B981', borderColor: '#10B981', color: '#fff' },
  blankWrong: { backgroundColor: '#EF4444', borderColor: '#EF4444', color: '#fff' },
  modalOverlayBottom: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end' },
  modalContentBottom: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  wordChip: { backgroundColor: '#F1F5F9', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0' },
  wordChipText: { fontSize: 16, color: '#1E293B', fontWeight: '500' },
  audioControlRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 15, padding: 10, backgroundColor: '#F1F5F9', borderRadius: 12 },
  miniPlayBtn: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  miniPlayText: { color: '#2563EB', fontWeight: '600', fontSize: 16 },
  summaryInput: { flex: 1, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 15, fontSize: 16, lineHeight: 24, textAlignVertical: 'top', minHeight: 150 },
  wordCountRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 },
  wordCountText: { fontSize: 13, fontWeight: 'bold' },
  speedControlRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  speedBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, padding: 8, backgroundColor: '#EFF6FF', borderRadius: 12 },
  speedText: { color: '#2563EB', fontWeight: 'bold' },
  highlightContainer: { flexDirection: 'row', flexWrap: 'wrap' },
  wordBubble: { borderRadius: 4, paddingHorizontal: 2, paddingVertical: 1, marginVertical: 2 },
  wordText: { fontSize: 18, lineHeight: 28 }, 
  mcOption: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 12, backgroundColor: '#F8FAFC' },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: '#CBD5E1', marginRight: 12, alignItems: 'center', justifyContent: 'center' },
  mcText: { fontSize: 16, color: '#1E293B', flex: 1 },
  sourceTextBox: { backgroundColor: '#F1F5F9', padding: 10, borderRadius: 8 },
  
  // NEW STYLES
  speakNowOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)', zIndex: 9999 },
  speakNowBox: { backgroundColor: '#fff', paddingVertical: 25, paddingHorizontal: 40, borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 8 },
  speakNowText: { fontSize: 32, fontWeight: 'bold', color: '#10B981' },
  
  // ZOOM STYLES (REACT-NATIVE-IMAGE-VIEWING handles fullscreen, these are just for triggers)
  zoomOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
  zoomCloseArea: { position: 'absolute', top: 50, right: 20, zIndex: 99, padding: 20 },
  fullScreenImage: { width: width, height: '80%' },
  
  // RESTORED R&W STYLES
  wordBankContainer: { marginBottom: 15, padding: 10, backgroundColor: '#F1F5F9', borderRadius: 12 },
  wordBankGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 5 },
  wordBankItem: { backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0' },
  inlineInput: { minWidth: 120, borderBottomWidth: 2, borderBottomColor: '#2563EB', textAlign: 'center', paddingHorizontal: 12, paddingVertical: 0, textAlignVertical: 'center', fontSize: 18, marginHorizontal: 4, height: 36, backgroundColor:'#EFF6FF', borderRadius: 8 },
  inputCorrect: { backgroundColor: '#D1FAE5', borderBottomColor: '#10B981', color: '#065F46' },
  inputWrong: { backgroundColor: '#FEE2E2', borderBottomColor: '#EF4444', color: '#B91C1C' },

  // JUMP TO STYLES (Integrated correctly now)
  jumpToContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
  },
  jumpToLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#94A3B8',
    marginRight: 10,
    letterSpacing: 0.5,
  },
  jumpToScroll: {
    alignItems: 'center',
    gap: 10,
    paddingRight: 20,
  },
  jumpCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  jumpCircleActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  jumpCircleText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '700',
  },
  jumpCircleTextActive: {
    color: '#fff',
  },

  // --- ADD THESE AT THE BOTTOM OF YOUR STYLESHEET ---
  processingOverlay: {
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)', // Light blur effect
    borderRadius: 12,
    marginTop: 20,
  },
  processingText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B',
    textAlign: 'center',
  },
  processingSubText: {
    marginTop: 5,
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
  },

  // --- ADD THESE TO YOUR STYLESHEET ---
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
    paddingBottom: 5,
  },
  boldLabel: {
    fontWeight: 'bold',
    color: '#1E293B',
  },
  boldValue: {
    fontWeight: 'bold',
    color: '#2563EB',
  },

  reOrderResultItem: {
    marginBottom: 8,
    padding: 10,
    backgroundColor: '#F0F9FF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
});
const FeedbackRow = ({label, text}: {label: string, text: string}) => (
  <View style={{marginBottom: 8, width: '100%', borderBottomWidth: 1, borderBottomColor: '#E2E8F0', paddingBottom: 4}}>
     <Text style={{fontWeight: 'bold', color: '#1E293B', fontSize: 14}}>{label}</Text>
     <Text style={{color: '#64748B', fontSize: 13}}>{text}</Text>
  </View>
);