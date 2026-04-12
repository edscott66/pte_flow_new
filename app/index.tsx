import { View, Text, StyleSheet, TouchableOpacity, Image, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState, useEffect } from 'react';
import { scoreService } from '../services/scoreService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Config } from '../constants/config';

export default function WelcomeScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const savedName = await scoreService.getUserName();
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
      if (!userId) {
        userId = Math.random().toString(36).substring(7);
        await AsyncStorage.setItem('pte_flow_user_id', userId);
      }
      
      console.log(`[Sync] Syncing user ${userName} (${userId}) to leaderboard at ${Config.API_BASE_URL}`);
      const response = await fetch(`${Config.API_BASE_URL}/api/leads/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, name: userName, score: 0 })
      });

      if (!response.ok) {
        const text = await response.text();
        console.error("Leaderboard sync failed:", text);
      } else {
        console.log("User successfully synced to leaderboard");
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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Background/Logo Section */}
      <View style={styles.heroSection}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>PTE</Text>
          <Text style={styles.logoSubText}>FLOW</Text>
        </View>
      </View>

      {/* Content Section */}
      <View style={styles.contentSection}>
        <Text style={styles.title}>Master the PTE Exam with AI</Text>
        
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Enter your name to join:</Text>
          <TextInput 
            style={styles.input} 
            placeholder="Student Name" 
            value={name} 
            onChangeText={setName}
            autoCapitalize="words"
          />
        </View>

        <TouchableOpacity 
          style={styles.button} 
          onPress={handleStart}
        >
          <Text style={styles.buttonText}>Get Started</Text>
        </TouchableOpacity>

        <Text style={styles.footerText}>
          Your name will be used for the local leaderboard.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#2563EB' },
  
  heroSection: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  logoContainer: {
    width: 120,
    height: 120,
    backgroundColor: '#fff',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  logoText: { fontSize: 32, fontWeight: 'bold', color: '#2563EB' },
  logoSubText: { fontSize: 14, fontWeight: 'bold', color: '#64748B', letterSpacing: 2 },

  contentSection: { 
    backgroundColor: '#fff', 
    borderTopLeftRadius: 40, 
    borderTopRightRadius: 40, 
    padding: 40,
    paddingBottom: 60,
  },
  title: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    color: '#1E293B', 
    textAlign: 'center',
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#64748B',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1E293B',
  },
  button: { 
    backgroundColor: '#2563EB', 
    paddingVertical: 18, 
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#2563EB',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  footerText: { 
    fontSize: 12, 
    color: '#94A3B8', 
    textAlign: 'center', 
    marginTop: 24 
  },
});
