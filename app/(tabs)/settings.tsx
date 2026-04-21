import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, Platform, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { scoreService } from '@/services/scoreService';
import { db, ensureAuth } from '@/services/firebase';
import { API_BASE_URL } from '@/constants/config';
import { collection, getDocs, deleteDoc, doc, setDoc } from 'firebase/firestore';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CustomLoader from '@/components/CustomLoader';
import { useTheme } from '../../context/ThemeContext';

export default function SettingsScreen() {
  const [isCreator, setIsCreator] = useState(false);
  const [loading, setLoading] = useState(false);
  const [apiUrl, setApiUrl] = useState('');
  const router = useRouter();
  const { colors, toggleTheme, theme, isDark } = useTheme();

  useEffect(() => {
    scoreService.getIsCreator().then(setIsCreator);
    AsyncStorage.getItem('pte_flow_api_url').then(val => {
      setApiUrl(val || API_BASE_URL);
    });
  }, []);

  const handleResetApiUrl = async () => {
    Alert.alert(
      "Reset API URL",
      "This will revert the backend URL to the default value. The app will reload.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          onPress: async () => {
            await AsyncStorage.removeItem('pte_flow_api_url');
            setApiUrl(API_BASE_URL);
            Alert.alert("Success", "API URL reset. Reloading Daily Goals...");
          }
        }
      ]
    );
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
          <Text style={dynamicStyles.sectionTitle}>Appearance</Text>
          
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
        </View>

        <View style={dynamicStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>General</Text>
          
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

          <TouchableOpacity style={dynamicStyles.item} onPress={handleResetApiUrl}>
            <View style={[dynamicStyles.iconContainer, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
              <MaterialCommunityIcons name="api" size={24} color={colors.subtext} />
            </View>
            <View style={dynamicStyles.itemText}>
              <Text style={dynamicStyles.itemTitle}>External API URL</Text>
              <Text style={dynamicStyles.itemUrl} numberOfLines={1}>{apiUrl || 'Using Relative Path'}</Text>
              <Text style={dynamicStyles.itemDesc}>Tap to reset if Daily Goals fails with 503.</Text>
            </View>
            <MaterialCommunityIcons name="refresh" size={24} color={colors.border} />
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
