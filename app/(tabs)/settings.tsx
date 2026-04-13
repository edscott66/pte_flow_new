import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { scoreService } from '../../services/scoreService';
import { db, ensureAuth } from '../../services/firebase';
import { collection, getDocs, deleteDoc, doc, setDoc } from 'firebase/firestore';
import { useRouter } from 'expo-router';

export default function SettingsScreen() {
  const [isCreator, setIsCreator] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    scoreService.getIsCreator().then(setIsCreator);
  }, []);

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
              
              const deletePromises = snapshot.docs.map(d => deleteDoc(doc(db, 'leaderboard', d.id)));
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>Manage your group and app data</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>General</Text>
          
          <TouchableOpacity style={styles.item} onPress={handleLocalReset}>
            <View style={[styles.iconContainer, { backgroundColor: '#F1F5F9' }]}>
              <MaterialCommunityIcons name="account-remove" size={24} color="#64748B" />
            </View>
            <View style={styles.itemText}>
              <Text style={styles.itemTitle}>Reset My Progress</Text>
              <Text style={styles.itemDesc}>Clear your name and score from this device.</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color="#CBD5E1" />
          </TouchableOpacity>
        </View>

        {isCreator && (
          <View style={[styles.section, styles.adminSection]}>
            <View style={styles.adminHeader}>
              <MaterialCommunityIcons name="shield-check" size={20} color="#EF4444" />
              <Text style={styles.adminTitle}>Admin Controls</Text>
            </View>
            
            <TouchableOpacity 
              style={[styles.item, styles.dangerItem]} 
              onPress={handleGlobalReset}
              disabled={loading}
            >
              <View style={[styles.iconContainer, { backgroundColor: '#FEE2E2' }]}>
                <MaterialCommunityIcons name="delete-forever" size={24} color="#EF4444" />
              </View>
              <View style={styles.itemText}>
                <Text style={[styles.itemTitle, { color: '#B91C1C' }]}>Wipe Global Group Data</Text>
                <Text style={styles.itemDesc}>Delete ALL student scores from the cloud.</Text>
              </View>
              {loading ? (
                <ActivityIndicator size="small" color="#EF4444" />
              ) : (
                <MaterialCommunityIcons name="alert-circle-outline" size={24} color="#FCA5A5" />
              )}
            </TouchableOpacity>
            
            <Text style={styles.adminNote}>
              Note: You are seeing these controls because you are the creator of this group.
            </Text>
          </View>
        )}

        <View style={styles.footer}>
          <Text style={styles.version}>PTE Flow v1.0.0</Text>
          <Text style={styles.copyright}>© 2026 PTE Flow Team</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { padding: 24, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#1E293B' },
  subtitle: { fontSize: 14, color: '#64748B', marginTop: 4 },
  
  content: { flex: 1 },
  
  section: { marginTop: 24, paddingHorizontal: 16 },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, marginLeft: 8 },
  
  item: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#fff', 
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
  itemTitle: { fontSize: 16, fontWeight: 'bold', color: '#1E293B' },
  itemDesc: { fontSize: 12, color: '#64748B', marginTop: 2 },
  
  adminSection: { marginTop: 32, paddingBottom: 32 },
  adminHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, marginLeft: 8, gap: 6 },
  adminTitle: { fontSize: 14, fontWeight: 'bold', color: '#EF4444', textTransform: 'uppercase', letterSpacing: 1 },
  dangerItem: { borderColor: '#FEE2E2', borderWidth: 1 },
  adminNote: { fontSize: 12, color: '#94A3B8', textAlign: 'center', marginTop: 12, fontStyle: 'italic' },
  
  footer: { padding: 40, alignItems: 'center' },
  version: { fontSize: 12, fontWeight: 'bold', color: '#CBD5E1' },
  copyright: { fontSize: 10, color: '#CBD5E1', marginTop: 4 },
});
