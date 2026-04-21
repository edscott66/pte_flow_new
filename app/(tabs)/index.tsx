import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { scoreService, RecentActivity } from '@/services/scoreService';
import { useTheme } from '../../context/ThemeContext';

// --- PRACTICE MODULES DATA ---
const PRACTICE_MODULES = [
  {
    id: 'speaking',
    title: 'Speaking',
    icon: 'mic-outline',
    color: '#2563EB',
    tasks: ['Read Aloud', 'Repeat Sentence', 'Describe Image', 'Summarize Group Discussion'],
  },
  {
    id: 'writing',
    title: 'Writing',
    icon: 'create-outline',
    color: '#F97316',
    tasks: ['Summarize Written Text', 'Essay'],
  },
  {
    id: 'reading',
    title: 'Reading',
    icon: 'book-outline',
    color: '#10B981',
    tasks: ['Fill in the Blanks', 'Re-order Paragraphs'],
  },
  {
    id: 'listening',
    title: 'Listening',
    icon: 'headset-outline',
    color: '#8B5CF6',
    tasks: ['Summarize Spoken Text', 'Write From Dictation'],
  },
];

export default function HomeScreen() {
  const router = useRouter();
  const [userName, setUserName] = useState("PTE Student");
  const [recentActivity, setRecentActivity] = useState<RecentActivity | null>(null);
  const { colors, isDark } = useTheme();

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const waveAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: false,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: false,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(waveAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
        Animated.timing(waveAnim, { toValue: -1, duration: 150, useNativeDriver: true }),
        Animated.timing(waveAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
        Animated.timing(waveAnim, { toValue: -1, duration: 150, useNativeDriver: true }),
        Animated.timing(waveAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
        Animated.delay(2000),
      ])
    ).start();
  }, [pulseAnim, waveAnim]);

  const borderOpacityAnim = pulseAnim.interpolate({
    inputRange: [1, 1.05],
    outputRange: [0, 1]
  });

  const waveRotation = waveAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-20deg', '0deg', '20deg']
  });

  useEffect(() => {
    const loadUser = async () => {
      const name = await scoreService.getUserName();
      if (name) setUserName(name);
    };
    loadUser();
  }, []);

  useFocusEffect(
    useCallback(() => {
      const loadActivity = async () => {
        const activity = await scoreService.getRecentActivity();
        setRecentActivity(activity);
      };
      loadActivity();
    }, [])
  );

  const formatTimeAgo = (timestampString: string) => {
    const date = new Date(timestampString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays} days ago`;
  };

  const dynamicStyles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scroll: { padding: 20 },
    
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    welcomeText: { fontSize: 14, color: colors.subtext },
    userName: { fontSize: 24, fontWeight: 'bold', color: colors.text },
    profileButton: { width: 48, height: 48, borderRadius: 24, overflow: 'hidden', justifyContent: 'center', alignItems: 'center', backgroundColor: colors.surface },
    avatarImage: { width: '100%', height: '100%', borderRadius: 24 },
  
    progressCard: { backgroundColor: colors.primary, padding: 20, borderRadius: 20, marginBottom: 24 },
    progressInfo: { marginBottom: 12 },
    progressTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
    progressSub: { color: isDark ? '#BFDBFE' : '#BFDBFE', fontSize: 14, marginBottom: 12, opacity: 0.8 },
    progressBarBg: { height: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 4 },
    progressBarFill: { height: '100%', backgroundColor: '#fff', borderRadius: 4 },
  
    mockExamCard: { 
      flexDirection: 'row', 
      alignItems: 'center', 
      backgroundColor: '#10B981', 
      padding: 20, 
      borderRadius: 20, 
      marginBottom: 24,
      shadowColor: '#10B981',
      shadowOpacity: 0.3,
      shadowRadius: 10,
      elevation: 5,
    },
    mockExamIcon: { width: 50, height: 50, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    mockExamInfo: { flex: 1 },
    mockExamTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
    mockExamSub: { color: '#D1FAE5', fontSize: 12 },
  
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 16 },
    
    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    moduleCard: { 
      backgroundColor: colors.surface, 
      width: '48%', 
      padding: 20, 
      borderRadius: 20, 
      marginBottom: 16,
      shadowColor: '#000',
      shadowOpacity: 0.05,
      shadowRadius: 10,
      elevation: 2,
    },
    iconContainer: { width: 50, height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
    moduleTitle: { fontSize: 16, fontWeight: 'bold', color: colors.text, marginBottom: 4 },
    moduleTasks: { fontSize: 12, color: colors.subtext },
  
    activityCard: { 
      flexDirection: 'row', 
      alignItems: 'center', 
      backgroundColor: colors.surface, 
      padding: 16, 
      borderRadius: 16,
      shadowColor: '#000',
      shadowOpacity: 0.05,
      shadowRadius: 10,
    },
    activityIcon: { marginRight: 12 },
    activityInfo: { flex: 1 },
    activityTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
    activityTime: { fontSize: 12, color: colors.subtext, marginTop: 2 },
  });

  return (
    <SafeAreaView style={dynamicStyles.container}>
      <ScrollView contentContainerStyle={dynamicStyles.scroll}>
        
        {/* Header with User Name */}
        <View style={dynamicStyles.header}>
          <View>
            <Text style={dynamicStyles.welcomeText}>Welcome back,</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={dynamicStyles.userName}>{userName}</Text>
              <Animated.Text style={[dynamicStyles.userName, { transform: [{ rotate: waveRotation }], marginLeft: 8 }]}>
                👋
              </Animated.Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => router.push('/profile')}>
            <Animated.View style={[dynamicStyles.profileButton, {
              transform: [{ scale: pulseAnim }],
              borderColor: colors.primary,
              borderWidth: borderOpacityAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 2]
              }),
            }]}>
              <Image source={require('../../assets/images/BBLPTF.png')} style={dynamicStyles.avatarImage} />
            </Animated.View>
          </TouchableOpacity>
        </View>

        {/* Daily Progress Card */}
        <TouchableOpacity 
          style={dynamicStyles.progressCard}
          onPress={() => router.push('/daily-goals')}
        >
          <View style={dynamicStyles.progressInfo}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={dynamicStyles.progressTitle}>Daily Goal</Text>
              <MaterialCommunityIcons name="chevron-right" size={24} color="#fff" />
            </View>
            <Text style={dynamicStyles.progressSub}>View your adaptive AI-generated plan</Text>
          </View>
          <View style={dynamicStyles.progressBarBg}>
            <View style={[dynamicStyles.progressBarFill, { width: '60%' }]} />
          </View>
        </TouchableOpacity>

        {/* Mock Exam Section */}
        <TouchableOpacity 
          style={dynamicStyles.mockExamCard} 
          onPress={() => router.push('/module/mock-exam')}
        >
          <View style={dynamicStyles.mockExamIcon}>
            <MaterialCommunityIcons name="file-document-edit-outline" size={32} color="#fff" />
          </View>
          <View style={dynamicStyles.mockExamInfo}>
            <Text style={dynamicStyles.mockExamTitle}>Full Mock Exam</Text>
            <Text style={dynamicStyles.mockExamSub}>Timed practice with all 20+ task types</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#fff" />
        </TouchableOpacity>

        {/* Practice Modules Grid */}
        <Text style={dynamicStyles.sectionTitle}>Practice Modules</Text>
        <View style={dynamicStyles.grid}>
          {PRACTICE_MODULES.map((module) => (
            <TouchableOpacity 
              key={module.id} 
              style={dynamicStyles.moduleCard}
              onPress={() => router.push(`/module/${module.id}`)}
            >
              <View style={[dynamicStyles.iconContainer, { backgroundColor: isDark ? `${module.color}30` : `${module.color}15` }]}>
                <Ionicons name={module.icon as any} size={28} color={isDark ? colors.primary : module.color} />
              </View>
              <Text style={dynamicStyles.moduleTitle}>{module.title}</Text>
              <Text style={dynamicStyles.moduleTasks}>{module.tasks.length} Task Types</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Recent Activity */}
        {recentActivity && (
          <>
            <Text style={dynamicStyles.sectionTitle}>Recent Activity</Text>
            <TouchableOpacity 
              style={dynamicStyles.activityCard}
              onPress={() => router.push(`/module/${recentActivity.moduleId}?startIndex=${recentActivity.questionIndex}`)}
            >
              <View style={dynamicStyles.activityIcon}>
                <Ionicons name="time-outline" size={24} color={colors.primary} />
              </View>
              <View style={dynamicStyles.activityInfo}>
                <Text style={dynamicStyles.activityTitle}>{recentActivity.moduleTitle}</Text>
                <Text style={dynamicStyles.activityTime}>
                  {formatTimeAgo(recentActivity.timestamp)} • Continue at Q{recentActivity.questionIndex + 1}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.subtext} />
            </TouchableOpacity>
          </>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}
