import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Alert, ScrollView, Animated } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { db, auth, ensureAuth } from '@/services/firebase';
import { collection, doc, setDoc, onSnapshot, query, where, orderBy, limit, deleteDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { networkService } from '@/services/networkService';
import { useTheme } from '@/context/ThemeContext';
import { REPEAT_SENTENCE_QUESTIONS } from '@/constants/repeatSentenceData';
import { FILL_BLANKS_QUESTIONS } from '@/constants/fillBlanksData';
import { Audio } from 'expo-av';
import { synthesizeSpeech } from '@/services/geminiService';

interface SprintQuestion {
  type: string;
  id: string;
}

interface Sprint {
  id: string;
  hostId: string;
  hostName: string;
  questionType?: string;
  questionId?: string;
  questions?: SprintQuestion[];
  currentRound?: number;
  participantCount?: number;
  status: 'waiting' | 'active' | 'finished';
  startTime?: number;
  duration?: number;
  ssid: string;
}

interface ParticipantResult {
  userId: string;
  userName: string;
  score: number;
  timeTaken: number;
  completedRounds?: number;
}

export const LiveSprint = () => {
  const { colors, isDark } = useTheme();
  const [activeSprint, setActiveSprint] = useState<Sprint | null>(null);
  const [ssid, setSsid] = useState<string | null>(null);
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showGame, setShowGame] = useState(false);
  const [results, setResults] = useState<ParticipantResult[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [submittedRound, setSubmittedRound] = useState(-1);
  const [myTotalScore, setMyTotalScore] = useState(0);
  const [myTotalTime, setMyTotalTime] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [selectedSprintAnswers, setSelectedSprintAnswers] = useState<string[]>([]);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSprintId = useRef<string | null>(null);
  const [currentUid, setCurrentUid] = useState<string | null>(auth.currentUser?.uid || null);

  useEffect(() => {
     const unsubscribeAuth = auth.onAuthStateChanged((user: any) => {
         setCurrentUid(user?.uid || null);
     });
     return () => unsubscribeAuth();
  }, []);

  const currentRound = activeSprint?.currentRound || 0;
  const hasSubmitted = submittedRound === currentRound;

  // Clear tracking states on new sprint
  useEffect(() => {
     if (activeSprint?.id !== lastSprintId.current) {
        setMyTotalScore(0);
        setMyTotalTime(0);
        setSubmittedRound(-1);
        lastSprintId.current = activeSprint?.id || null;
     }
  }, [activeSprint?.id]);

  const getQuestion = (type: string, id: string) => {
    const list = (type === 'repeat-sentence' ? REPEAT_SENTENCE_QUESTIONS : FILL_BLANKS_QUESTIONS) as any[];
    return list.find(q => String(q.id) === id);
  };

  useEffect(() => {
    if (activeSprint) {
        let type = activeSprint.questionType;
        let id = activeSprint.questionId;
        
        if (activeSprint.questions && activeSprint.questions.length > 0) {
            const qData = activeSprint.questions[activeSprint.currentRound || 0];
            if (qData) {
               type = qData.type;
               id = qData.id;
            }
        }
        
        if (type && id) {
             setCurrentQuestion(getQuestion(type, id));
        } else {
             setCurrentQuestion(null);
        }
    } else {
        setCurrentQuestion(null);
    }
  }, [activeSprint?.questionId, activeSprint?.questions, activeSprint?.currentRound]);

  // Clear selections when round changes
  useEffect(() => {
      setSelectedSprintAnswers([]);
  }, [activeSprint?.currentRound]);

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    const currentSsid = await networkService.getCurrentSSID();
    setSsid(currentSsid);
    
    // In a real app we'd get this from a profile doc or AsyncStorage
    // For now, let's assume it's in auth or we fetch it
    setUserName(auth.currentUser?.displayName || 'Student');

    if (currentSsid) {
      // Create a deterministic document ID for this network so ghost sprints are always overwritten
      const safeSsidId = currentSsid.replace(/[^a-zA-Z0-9]/g, '_');
      const sprintDocId = `sprint_${safeSsidId}`;

      const unsubscribe = onSnapshot(doc(db, 'sprints', sprintDocId), (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as Sprint;
          if (['waiting', 'active', 'finished'].includes(data.status)) {
              setActiveSprint({ ...data, id: docSnap.id });
              
              if (data.status === 'active' && data.startTime) {
                  const now = Date.now();
                  const elapsed = (now - data.startTime) / 1000;
                  const remaining = Math.max(0, (data.duration || 30) - elapsed);
                  setTimeLeft(Math.floor(remaining));
              } else {
                  setShowGame(false);
              }
          } else {
              setActiveSprint(null);
              setShowGame(false);
          }
        } else {
          setActiveSprint(null);
          setShowGame(false);
        }
      });

      return () => unsubscribe();
    }
  };

  // Listen for results of active sprint
  useEffect(() => {
    if (activeSprint?.id) {
      const q = query(collection(db, `sprints/${activeSprint.id}/results`), orderBy('score', 'desc'), orderBy('timeTaken', 'asc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const res = snapshot.docs.map(d => d.data() as ParticipantResult);
        setResults(res);
      });
      return () => unsubscribe();
    } else {
      setResults([]);
    }
  }, [activeSprint?.id]);

  useEffect(() => {
    // Timer MUST keep ticking down globally for the host so zero-triggers fire,
    // regardless of whether they submitted their answer or not.
    if (timeLeft > 0 && showGame) {
      timerRef.current = setInterval(() => {
        setTimeLeft(t => {
            if (t <= 1) {
                if (timerRef.current) clearInterval(timerRef.current);
                handleAutoSubmit();
                return 0;
            }
            return t - 1;
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timeLeft, showGame]);

  // Host auto-advance logic
  useEffect(() => {
      const isHostOrAdmin = activeSprint?.hostId === currentUid || auth.currentUser?.email === 'projectgazzy@gmail.com';
      if (!activeSprint || activeSprint.status !== 'active' || !isHostOrAdmin) return;

      const numTotalQuestions = activeSprint.questions?.length || 1;
      const expectedParticipants = activeSprint.participantCount || 0;
      
      let allAnswered = false;
      if (currentRound > 0 && expectedParticipants > 0) {
         const answeredCount = results.filter(r => (r.completedRounds || 0) > currentRound).length;
         if (answeredCount >= expectedParticipants) {
             allAnswered = true;
         }
      }

      if (timeLeft <= 0 || allAnswered) {
          const nextRound = currentRound + 1;
          
          if (nextRound >= numTotalQuestions) {
              setDoc(doc(db, 'sprints', activeSprint.id), { status: 'finished' }, { merge: true });
          } else {
              const updates: any = { currentRound: nextRound, startTime: Date.now() };
              if (currentRound === 0) {
                  updates.participantCount = Math.max(1, results.length);
              }
              // Small delay to ensure any final local logic processes
              setTimeout(() => {
                  setDoc(doc(db, 'sprints', activeSprint.id), updates, { merge: true });
              }, 1000);
          }
      }
  }, [timeLeft, results.length, activeSprint?.currentRound, activeSprint?.status]);

  const handleAutoSubmit = () => {
    if (!hasSubmitted) {
        if (activeSprint?.questionType === 'fill-blanks' && currentQuestion) {
            // Calculate partial score for what they managed to fill
            let correctCount = 0;
            selectedSprintAnswers.forEach((ans, idx) => {
                if (ans === currentQuestion.correctAnswers[idx]) correctCount++;
            });
            const finalScore = Math.round((correctCount / currentQuestion.correctAnswers.length) * 100);
            submitResult(finalScore, 30);
        } else {
            submitResult(0, 30); // Failed to answer in time
        }
    }
  };

  const startSprint = async () => {
    if (!ssid) {
      Alert.alert("Network Error", "You must be connected to Wi-Fi to host a live session.");
      return;
    }
    setLoading(true);
    setSubmittedRound(-1);
    setMyTotalScore(0);
    setMyTotalTime(0);
    setSelectedSprintAnswers([]);
    
    try {
      await ensureAuth();
      
      const selectedQuestions: SprintQuestion[] = [];
      for(let i = 0; i < 5; i++) {
         const isRS = Math.random() > 0.5;
         const pool = isRS ? REPEAT_SENTENCE_QUESTIONS : FILL_BLANKS_QUESTIONS;
         const question = pool[Math.floor(Math.random() * pool.length)] as any;
         selectedQuestions.push({ type: isRS ? 'repeat-sentence' : 'fill-blanks', id: String(question.id) });
      }
      
      const safeSsidId = ssid.replace(/[^a-zA-Z0-9]/g, '_');
      const sprintId = `sprint_${safeSsidId}`;
      
      await setDoc(doc(db, 'sprints', sprintId), {
        hostId: auth.currentUser?.uid,
        hostName: userName,
        questions: selectedQuestions,
        currentRound: 0,
        participantCount: 0,
        status: 'active',
        startTime: Date.now(),
        duration: 30,
        ssid: ssid
      });
      // Force loading check bypass just in case async takes too long
      setLoading(false);
      setShowGame(true); // Open the UI immediately for the host
    } catch (e: any) {
      console.error("Sprint Creation Error:", e);
      Alert.alert("Execution Error", e?.message || "Could not start sprint. Check logs.");
      setLoading(false);
    }
  };

  const submitResult = async (roundScore: number, roundTimeSpent: number) => {
    if (!activeSprint || hasSubmitted) return;
    
    setSubmittedRound(currentRound);
    
    const newScore = myTotalScore + roundScore;
    const newTime = myTotalTime + roundTimeSpent;
    
    setMyTotalScore(newScore);
    setMyTotalTime(newTime);
    
    try {
      await setDoc(doc(db, `sprints/${activeSprint.id}/results`, auth.currentUser?.uid || 'anon'), {
        userId: auth.currentUser?.uid,
        userName: userName,
        score: newScore,
        timeTaken: newTime,
        completedRounds: currentRound + 1,
        submittedAt: Date.now()
      }, { merge: true });
    } catch (e) {
      console.log(e);
    }
  };

  const endSprint = async () => {
      if (!activeSprint) return;
      if (activeSprint.hostId !== auth.currentUser?.uid && auth.currentUser?.email !== 'projectgazzy@gmail.com') return;
      await setDoc(doc(db, 'sprints', activeSprint.id), { status: 'finished' }, { merge: true });
  };

  const clearSprint = async () => {
      if (!activeSprint) return;
      
      const isHostOrAdmin = activeSprint.hostId === currentUid || auth.currentUser?.email === 'projectgazzy@gmail.com';
      
      if (!isHostOrAdmin) {
          // If a student clicks it, just wipe it locally so they aren't stuck staring at it forever
          setActiveSprint(null);
          return;
      }
      
      Alert.alert("Clear Table", "Are you sure you want to clear the board and delete this sprint session?", [
          { text: "Cancel", style: "cancel" },
          { text: "Clear", style: "destructive", onPress: async () => {
              try {
                  await deleteDoc(doc(db, 'sprints', activeSprint.id));
              } catch (e) {
                  console.error(e);
                  Alert.alert("Error", "Could not clear the board. Removing from local view instead.");
                  setActiveSprint(null); // Fallback to local clear if backend fails
              }
          }}
      ]);
  };

  const styles = StyleSheet.create({
    container: {
      padding: 16,
      backgroundColor: isDark ? colors.border + '20' : '#F8FAFC',
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      marginVertical: 10
    },
    title: { fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 8 },
    desc: { fontSize: 14, color: colors.subtext, marginBottom: 16 },
    hostBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
      padding: 12,
      borderRadius: 12,
      gap: 8
    },
    hostBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
    
    activeSprintBox: {
        backgroundColor: colors.primary + '10',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.primary + '30',
    },
    hostLabel: { fontSize: 12, color: colors.primary, fontWeight: 'bold', marginBottom: 4 },
    hostName: { fontSize: 16, fontWeight: 'bold', color: colors.text },
    
    modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    gameCard: { width: '100%', backgroundColor: colors.surface, borderRadius: 24, padding: 24, alignItems: 'center' },
    timerBox: { width: 60, height: 60, borderRadius: 30, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
    timerText: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
    questionTitle: { fontSize: 20, fontWeight: 'bold', color: colors.text, textAlign: 'center', marginBottom: 12 },
    questionDesc: { fontSize: 16, color: colors.subtext, textAlign: 'center', marginBottom: 30 },
    
    optionBtn: { width: '100%', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: colors.border, marginBottom: 12, backgroundColor: colors.background },
    optionText: { fontSize: 16, color: colors.text, textAlign: 'center' },
    
    leaderboardOverlay: { width: '100%', marginTop: 20 },
    lbRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
    lbName: { color: colors.text, fontWeight: '600' },
    lbScore: { color: colors.primary, fontWeight: 'bold' }
  });

  return (
    <View style={styles.container}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
        <MaterialCommunityIcons name="lightning-bolt" size={24} color="#F59E0B" />
        <Text style={styles.title}>Live Classroom Sprint</Text>
      </View>
      
      {!activeSprint ? (
        <>
          <Text style={styles.desc}>Host a 30-second live competition for everyone on "{ssid || 'this network'}"</Text>
          <TouchableOpacity style={styles.hostBtn} onPress={startSprint} disabled={loading}>
            <MaterialCommunityIcons name="broadcast" size={20} color="#fff" />
            <Text style={styles.hostBtnText}>{loading ? 'Initializing...' : 'Host Live Sprint'}</Text>
          </TouchableOpacity>
        </>
      ) : (
        <View style={styles.activeSprintBox}>
          <Text style={[styles.hostLabel, (activeSprint.status === 'finished' || timeLeft <= 0) && { color: '#EF4444' }]}>
            {(activeSprint.status === 'finished' || timeLeft <= 0) ? 'SPRINT FINISHED' : 'SESSION ACTIVE'}
          </Text>
          <Text style={styles.hostName}>{activeSprint.hostName}'s Sprint</Text>
          <Text style={{ fontSize: 12, color: colors.subtext, marginTop: 4 }}>
              Round {currentRound + 1} of {activeSprint?.questions?.length || 1} — Type: {((activeSprint?.questions?.[currentRound]?.type || activeSprint.questionType) || '').replace('-', ' ')}
          </Text>
          
          {(activeSprint.hostId === currentUid || auth.currentUser?.email === 'projectgazzy@gmail.com') ? (
              (activeSprint.status === 'active' && timeLeft > 0) && (
                  <View style={{ gap: 8, marginTop: 12 }}>
                      <TouchableOpacity style={[styles.hostBtn, { backgroundColor: '#EF4444' }]} onPress={endSprint}>
                        <Text style={styles.hostBtnText}>End Sprint Early</Text>
                      </TouchableOpacity>
                      {!showGame && (
                          <TouchableOpacity style={[styles.hostBtn, { backgroundColor: colors.primary }]} onPress={() => setShowGame(true)}>
                              <Text style={styles.hostBtnText}>Return to Game</Text>
                          </TouchableOpacity>
                      )}
                  </View>
              )
          ) : (
              (!hasSubmitted && activeSprint.status === 'active' && timeLeft > 0) && (
                <TouchableOpacity style={[styles.hostBtn, { marginTop: 12 }]} onPress={() => setShowGame(true)}>
                    <Text style={styles.hostBtnText}>Join Now</Text>
                </TouchableOpacity>
              )
          )}
          
          {results.length > 0 && (
             <View style={styles.leaderboardOverlay}>
                <Text style={{ fontSize: 12, fontWeight: 'bold', color: colors.subtext, marginBottom: 8 }}>LIVE STANDINGS</Text>
                {results.slice(0, 3).map((res, i) => (
                    <View key={i} style={styles.lbRow}>
                        <Text style={styles.lbName}>{i+1}. {res.userName}</Text>
                        <Text style={styles.lbScore}>{res.score}% in {res.timeTaken}s</Text>
                    </View>
                ))}
             </View>
          )}

          {(activeSprint?.status === 'finished' || timeLeft <= 0) && (
              <TouchableOpacity 
                  style={{ marginTop: 15, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#EF4444', backgroundColor: isDark ? '#450a0a' : '#FEF2F2', alignItems: 'center' }}
                  onPress={clearSprint}
              >
                  <Text style={{ color: '#EF4444', fontWeight: 'bold' }}>
                      Dismiss / Clear Table
                  </Text>
              </TouchableOpacity>
          )}
        </View>
      )}

      <Modal visible={showGame && !!activeSprint} transparent animationType="slide">
          <View style={styles.modalBg}>
              <View style={styles.gameCard}>
                  <View style={styles.timerBox}>
                      <Text style={styles.timerText}>{timeLeft}</Text>
                  </View>
                  
                  {hasSubmitted ? (
                      <>
                        <MaterialCommunityIcons name="check-circle" size={60} color="#10B981" />
                        <Text style={[styles.questionTitle, { color: '#10B981', marginTop: 10 }]}>Answer Submitted!</Text>
                        
                        {activeSprint?.status === 'active' ? (
                            <Text style={styles.questionDesc}>Waiting for others... The next round will begin automatically.</Text>
                        ) : (
                            <Text style={styles.questionDesc}>Sprint finished! See final standings below.</Text>
                        )}

                        {activeSprint?.status === 'active' && 
                         (activeSprint.hostId === currentUid || auth.currentUser?.email === 'projectgazzy@gmail.com') && 
                         timeLeft > 0 && (
                            <TouchableOpacity 
                                style={[styles.hostBtn, { marginBottom: 20, width: '100%' }]} 
                                onPress={() => setTimeLeft(0)}
                            >
                                <Text style={styles.hostBtnText}>Force Next Round ({timeLeft}s)</Text>
                            </TouchableOpacity>
                        )}
                        
                        <View style={{ width: '100%', maxHeight: 200 }}>
                             <ScrollView>
                                {results.map((res, i) => (
                                    <View key={i} style={styles.lbRow}>
                                        <Text style={styles.lbName}>{i+1}. {res.userName}</Text>
                                        <Text style={styles.lbScore}>{res.score} pts</Text>
                                    </View>
                                ))}
                             </ScrollView>
                        </View>

                        {activeSprint?.status === 'finished' && (
                            <TouchableOpacity 
                                style={[styles.hostBtn, { marginTop: 20, width: '100%' }]} 
                                onPress={() => setShowGame(false)}
                            >
                                <Text style={styles.hostBtnText}>View Board</Text>
                            </TouchableOpacity>
                        )}
                      </>
                  ) : (
                      <>
                        <Text style={styles.questionTitle}>
                            {activeSprint?.questions ? `Round ${currentRound + 1} of 5:\n` : ''}
                            {activeSprint?.questions?.[currentRound]?.type === 'repeat-sentence' || activeSprint?.questionType === 'repeat-sentence' ? 'Repeat the Sentence' : 'Fill in the Blank'}
                        </Text>
                        
                        {(activeSprint?.questions?.[currentRound]?.type === 'fill-blanks' || activeSprint?.questionType === 'fill-blanks') && (
                             <View style={{ marginBottom: 20 }}>
                                <Text style={[styles.questionDesc, { fontSize: 17, color: colors.text, textAlign: 'left', lineHeight: 26 }]}>
                                    {currentQuestion?.segments?.map((seg: string, i: number) => (
                                        <React.Fragment key={i}>
                                            <Text>{seg}</Text>
                                            {i < currentQuestion.segments.length - 1 && (
                                                <View style={{
                                                    backgroundColor: i === selectedSprintAnswers.length ? colors.primary + '20' : colors.border + '40',
                                                    paddingHorizontal: 8,
                                                    borderRadius: 4,
                                                    borderWidth: i === selectedSprintAnswers.length ? 1 : 0,
                                                    borderColor: colors.primary,
                                                    minWidth: 60,
                                                    height: 24,
                                                    justifyContent: 'center',
                                                    alignItems: 'center',
                                                    marginHorizontal: 2
                                                }}>
                                                    <Text style={{ 
                                                        color: selectedSprintAnswers[i] ? colors.primary : colors.subtext,
                                                        fontWeight: 'bold',
                                                        fontSize: 14
                                                    }}>
                                                        {selectedSprintAnswers[i] || `[ ${i + 1} ]`}
                                                    </Text>
                                                </View>
                                            )}
                                        </React.Fragment>
                                    ))}
                                </Text>
                             </View>
                        )}
                        
                        {(activeSprint?.questions?.[currentRound]?.type === 'repeat-sentence' || activeSprint?.questionType === 'repeat-sentence') && (
                            <View style={{ marginBottom: 20, alignItems: 'center' }}>
                                <TouchableOpacity 
                                    style={{ padding: 15, backgroundColor: colors.primary + '20', borderRadius: 50 }}
                                    onPress={async () => {
                                        if (currentQuestion?.audioUrl) {
                                            const { sound } = await Audio.Sound.createAsync({ uri: currentQuestion.audioUrl });
                                            await sound.playAsync();
                                        } else if (currentQuestion?.text) {
                                            synthesizeSpeech(currentQuestion.text);
                                        }
                                    }}
                                >
                                    <MaterialCommunityIcons name="play" size={32} color={colors.primary} />
                                </TouchableOpacity>
                                <Text style={{ fontSize: 12, color: colors.subtext, marginTop: 8 }}>Tap to Play Audio</Text>
                            </View>
                        )}

                        <Text style={[styles.questionDesc, { marginBottom: 15 }]}>
                            {(activeSprint?.questions?.[currentRound]?.type === 'fill-blanks' || activeSprint?.questionType === 'fill-blanks')
                                ? `Select word for blank ${selectedSprintAnswers.length + 1}:` 
                                : 'Identify the correct version/word:'}
                        </Text>
                        
                        {(activeSprint?.questions?.[currentRound]?.type === 'fill-blanks' || activeSprint?.questionType === 'fill-blanks') ? (
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10 }}>
                                {(currentQuestion?.options || []).map((opt: string, idx: number) => {
                                    const isUsed = selectedSprintAnswers.includes(opt);
                                    return (
                                        <TouchableOpacity 
                                            key={idx} 
                                            style={[
                                                styles.optionBtn, 
                                                { width: '45%', marginBottom: 0 },
                                                isUsed && { opacity: 0.5, backgroundColor: colors.border }
                                            ]} 
                                            disabled={isUsed}
                                            onPress={() => {
                                                const newAnswers = [...selectedSprintAnswers, opt];
                                                setSelectedSprintAnswers(newAnswers);
                                                
                                                if (currentQuestion.correctAnswers && newAnswers.length >= currentQuestion.correctAnswers.length) {
                                                    // All blanks filled, calculate final score
                                                    let correctCount = 0;
                                                    newAnswers.forEach((ans, i) => {
                                                        if (ans === currentQuestion.correctAnswers[i]) correctCount++;
                                                    });
                                                    const finalScore = Math.round((correctCount / currentQuestion.correctAnswers.length) * 100);
                                                    submitResult(finalScore, 30 - timeLeft);
                                                }
                                            }}
                                        >
                                            <Text style={[styles.optionText, isUsed && { color: colors.subtext }]}>{opt}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        ) : (
                            [
                                currentQuestion?.text || 'Correct Option',
                                (currentQuestion?.text || '') + ' and more.',
                                'Small variation of ' + (currentQuestion?.text || ''),
                                'The speaker mentioned nothing.'
                            ].sort(() => Math.random() - 0.5).map((opt, idx) => (
                                <TouchableOpacity 
                                    key={idx} 
                                    style={styles.optionBtn} 
                                    onPress={() => {
                                        const isCorrect = opt === currentQuestion?.text;
                                        submitResult(isCorrect ? 100 : 0, 30 - timeLeft);
                                    }}
                                >
                                    <Text style={styles.optionText}>{opt}</Text>
                                </TouchableOpacity>
                            ))
                        )}
                      </>
                  )}
              </View>
          </View>
      </Modal>
    </View>
  );
};
