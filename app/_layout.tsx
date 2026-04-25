import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { onSnapshot, doc } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { scoreService } from '@/services/scoreService';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ThemeProvider, useTheme } from '@/context/ThemeContext';

function RootLayoutContent() {
  const router = useRouter();
  const { colors, isDark } = useTheme();

  useEffect(() => {
    // Check Subscription Status on App Open
    const checkSubscription = async () => {
      const { daysRemaining } = await scoreService.getSubscriptionStatus();
      if (daysRemaining <= 3) {
        Alert.alert(
          "Subscription Alert",
          `Your subscription will expire in ${Math.max(0, daysRemaining)} days. After that, the app will no longer work. Please renew your subscription to continue using the app.`,
          [{ text: "OK" }]
        );
      }
    };
    checkSubscription();

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
          if (name) {
            // Set flag to hide other users on leaderboard until a new group is joined
            await AsyncStorage.setItem('pte_flow_leaderboard_hidden', 'true');
            
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
  }, []);

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
