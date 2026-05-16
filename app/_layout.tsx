import { Stack, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import { onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db, auth, ensureAuth } from '../services/firebase';
import { scoreService } from '../services/scoreService';
import { Alert, View, TouchableOpacity, Animated, Image, SafeAreaView, Platform, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

import { ThemeProvider, useTheme } from '../context/ThemeContext';

function RootLayoutContent() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const segments = useSegments();
  const navigationState = useRootNavigationState();
  const [isRestoring, setIsRestoring] = useState(true);
  const [targetRoute, setTargetRoute] = useState<string | null>(null);

  useEffect(() => {
    // Combined initialization to avoid race conditions
    const initializeApp = async () => {
      const checkSubscriptionAndRestore = async (user: any) => {
        try {
          const userId = user?.uid;
          
          // First check local subscription
          let { daysRemaining, isActivated, isExpired } = await scoreService.getSubscriptionStatus();
          
          // If not activated locally, try to restore from cloud
          if (!isActivated && userId) {
            console.log("[Layout] Local activation not found, attempting cloud restore for:", userId);
            
            const userActivationRef = doc(db, 'user_activations', userId);
            const activationSnap = await getDoc(userActivationRef);
            
            if (activationSnap.exists()) {
              const activationData = activationSnap.data();
              if (activationData.subscriptionStartDate) {
                // Restore subscription from cloud
                await scoreService.setSubscriptionStartDate(activationData.subscriptionStartDate);
                console.log("[Layout] Successfully restored subscription from cloud");
                
                // Re-check status after restore
                const restoredStatus = await scoreService.getSubscriptionStatus();
                isActivated = restoredStatus.isActivated;
                isExpired = restoredStatus.isExpired;
                daysRemaining = restoredStatus.daysRemaining;
              }
            }
          }
          
          const isActivateScreen = segments[0] === 'activate';
          
          // Handle navigation based on activation status
          if (!isActivated || isExpired) {
            if (!isActivateScreen) {
              console.log("[Layout] Need to redirect to activate screen (Activated:", isActivated, "Expired:", isExpired, ")");
              setTargetRoute('/activate');
            }
          } else {
            // User is activated, ensure they're not on activate screen
            if (isActivateScreen) {
              setTargetRoute('/');
            }
            
            // Show warning for expiring soon (3 days or less)
            if (daysRemaining <= 3 && daysRemaining > 0) {
              Alert.alert(
                "Subscription Alert",
                `Your subscription will expire in ${Math.max(0, daysRemaining)} days. After that, the app will no longer work. Please renew your subscription to continue using the app.`,
                [{ text: "OK" }]
              );
            }
          }
        } catch (error) {
          console.error("[Layout] Error in subscription check:", error);
          // On error, default to showing activate screen to be safe if NOT already there
          const isActivateScreen = segments[0] === 'activate';
          if (!isActivateScreen) {
            setTargetRoute('/activate');
          }
        }
      };

      try {
        // 1. Ensure the user is signed in anonymously at least
        const user = await ensureAuth();
        
        // 2. Check Subscription Status and Attempt Cloud Restore
        await checkSubscriptionAndRestore(user);
      } catch (error) {
        console.error("[Layout] Initialization error:", error);
      } finally {
        setIsRestoring(false);
      }
    };
    
    initializeApp();

    // Listen for Global Reset Signal
    const unsubscribe = onSnapshot(doc(db, 'config', 'reset'), async (snapshot: any) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        const lastReset = await AsyncStorage.getItem('pte_flow_last_reset');
        
        if (data.timestamp && data.timestamp !== lastReset) {
          console.log("[Admin] Global Reset Signal Received!");
          await AsyncStorage.setItem('pte_flow_last_reset', data.timestamp);
          
          // Check if we are already logged in
          const name = await scoreService.getUserName();
          
          // Do not apply the wipe to the admin who initiated it
          const isHost = data.adminId && auth.currentUser?.uid === data.adminId;
          const isAdmin = auth.currentUser?.email === 'projectgazzy@gmail.com';
          
          if (name && !isHost && !isAdmin) {
            // Set flag to hide other users on leaderboard until a new group is joined
            await AsyncStorage.setItem('pte_flow_leaderboard_hidden', 'true');
            await AsyncStorage.removeItem('pte_flow_group_id');
            
            Alert.alert(
              "Leaderboard Reset",
              data.message || "The leaderboard has been reset by the admin. Your score has been cleared, and you will only see your own progress until you join a new group.",
              [{ text: "OK", onPress: async () => {
                await scoreService.resetLeaderboardScore();
                router.replace('/');
              }}]
            );
          }
        }
      }
    });

    return () => unsubscribe();
  }, [segments]);

  useEffect(() => {
    if (!isRestoring && targetRoute && navigationState?.key) {
      router.replace(targetRoute as any);
      setTargetRoute(null);
    }
  }, [isRestoring, targetRoute, router, navigationState?.key]);

  // Show loading screen while restoring
  if (isRestoring) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.primary },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="activate" options={{ headerShown: false, gestureEnabled: false }} />
        {/* The Welcome Screen */}
        <Stack.Screen name="index" options={{ headerShown: false }} />
        
        {/* The Main App (Tabs) */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        
        {/* The Practice Module Screen */}
        <Stack.Screen name="module/[id]" options={{ title: 'Practice' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <RootLayoutContent />
    </ThemeProvider>
  );
}