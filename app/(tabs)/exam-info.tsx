import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

// --- DATA CONTENT ---
const QUESTION_TYPES = [
  {
    part: "PART 1 — SPEAKING & WRITING",
    duration: "54–67 minutes",
    items: [
      { id: '1', title: "Read Aloud", desc: "You read a short text aloud. Tests pronunciation, fluency, and reading." },
      { id: '2', title: "Repeat Sentence", desc: "You hear a sentence and repeat it exactly. High‑weight task for listening + speaking." },
      { id: '3', title: "Describe Image", desc: "You speak for 40 seconds describing an image (graph, map, process, etc.)." },
      { id: '4', title: "Re‑tell Lecture", desc: "You listen to a lecture (with/without image) and summarise it in 40 seconds." },
      { id: '5', title: "Answer Short Question", desc: "You hear a simple question and respond with one or a few words." },
      { id: '6', title: "Summarize Written Text", desc: "You read a passage and write a one‑sentence summary (5–75 words)." },
      { id: '7', title: "Essay", desc: "Write a 200–300‑word academic essay in 20 minutes." },
    ]
  },
  {
    part: "PART 2 — READING",
    duration: "29–30 minutes",
    items: [
      { id: '8', title: "Reading & Writing: Fill in the Blanks", desc: "Drag‑and‑drop words into blanks. Tests grammar + collocation." },
      { id: '9', title: "Multiple‑choice, Multiple Answer", desc: "Choose more than one correct option. Negative marking applies." },
      { id: '10', title: "Re‑order Paragraphs", desc: "Arrange text boxes into a logical order." },
      { id: '11', title: "Reading: Fill in the Blanks", desc: "Select the correct word for each blank from dropdown options." },
      { id: '12', title: "Multiple‑choice, Single Answer", desc: "Choose one correct answer." },
    ]
  },
  {
    part: "PART 3 — LISTENING",
    duration: "30–43 minutes",
    items: [
      { id: '13', title: "Summarize Spoken Text", desc: "Write a 50–70‑word summary of a short lecture." },
      { id: '14', title: "Multiple‑choice, Multiple Answer", desc: "Select all correct answers after listening to an audio." },
      { id: '15', title: "Listening: Fill in the Blanks", desc: "Type missing words from a transcript while listening." },
      { id: '16', title: "Highlight Correct Summary", desc: "Choose the summary that best matches the audio." },
      { id: '17', title: "Multiple‑choice, Single Answer", desc: "Choose one correct answer based on the audio." },
      { id: '18', title: "Select Missing Word", desc: "Choose the word/phrase that completes the audio." },
      { id: '19', title: "Highlight Incorrect Words", desc: "Identify words in the transcript that differ from the audio." },
      { id: '20', title: "Write From Dictation", desc: "Type the exact sentence you hear. Highest‑weight task in Listening." },
    ]
  }
];

const SCORING_DATA = [
  { task: "Repeat Sentence", weight: "56", skills: "S, L" },
  { task: "Read Aloud", weight: "51.5", skills: "S, R" },
  { task: "Describe Image", weight: "15", skills: "S" },
  { task: "Re‑tell Lecture", weight: "15", skills: "S, L" },
  { task: "Answer Short Question", weight: "5", skills: "S, L" },
  { task: "Summarize Written Text", weight: "15", skills: "W, R" },
  { task: "Essay", weight: "10", skills: "W" },
];

