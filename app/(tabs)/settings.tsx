import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, Platform, Switch, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { scoreService } from '@/services/scoreService';
import { db, ensureAuth } from '@/services/firebase';
import { API_BASE_URL } from '@/constants/config';
import { collection, getDocs, deleteDoc, doc, setDoc } from 'firebase/firestore';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CustomLoader from '@/components/CustomLoader';
import { useTheme } from '@/context/ThemeContext';

export default function SettingsScreen() {
  const [isCreator, setIsCreator] = useState(false);
  const [loading, setLoading] = useState(false);
  const [remindersEnabled, setRemindersEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState('09:00 AM');
  const [subscriptionDetails, setSubscriptionDetails] = useState({ daysRemaining: 60, text: 'Active — 60 days remaining', color: '#10B981', isExpired: false });
  const [coachVoice, setCoachVoice] = useState('Aoede');
  const router = useRouter();
  const { colors, toggleTheme, theme, isDark } = useTheme();

  useEffect(() => {
    scoreService.getIsCreator().then(setIsCreator);
    
    // Load Subscription Details
    const loadSubscription = async () => {
      const details = await scoreService.getSubscriptionStatus();
      setSubscriptionDetails(details);
    };

    const loadPrefs = async () => {
      const enabled = await AsyncStorage.getItem('pte_reminders_enabled');
      const time = await AsyncStorage.getItem('pte_reminder_time');
      const voice = await AsyncStorage.getItem('pte_coach_voice');
      setRemindersEnabled(enabled === 'true');
      if (time) setReminderTime(time);
      if (voice) setCoachVoice(voice);
    };

    loadSubscription();
    loadPrefs();
  }, []);

  const changeVoice = async () => {
    const voices = [
      { name: 'Aoede (British)', id: 'Aoede' },
      { name: 'Puck (Young)', id: 'Puck' },
      { name: 'Kore (Female)', id: 'Kore' },
      { name: 'Zephyr (Deep)', id: 'Zephyr' },
    ];
    
    Alert.alert(
      "Choose Coach Voice",
      "Select a preferred voice for AI responses.",
      voices.map(v => ({
        text: v.name,
        onPress: async () => {
          setCoachVoice(v.id);
          await AsyncStorage.setItem('pte_coach_voice', v.id);
        }
      }))
    );
  };

  const toggleReminders = async (value: boolean) => {
    setRemindersEnabled(value);
    await AsyncStorage.setItem('pte_reminders_enabled', value.toString());
    if (value) {
      Alert.alert("Reminders Enabled", `You will be nudged daily at ${reminderTime} to complete your goals.`);
    }
  };

  const handleOpenLink = (url: string) => {
    Linking.openURL(url).catch(() => Alert.alert("Error", "Could not open link."));
  };

  const handleFeedback = async (type: 'bug' | 'feature') => {
    const userName = await scoreService.getUserName() || 'User';
    const subject = type === 'bug' ? "Bug Report: PTE Flow" : "Feature Request: PTE Flow";
    const body = `Hi Team,\n\nI'm using the PTE Flow app and wanted to ${type === 'bug' ? 'report a bug' : 'suggest a feature'}:\n\n\n\nFrom: ${userName}`;
    const mailto = `mailto:projectgazzy@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    Linking.openURL(mailto).catch(() => Alert.alert("Error", "Could not open mail app. Please email us at projectgazzy@gmail.com"));
  };

  const handleRenewSubscription = async () => {
    const userName = await scoreService.getUserName() || 'User';
    const subject = "Subscription Renewal Request";
    const body = `Please renew my subscription.\n\nFrom: ${userName}`;
    const mailto = `mailto:projectgazzy@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    Linking.openURL(mailto).catch(() => Alert.alert("Error", "Could not open mail app. Please email us at projectgazzy@gmail.com"));
  };

  const handleGlobalReset = async () => {
    Alert.alert(
      "CRITICAL ACTION",
      "This will delete ALL student scores from the cloud and reset the app for EVERYONE in this group. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "DELETE EVERYTHING", 
          style: "destructive",
          onPress: async () => {
            setLoading(true);
            try {
              await ensureAuth();
              
              // 1. Delete all leaderboard docs in cloud
              const q = collection(db, 'leaderboard');
              const snapshot = await getDocs(q);
              
              const deletePromises = snapshot.docs.map((d: any) => deleteDoc(doc(db, 'leaderboard', d.id)));
              await Promise.all(deletePromises);
              
              // 2. Send Global Reset Signal
              await setDoc(doc(db, 'config', 'reset'), {
                timestamp: new Date().toISOString(),
                reason: 'admin_wipe'
              });
              
              // 3. Clear local data for the creator
              await scoreService.clearAllLocalData();
              
              Alert.alert("Success", "Group data has been wiped. The app will now restart.");
              router.replace('/');
            } catch (error) {
              console.error("Global reset failed:", error);
              Alert.alert("Error", "Failed to wipe cloud data. Please check your connection.");
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleLocalReset = async () => {
    Alert.alert(
      "Reset My Data",
      "This will clear your score and name from this phone only.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Reset", 
          onPress: async () => {
            await scoreService.clearAllLocalData();
            router.replace('/');
          }
        }
      ]
    );
  };

  const dynamicStyles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { padding: 24, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
    title: { fontSize: 28, fontWeight: 'bold', color: colors.text },
    subtitle: { fontSize: 14, color: colors.subtext, marginTop: 4 },
    
    content: { flex: 1 },
    
    section: { marginTop: 24, paddingHorizontal: 16 },
    sectionTitle: { fontSize: 14, fontWeight: 'bold', color: isDark ? colors.subtext : '#94A3B8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, marginLeft: 8 },
    
    item: { 
      flexDirection: 'row', 
      alignItems: 'center', 
      backgroundColor: colors.surface, 
      padding: 16, 
      borderRadius: 16,
      marginBottom: 12,
      shadowColor: '#000',
      shadowOpacity: 0.05,
      shadowRadius: 10,
      elevation: 2,
    },
    iconContainer: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    itemText: { flex: 1 },
    itemTitle: { fontSize: 16, fontWeight: 'bold', color: colors.text },
    itemUrl: { fontSize: 11, color: colors.primary, marginTop: 2, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
    itemDesc: { fontSize: 12, color: colors.subtext, marginTop: 2 },
    
    adminSection: { marginTop: 32, paddingBottom: 32 },
    adminHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, marginLeft: 8, gap: 6 },
    adminTitle: { fontSize: 14, fontWeight: 'bold', color: colors.danger, textTransform: 'uppercase', letterSpacing: 1 },
    dangerItem: { borderColor: isDark ? colors.danger : '#FEE2E2', borderWidth: 1 },
    adminNote: { fontSize: 12, color: colors.subtext, textAlign: 'center', marginTop: 12, fontStyle: 'italic' },
    
    footer: { padding: 40, alignItems: 'center' },
    version: { fontSize: 12, fontWeight: 'bold', color: colors.border },
    copyright: { fontSize: 10, color: colors.border, marginTop: 4 },
  });

  return (
    <SafeAreaView style={dynamicStyles.container}>
      <View style={dynamicStyles.header}>
        <Text style={dynamicStyles.title}>Settings</Text>
        <Text style={dynamicStyles.subtitle}>Manage your group and app data</Text>
      </View>

      <ScrollView style={dynamicStyles.content}>
        <View style={dynamicStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>Appearance & Study</Text>
          
          <View style={dynamicStyles.item}>
            <View style={[dynamicStyles.iconContainer, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
              <MaterialCommunityIcons 
                name={isDark ? "weather-night" : "weather-sunny"} 
                size={24} 
                color={isDark ? "#3B82F6" : "#F59E0B"} 
              />
            </View>
            <View style={dynamicStyles.itemText}>
              <Text style={dynamicStyles.itemTitle}>Dark Mode</Text>
              <Text style={dynamicStyles.itemDesc}>Adjust the app's color scheme.</Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: '#CBD5E1', true: '#3B82F6' }}
              thumbColor={Platform.OS === 'ios' ? undefined : (isDark ? '#fff' : '#fff')}
            />
          </View>

          <View style={dynamicStyles.item}>
            <View style={[dynamicStyles.iconContainer, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
              <MaterialCommunityIcons name="bell-ring" size={24} color={colors.primary} />
            </View>
            <View style={dynamicStyles.itemText}>
              <Text style={dynamicStyles.itemTitle}>Daily Study Reminders</Text>
              <Text style={dynamicStyles.itemDesc}>Nudge me at {reminderTime}</Text>
            </View>
            <Switch
              value={remindersEnabled}
              onValueChange={toggleReminders}
              trackColor={{ false: '#CBD5E1', true: '#3B82F6' }}
            />
          </View>

          <TouchableOpacity style={dynamicStyles.item} onPress={changeVoice}>
            <View style={[dynamicStyles.iconContainer, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
              <MaterialCommunityIcons name="account-voice" size={24} color="#10B981" />
            </View>
            <View style={dynamicStyles.itemText}>
              <Text style={dynamicStyles.itemTitle}>Coach Voice</Text>
              <Text style={dynamicStyles.itemDesc}>Currently: {coachVoice}</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color={colors.border} />
          </TouchableOpacity>
        </View>

        <View style={dynamicStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>PTE Quick Guide</Text>
          
          <TouchableOpacity style={dynamicStyles.item} onPress={() => handleOpenLink('https://www.pearsonpte.com/')}>
            <View style={[dynamicStyles.iconContainer, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
              <MaterialCommunityIcons name="earth" size={24} color="#0EA5E9" />
            </View>
            <View style={dynamicStyles.itemText}>
              <Text style={dynamicStyles.itemTitle}>Pearson Official Website</Text>
              <Text style={dynamicStyles.itemDesc}>Official news and test booking.</Text>
            </View>
            <MaterialCommunityIcons name="open-in-new" size={20} color={colors.border} />
          </TouchableOpacity>

          <TouchableOpacity style={dynamicStyles.item} onPress={() => handleOpenLink('https://www.pearsonpte.com/preparation/practice-tests')}>
            <View style={[dynamicStyles.iconContainer, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
              <MaterialCommunityIcons name="book-open-variant" size={24} color="#8B5CF6" />
            </View>
            <View style={dynamicStyles.itemText}>
              <Text style={dynamicStyles.itemTitle}>Official Practice Tests</Text>
              <Text style={dynamicStyles.itemDesc}>Official Pearson preparation materials.</Text>
            </View>
            <MaterialCommunityIcons name="open-in-new" size={20} color={colors.border} />
          </TouchableOpacity>

          <TouchableOpacity style={dynamicStyles.item} onPress={() => handleOpenLink('https://www.pearsonpte.com/pte-academic-handbook')}>
            <View style={[dynamicStyles.iconContainer, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
              <MaterialCommunityIcons name="file-document-outline" size={24} color="#F43F5E" />
            </View>
            <View style={dynamicStyles.itemText}>
              <Text style={dynamicStyles.itemTitle}>PTE Academic Handbook</Text>
              <Text style={dynamicStyles.itemDesc}>Download the official guide (PDF).</Text>
            </View>
            <MaterialCommunityIcons name="download" size={20} color={colors.border} />
          </TouchableOpacity>
        </View>

        <View style={dynamicStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>Support & Feedback</Text>
          
          <TouchableOpacity style={dynamicStyles.item} onPress={() => handleFeedback('bug')}>
            <View style={[dynamicStyles.iconContainer, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
              <MaterialCommunityIcons name="bug-outline" size={24} color={colors.danger} />
            </View>
            <View style={dynamicStyles.itemText}>
              <Text style={dynamicStyles.itemTitle}>Report a Bug</Text>
              <Text style={dynamicStyles.itemDesc}>Found an issue? Let us know.</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={dynamicStyles.item} onPress={() => handleFeedback('feature')}>
            <View style={[dynamicStyles.iconContainer, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
              <MaterialCommunityIcons name="lightbulb-on-outline" size={24} color="#EAB308" />
            </View>
            <View style={dynamicStyles.itemText}>
              <Text style={dynamicStyles.itemTitle}>Suggest a Feature</Text>
              <Text style={dynamicStyles.itemDesc}>How can we make PTE Flow better?</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={dynamicStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>Account</Text>
          
          <View style={[dynamicStyles.item, { borderLeftWidth: 4, borderLeftColor: subscriptionDetails.color }]}>
            <View style={[dynamicStyles.iconContainer, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
              <MaterialCommunityIcons name="timer-sand" size={24} color={subscriptionDetails.color} />
            </View>
            <View style={dynamicStyles.itemText}>
              <Text style={dynamicStyles.itemTitle}>Subscription Status</Text>
              <Text style={[dynamicStyles.itemDesc, { color: subscriptionDetails.color, fontWeight: 'bold' }]}>
                {subscriptionDetails.text}
              </Text>
            </View>
          </View>

          <TouchableOpacity style={dynamicStyles.item} onPress={handleRenewSubscription}>
            <View style={[dynamicStyles.iconContainer, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
              <MaterialCommunityIcons name="email-fast-outline" size={24} color={colors.primary} />
            </View>
            <View style={dynamicStyles.itemText}>
              <Text style={dynamicStyles.itemTitle}>Renew Subscription</Text>
              <Text style={dynamicStyles.itemDesc}>Contact us to extend your access.</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color={colors.border} />
          </TouchableOpacity>
          
          <TouchableOpacity style={dynamicStyles.item} onPress={handleLocalReset}>
            <View style={[dynamicStyles.iconContainer, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
              <MaterialCommunityIcons name="account-remove" size={24} color={colors.subtext} />
            </View>
            <View style={dynamicStyles.itemText}>
              <Text style={dynamicStyles.itemTitle}>Reset My Progress</Text>
              <Text style={dynamicStyles.itemDesc}>Clear your name and score from this device.</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color={colors.border} />
          </TouchableOpacity>
        </View>

        {isCreator && (
          <View style={[dynamicStyles.section, dynamicStyles.adminSection]}>
            <View style={dynamicStyles.adminHeader}>
              <MaterialCommunityIcons name="shield-check" size={20} color={colors.danger} />
              <Text style={dynamicStyles.adminTitle}>Admin Controls</Text>
            </View>
            
            <TouchableOpacity 
              style={[dynamicStyles.item, dynamicStyles.dangerItem]} 
              onPress={handleGlobalReset}
              disabled={loading}
            >
              <View style={[dynamicStyles.iconContainer, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : '#FEE2E2' }]}>
                <MaterialCommunityIcons name="delete-forever" size={24} color={colors.danger} />
              </View>
              <View style={dynamicStyles.itemText}>
                <Text style={[dynamicStyles.itemTitle, { color: isDark ? colors.danger : '#B91C1C' }]}>Wipe Global Group Data</Text>
                <Text style={dynamicStyles.itemDesc}>Delete ALL student scores from the cloud.</Text>
              </View>
              {loading ? (
                <CustomLoader size={30} />
              ) : (
                <MaterialCommunityIcons name="alert-circle-outline" size={24} color={isDark ? colors.danger : "#FCA5A5"} />
              )}
            </TouchableOpacity>
            
            <Text style={dynamicStyles.adminNote}>
              Note: You are seeing these controls because you are the creator of this group.
            </Text>
          </View>
        )}

        <View style={dynamicStyles.footer}>
          <Text style={dynamicStyles.version}>PTE Flow v1.0.0</Text>
          <Text style={dynamicStyles.copyright}>© 2026 PTE Flow Team</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
