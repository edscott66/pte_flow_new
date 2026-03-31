import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Icon / Logo Area */}
      <View style={styles.iconCircle}>
        <Ionicons name="school" size={60} color="#F59E0B" /> 
      </View>

      {/* UPDATED NAME HERE */}
      <Text style={styles.title}>PTE Flow</Text>
      <Text style={styles.subtitle}>Master Your Speaking Flow</Text>

      {/* Info Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>What is PTE?</Text>
        <Text style={styles.cardText}>
          A global computer-based English test for study and migration.
        </Text>
        
        <View style={styles.divider} />
        
        <Text style={styles.cardTitle}>AI Scoring</Text>
        <Text style={styles.cardText}>
          Get real-time feedback on pronunciation and fluency via Gemini.
        </Text>
      </View>

      {/* Button */}
      <TouchableOpacity 
        style={styles.button} 
        onPress={() => router.replace('/(tabs)')}
      >
        <Text style={styles.buttonText}>Get Started</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#2563EB', alignItems: 'center', justifyContent: 'center', padding: 24 },
  iconCircle: { width: 100, height: 100, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 50, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 36, fontWeight: '800', color: '#fff', marginBottom: 10 },
  subtitle: { fontSize: 18, color: '#DBEAFE', textAlign: 'center', marginBottom: 40 },
  card: { backgroundColor: 'rgba(255,255,255,0.15)', padding: 24, borderRadius: 20, width: '100%', marginBottom: 40 },
  cardTitle: { color: '#93C5FD', fontWeight: 'bold', fontSize: 16, marginBottom: 4 },
  cardText: { color: '#fff', marginBottom: 16, lineHeight: 22 },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginBottom: 16 },
  button: { backgroundColor: '#fff', paddingVertical: 18, width: '100%', borderRadius: 16, alignItems: 'center' },
  buttonText: { color: '#2563EB', fontSize: 18, fontWeight: 'bold' }
});