// --- COMPONENT ---
export default function ExamInfoScreen() {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const toggleSection = (title: string) => {
    setExpandedSection(expandedSection === title ? null : title);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>Exam Guide</Text>
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* --- SECTION 1: QUESTION TYPES --- */}
        <View style={styles.card}>
          <TouchableOpacity style={styles.cardHeader} onPress={() => toggleSection('types')}>
            <View style={styles.headerLeft}>
              <Ionicons name="list" size={24} color="#2563EB" />
              <Text style={styles.cardTitle}>Question Types</Text>
            </View>
            <Ionicons name={expandedSection === 'types' ? "chevron-up" : "chevron-down"} size={20} color="#64748B" />
          </TouchableOpacity>

          {expandedSection === 'types' && (
            <View style={styles.cardContent}>
              {QUESTION_TYPES.map((part, index) => (
                <View key={index} style={styles.partContainer}>
                  <Text style={styles.partHeader}>{part.part}</Text>
                  <Text style={styles.duration}>Duration: {part.duration}</Text>
                  
                  {part.items.map((item) => (
                    <View key={item.id} style={styles.itemRow}>
                      <Text style={styles.itemTitle}>{item.id}) {item.title}</Text>
                      <Text style={styles.itemDesc}>{item.desc}</Text>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          )}
        </View>

        {/* --- SECTION 2: SCORING TABLE --- */}
        <View style={styles.card}>
          <TouchableOpacity style={styles.cardHeader} onPress={() => toggleSection('scoring')}>
            <View style={styles.headerLeft}>
              <Ionicons name="stats-chart" size={24} color="#F97316" />
              <Text style={styles.cardTitle}>Scoring Weight Table</Text>
            </View>
            <Ionicons name={expandedSection === 'scoring' ? "chevron-up" : "chevron-down"} size={20} color="#64748B" />
          </TouchableOpacity>

          {expandedSection === 'scoring' && (
            <View style={styles.cardContent}>
              <Text style={styles.tableIntro}>Higher numbers = greater impact on overall score</Text>
              
              <View style={styles.legendBox}>
                <Text style={styles.legendText}><Text style={{fontWeight:'bold'}}>Legend:</Text> S=Speaking, W=Writing, R=Reading, L=Listening</Text>
              </View>

              {/* Table Header */}
              <View style={styles.tableHeader}>
                <Text style={[styles.col1, styles.th]}>Task</Text>
                <Text style={[styles.col2, styles.th]}>Weight</Text>
                <Text style={[styles.col3, styles.th]}>Skills</Text>
              </View>

              {/* Table Body */}
              {SCORING_DATA.map((row, index) => (
                <View key={index} style={[styles.tableRow, index % 2 === 0 && styles.rowEven]}>
                  <Text style={styles.col1}>{row.task}</Text>
                  <Text style={[styles.col2, styles.bold]}>{row.weight}</Text>
                  <Text style={styles.col3}>{row.skills}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* --- FUTURE SECTIONS --- */}
        <View style={styles.cardPlaceholder}>
          <Text style={styles.placeholderText}>More sections coming soon...</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { fontSize: 24, fontWeight: 'bold', color: '#1E293B', padding: 20, paddingBottom: 10 },
  scroll: { padding: 20 },
  
  // Card Styles
  card: { backgroundColor: '#fff', borderRadius: 16, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#1E293B' },
  cardContent: { padding: 20, paddingTop: 0, borderTopWidth: 1, borderTopColor: '#F1F5F9' },

  // Question Types Styles
  partContainer: { marginTop: 20 },
  partHeader: { color: '#2563EB', fontWeight: 'bold', fontSize: 16, marginBottom: 2 },
  duration: { color: '#64748B', fontSize: 13, fontStyle: 'italic', marginBottom: 10 },
  itemRow: { marginBottom: 12 },
  itemTitle: { fontWeight: '700', color: '#334155', fontSize: 15 },
  itemDesc: { color: '#64748B', fontSize: 14, lineHeight: 20 },

  // Table Styles
  tableIntro: { color: '#64748B', fontSize: 13, textAlign: 'center', marginTop: 15, marginBottom: 10 },
  legendBox: { backgroundColor: '#EFF6FF', padding: 10, borderRadius: 8, marginBottom: 15 },
  legendText: { fontSize: 12, color: '#1E40AF', textAlign: 'center' },
  
  tableHeader: { flexDirection: 'row', backgroundColor: '#F1F5F9', padding: 10, borderRadius: 8, marginBottom: 4 },
  tableRow: { flexDirection: 'row', padding: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  rowEven: { backgroundColor: '#FAFAFA' },
  th: { fontWeight: 'bold', color: '#475569', fontSize: 13 },
  bold: { fontWeight: 'bold', color: '#2563EB' },
  
  // Columns
  col1: { flex: 3, fontSize: 14, color: '#334155' },
  col2: { flex: 1, textAlign: 'center', fontSize: 14 },
  col3: { flex: 1, textAlign: 'center', fontSize: 14, color: '#64748B' },

  // Footer
  cardPlaceholder: { padding: 20, alignItems: 'center', opacity: 0.5 },
  placeholderText: { color: '#94A3B8', fontStyle: 'italic' }
});