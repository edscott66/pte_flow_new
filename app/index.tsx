import { View, Text, StyleSheet, TouchableOpacity, Image, TextInput, Alert, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState, useEffect, useRef } from 'react';
import { scoreService } from '@/services/scoreService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db, ensureAuth, handleFirestoreError, OperationType } from '@/services/firebase';
import { doc, setDoc, getDocs, query, collection, where, limit, orderBy, deleteDoc } from 'firebase/firestore';
import { useTheme } from '../context/ThemeContext';

export default function WelcomeScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const { colors, isDark } = useTheme();
  
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  const opacityAnim = pulseAnim.interpolate({
    inputRange: [1, 1.05],
    outputRange: [1, 0.8]
  });

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const savedName = await scoreService.getUserName();
    
    // Check if we already have a creator
    const isCreator = await scoreService.getIsCreator();
    
    // If no creator is set locally, check if the cloud is empty
    if (!isCreator) {
      try {
        await ensureAuth();
        const q = query(collection(db, 'leaderboard'), limit(1));
        const snapshot = await getDocs(q);
        if (snapshot.empty) {
          console.log("[Admin] Cloud is empty. First user will be Creator.");
          await scoreService.setIsCreator(true);
        }
      } catch (e) {
        console.error("Failed to check creator status", e);
      }
    }

    if (savedName) {
      // Even if logged in, sync with leaderboard to ensure name is there
      syncWithLeaderboard(savedName);
      router.replace('/(tabs)');
    }
    setLoading(false);
  };

  const syncWithLeaderboard = async (userName: string) => {
    try {
      let userId = await AsyncStorage.getItem('pte_flow_user_id');
      let currentScore = await scoreService.getScore();
      
      await ensureAuth();

      if (!userId) {
        // Try to find existing user by name to "restore" session if they cleared data
        console.log(`[Firebase Sync] Searching for existing session for ${userName}...`);
        // Order by score desc to get the best session if multiple exist
        const q = query(
          collection(db, 'leaderboard'), 
          where('name', '==', userName), 
          orderBy('score', 'desc'),
          limit(1)
        );
        
        try {
          let querySnapshot = await getDocs(q);
          
          // Fallback: If query fails (e.g. missing index) or is empty, try a simpler query
          if (querySnapshot.empty) {
            console.log(`[Firebase Sync] No session found with orderBy. Trying simple query...`);
            const simpleQ = query(collection(db, 'leaderboard'), where('name', '==', userName), limit(5));
            querySnapshot = await getDocs(simpleQ);
          }
          
          if (!querySnapshot.empty) {
            // Sort in memory if we have multiple results from the simple query
            const docs = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() as any }));
            docs.sort((a: any, b: any) => (b.score || 0) - (a.score || 0));
            
            const bestDoc = docs[0];
            userId = bestDoc.id;
            const cloudScore = bestDoc.score || 0;
            
            console.log(`[Firebase Sync] Found best existing session: ${userId} with score ${cloudScore}`);
            
            // Cleanup: Delete other sessions with the same name that have lower scores
            if (docs.length > 1) {
              console.log(`[Firebase Sync] Cleaning up ${docs.length - 1} duplicate sessions...`);
              for (let i = 1; i < docs.length; i++) {
                deleteDoc(doc(db, 'leaderboard', docs[i].id)).catch((e: any) => console.log("Cleanup failed", e));
              }
            }
            
            if (cloudScore > currentScore) {
              currentScore = cloudScore;
              await scoreService.setScore(cloudScore);
            }
            
            // Restore attempted questions
            const cloudAttempted = bestDoc.attemptedQuestions || [];
            if (cloudAttempted.length > 0) {
              const localAttempted = await scoreService.getAttemptedQuestions();
              // Merge unique IDs
              const merged = Array.from(new Set([...localAttempted, ...cloudAttempted]));
              await scoreService.setAttemptedQuestions(merged);
              console.log(`[Firebase Sync] Restored ${cloudAttempted.length} attempted questions`);
            }

            await AsyncStorage.setItem('pte_flow_user_id', userId!);
            console.log(`[Firebase Sync] Restored session for ${userName} with score ${currentScore}`);
          } else {
            console.log(`[Firebase Sync] No existing session found for ${userName}. Creating new.`);
            userId = Math.random().toString(36).substring(7);
            await AsyncStorage.setItem('pte_flow_user_id', userId);
          }
        } catch (error) {
          console.log("[Firebase Sync] Advanced query failed, trying simple fallback...", error);
          try {
            const simpleQ = query(collection(db, 'leaderboard'), where('name', '==', userName), limit(5));
            const querySnapshot = await getDocs(simpleQ);
            if (!querySnapshot.empty) {
              const docs = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() as any }));
              docs.sort((a: any, b: any) => (b.score || 0) - (a.score || 0));
              const bestDoc = docs[0];
              userId = bestDoc.id;
              const cloudScore = bestDoc.score || 0;

              // Cleanup: Delete other sessions with the same name that have lower scores
              if (docs.length > 1) {
                for (let i = 1; i < docs.length; i++) {
                  deleteDoc(doc(db, 'leaderboard', docs[i].id)).catch((e: any) => {});
                }
              }

              if (cloudScore > currentScore) {
                currentScore = cloudScore;
                await scoreService.setScore(cloudScore);
              }

              // Restore attempted questions
              const cloudAttempted = bestDoc.attemptedQuestions || [];
              if (cloudAttempted.length > 0) {
                const localAttempted = await scoreService.getAttemptedQuestions();
                const merged = Array.from(new Set([...localAttempted, ...cloudAttempted]));
                await scoreService.setAttemptedQuestions(merged);
              }

              await AsyncStorage.setItem('pte_flow_user_id', userId!);
            } else {
              userId = Math.random().toString(36).substring(7);
              await AsyncStorage.setItem('pte_flow_user_id', userId);
            }
          } catch (e2) {
            userId = Math.random().toString(36).substring(7);
            await AsyncStorage.setItem('pte_flow_user_id', userId);
          }
        }
      }
      
      console.log(`[Firebase Sync] Syncing user ${userName} (${userId}) with score ${currentScore}`);
      const userDocRef = doc(db, 'leaderboard', userId!);
      
      const attempted = await scoreService.getAttemptedQuestions();
      
      try {
        await setDoc(userDocRef, {
          userId,
          name: userName,
          score: currentScore,
          attemptedQuestions: attempted,
          lastUpdate: new Date().toISOString()
        }, { merge: true });
        console.log("User successfully synced to Firebase Leaderboard");
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `leaderboard/${userId}`);
      }
    } catch (e) {
      console.error("Leaderboard sync failed", e);
    }
  };

  const handleStart = async () => {
    if (name.trim().length < 2) {
      Alert.alert("Wait!", "Please enter your name to continue.");
      return;
    }
    const trimmedName = name.trim();
    await scoreService.setUserName(trimmedName);
    
    await syncWithLeaderboard(trimmedName);

    router.replace('/(tabs)');
  };

  if (loading) return null;

  const dynamicStyles = StyleSheet.create({
    container: { flex: 1, backgroundColor: isDark ? colors.background : '#2563EB' },
    heroSection: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    logoContainer: {
      width: 120, height: 120, backgroundColor: '#fff', borderRadius: 30,
      justifyContent: 'center', alignItems: 'center',
      shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 20, elevation: 10,
    },
    logoSubText: { fontSize: 14, fontWeight: 'bold', color: colors.subtext, letterSpacing: 2 },
    contentSection: { 
      backgroundColor: colors.surface, borderTopLeftRadius: 40, borderTopRightRadius: 40, 
      padding: 40, paddingBottom: 60,
    },
    title: { fontSize: 24, fontWeight: 'bold', color: colors.text, textAlign: 'center', marginBottom: 24 },
    inputContainer: { marginBottom: 24 },
    label: { fontSize: 14, fontWeight: 'bold', color: colors.subtext, marginBottom: 8 },
    input: {
      backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
      borderWidth: 1, borderColor: colors.border, borderRadius: 12,
      padding: 16, fontSize: 16, color: colors.text,
    },
    button: { 
      backgroundColor: colors.primary, paddingVertical: 18, borderRadius: 16,
      alignItems: 'center', shadowColor: colors.primary, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5,
    },
    buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    footerText: { fontSize: 12, color: colors.subtext, textAlign: 'center', marginTop: 24 },
  });

  return (
    <SafeAreaView style={dynamicStyles.container}>
      <StatusBar style="light" />
      
      {/* Background/Logo Section */}
      <View style={dynamicStyles.heroSection}>
        <Animated.View style={[dynamicStyles.logoContainer, {
          transform: [{ scale: pulseAnim }],
          opacity: opacityAnim,
          borderWidth: 3,
          borderColor: '#c09c32'
        }]}>
          <Image
            source={require('../assets/images/BBLPTF.png')}
            style={{ width: '100%', height: '100%', borderRadius: 27 }}
            resizeMode="cover"
          />
        </Animated.View>
      </View>

      {/* Content Section */}
      <View style={dynamicStyles.contentSection}>
        <Text style={dynamicStyles.title}>Master the PTE Exam with AI and Big Ben Academy</Text>
        
        <View style={dynamicStyles.inputContainer}>
          <Text style={dynamicStyles.label}>Enter your name to join:</Text>
          <TextInput 
            style={dynamicStyles.input} 
            placeholder="Student Name" 
            placeholderTextColor={colors.subtext}
            value={name} 
            onChangeText={setName}
            autoCapitalize="words"
          />
        </View>

        <TouchableOpacity 
          style={dynamicStyles.button} 
          onPress={handleStart}
        >
          <Text style={dynamicStyles.buttonText}>Get Started</Text>
        </TouchableOpacity>

        <Text style={dynamicStyles.footerText}>
          Your name will be used for the local leaderboard.
        </Text>
      </View>
    </SafeAreaView>
  );
}


