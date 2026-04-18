import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Modal, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { scoreService, PerformanceMetrics } from '../../services/scoreService';

export default function Profile() {
  const [userName, setUserName] = useState('PTE Student');
  const [score, setScore] = useState(0);
  const [attemptedCount, setAttemptedCount] = useState(0);
  
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [targetScore, setTargetScore] = useState(79);
  const [performance, setPerformance] = useState<PerformanceMetrics | null>(null);

  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const [newTarget, setNewTarget] = useState('');

  useFocusEffect(
    useCallback(() => {
      const loadData = async () => {
        const name = await scoreService.getUserName();
        const s = await scoreService.getScore();
        const attempted = await scoreService.getAttemptedQuestions();
        const tScore = await scoreService.getTargetScore();
        const perf = await scoreService.getPerformance();
        
        if (name) setUserName(name);
        setScore(s);
        setAttemptedCount(attempted.length);
        setTargetScore(tScore);
        setPerformance(perf);
      };
      loadData();
    }, [])
  );

  const handleTargetScoreTap = () => {
    setNewTarget(targetScore.toString());
    setIsEditingTarget(true);
  };

  const saveTargetScore = async () => {
    const parsed = parseInt(newTarget, 10);
    if (!isNaN(parsed) && parsed >= 10 && parsed <= 90) {
      setTargetScore(parsed);
      await scoreService.setTargetScore(parsed);
      setIsEditingTarget(false);
    } else {
      Alert.alert("Invalid Score", "Please enter a valid PTE score between 10 and 90.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.header}>My Profile</Text>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <Image source={require('../../assets/images/BBLPTF.png')} style={styles.avatar} />
          <Text style={styles.name}>{userName}</Text>
          <TouchableOpacity onPress={handleTargetScoreTap} style={styles.targetWrapper}>
            <Text style={styles.target}>Target Score: {targetScore} <MaterialCommunityIcons name="pencil" size={14} color="#64748B" /></Text>
          </TouchableOpacity>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNum}>{attemptedCount}</Text>
            <Text style={styles.statLabel}>EXERCISES</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumGreen}>{score}</Text>
            <Text style={styles.statLabel}>TOTAL SCORE</Text>
          </View>
        </View>

        {/* Progress Bars */}
        <Text style={styles.sectionTitle}>Learning Progress</Text>
        
        {performance && (
          <>
            <View style={styles.progressCard}>
              <View style={styles.progressHeader}>
                <Text style={styles.skillName}>Vocabulary Expansion</Text>
                <Text style={styles.skillVal}>{Math.round(performance.vocabulary)}%</Text>
              </View>
              <View style={styles.barBg}>
                <View style={[styles.barFill, { width: `${Math.round(performance.vocabulary)}%`, backgroundColor: '#2563EB' }]} />
              </View>
            </View>

            <View style={styles.progressCard}>
              <View style={styles.progressHeader}>
                <Text style={styles.skillName}>Grammar Accuracy</Text>
                <Text style={styles.skillVal}>{Math.round(performance.grammar)}%</Text>
              </View>
              <View style={styles.barBg}>
                <View style={[styles.barFill, { width: `${Math.round(performance.grammar)}%`, backgroundColor: '#F97316' }]} />
              </View>
            </View>

            <View style={styles.progressCard}>
              <View style={styles.progressHeader}>
                <Text style={styles.skillName}>Fluency & Rhythm</Text>
                <Text style={styles.skillVal}>{Math.round(performance.fluency)}%</Text>
              </View>
              <View style={styles.barBg}>
                <View style={[styles.barFill, { width: `${Math.round(performance.fluency)}%`, backgroundColor: '#10B981' }]} />
              </View>
            </View>
            
            <View style={styles.progressCard}>
              <View style={styles.progressHeader}>
                <Text style={styles.skillName}>Pronunciation Clarity</Text>
                <Text style={styles.skillVal}>{Math.round(performance.pronunciation)}%</Text>
              </View>
              <View style={styles.barBg}>
                <View style={[styles.barFill, { width: `${Math.round(performance.pronunciation)}%`, backgroundColor: '#8B5CF6' }]} />
              </View>
            </View>
          </>
        )}

      </ScrollView>

      {/* Target Score Editor Modal */}
      <Modal visible={isEditingTarget} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Set Target Score</Text>
            <Text style={styles.modalSubtitle}>Enter a PTE score between 10 and 90.</Text>
            
            <TextInput
              style={styles.modalInput}
              keyboardType="number-pad"
              value={newTarget}
              onChangeText={setNewTarget}
              maxLength={2}
              autoFocus
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setIsEditingTarget(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSave} onPress={saveTargetScore}>
                <Text style={styles.modalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  scroll: { padding: 20 },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  
  profileCard: { backgroundColor: '#fff', borderRadius: 24, padding: 30, alignItems: 'center', marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#E2E8F0', marginBottom: 16, overflow: 'hidden' },
  name: { fontSize: 20, fontWeight: 'bold', color: '#1E293B' },
  targetWrapper: { marginTop: 4, padding: 4 },
  target: { color: '#64748B', fontWeight: '500' },

  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 },
  statCard: { backgroundColor: '#fff', width: '48%', padding: 20, borderRadius: 16, alignItems: 'center', shadowOpacity: 0.05, shadowRadius: 5 },
  statNum: { fontSize: 24, fontWeight: 'bold', color: '#2563EB', marginBottom: 4 },
  statNumGreen: { fontSize: 24, fontWeight: 'bold', color: '#10B981', marginBottom: 4 },
  statLabel: { fontSize: 12, fontWeight: 'bold', color: '#94A3B8', letterSpacing: 1 },

  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  progressCard: { backgroundColor: '#fff', padding: 20, borderRadius: 16, marginBottom: 12 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  skillName: { fontWeight: '600', color: '#1E293B' },
  skillVal: { fontWeight: 'bold', color: '#2563EB' },
  barBg: { height: 8, backgroundColor: '#F1F5F9', borderRadius: 4 },
  barFill: { height: '100%', borderRadius: 4 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 20, padding: 24, alignItems: 'center' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1E293B', marginBottom: 8 },
  modalSubtitle: { fontSize: 14, color: '#64748B', marginBottom: 20, textAlign: 'center' },
  modalInput: { width: 100, height: 60, backgroundColor: '#F1F5F9', borderRadius: 12, fontSize: 32, fontWeight: 'bold', textAlign: 'center', color: '#1E293B', marginBottom: 24 },
  modalButtons: { flexDirection: 'row', width: '100%', justifyContent: 'space-between' },
  modalCancel: { flex: 1, padding: 16, borderRadius: 12, alignItems: 'center', marginRight: 8, backgroundColor: '#F1F5F9' },
  modalCancelText: { color: '#64748B', fontWeight: 'bold', fontSize: 16 },
  modalSave: { flex: 1, padding: 16, borderRadius: 12, alignItems: 'center', marginLeft: 8, backgroundColor: '#2563EB' },
  modalSaveText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
