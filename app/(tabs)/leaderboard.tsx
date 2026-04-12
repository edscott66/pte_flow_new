import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
// import QRCode from 'react-native-qrcode-svg';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { scoreService } from '../../services/scoreService';
import { networkService } from '../../services/networkService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Config } from '../../constants/config';
import { Image } from 'react-native';

interface Lead {
  name: string;
  score: number;
  lastUpdate: string;
}

export default function Leaderboard() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [showQR, setShowQR] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [canEdit, setCanEdit] = useState(true);
  const [currentSSID, setCurrentSSID] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('');

  useEffect(() => {
    fetchLeads();
    checkNetwork();
    scoreService.getUserName().then(name => setUserName(name || 'Student'));
  }, []);

  const checkNetwork = async () => {
    const ssid = await networkService.getCurrentSSID();
    setCurrentSSID(ssid);
    const editable = await networkService.canEditTable();
    setCanEdit(editable);
  };

  const fetchLeads = async () => {
    setLoading(true);
    try {
      // Add timestamp to prevent caching
      const url = `${Config.API_BASE_URL}/api/leads?t=${Date.now()}`;
      console.log(`[Leaderboard] Fetching from: ${url}`);
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });
      
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Server error (${response.status}): ${text.substring(0, 100)}`);
      }
      
      const contentType = response.headers.get("content-type");
      console.log(`[Leaderboard] Content-Type: ${contentType}`);
      
      if (contentType && contentType.indexOf("application/json") !== -1) {
        const data = await response.json();
        console.log(`[Leaderboard] Received ${data.length} leads`);
        setLeads(data);
      } else {
        const text = await response.text();
        console.error("Expected JSON but got:", text.substring(0, 100));
        if (text.trim().startsWith('<')) {
          console.warn("Received HTML. This usually means the API route was not found and Vite served the SPA fallback.");
        }
      }
    } catch (error) {
      console.error("Failed to fetch leads:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleScanPress = async () => {
    try {
      const { status } = await requestPermission();
      if (status === 'granted') {
        setShowScanner(true);
      } else {
        Alert.alert("Permission Denied", "Camera permission is required to scan QR codes.");
      }
    } catch (err) {
      console.error("Camera permission error:", err);
      Alert.alert("Camera Error", "Could not access camera.");
    }
  };

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    setShowScanner(false);
    // In a real app, 'data' would be the Host's IP or a Group Token
    // For this applet, scanning simply "joins" the global leaderboard
    Alert.alert("Joined!", "You have successfully joined the leaderboard group.");
    
    // Set current SSID as original if not set
    const original = await scoreService.getOriginalSSID();
    if (!original && currentSSID) {
      await scoreService.setOriginalSSID(currentSSID);
      setCanEdit(true);
    }
  };

  const renderLead = ({ item, index }: { item: Lead, index: number }) => (
    <View style={styles.leadRow}>
      <View style={styles.rankContainer}>
        <Text style={styles.rankText}>{index + 1}</Text>
      </View>
      <View style={styles.nameContainer}>
        <Text style={styles.nameText}>{item.name}</Text>
        <Text style={styles.timeText}>{new Date(item.lastUpdate).toLocaleTimeString()}</Text>
      </View>
      <View style={styles.scoreContainer}>
        <Text style={styles.scoreText}>{item.score}</Text>
        <Text style={styles.ptsLabel}>PTS</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Global Leaderboard</Text>
        <Text style={styles.subtitle}>First Attempt Scores Only</Text>
        
        {!canEdit && (
          <View style={styles.readOnlyBadge}>
            <MaterialCommunityIcons name="lock" size={14} color="#EF4444" />
            <Text style={styles.readOnlyText}>Read-Only (Wrong Wi-Fi)</Text>
          </View>
        )}
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.actionButton} onPress={() => setShowQR(true)}>
          <MaterialCommunityIcons name="qrcode" size={24} color="#2563EB" />
          <Text style={styles.actionText}>Show QR</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton} onPress={handleScanPress}>
          <MaterialCommunityIcons name="qrcode-scan" size={24} color="#2563EB" />
          <Text style={styles.actionText}>Scan to Join</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={fetchLeads}>
          <MaterialCommunityIcons name="refresh" size={24} color="#2563EB" />
          <Text style={styles.actionText}>Refresh</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#2563EB" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={leads}
          renderItem={renderLead}
          keyExtractor={(item) => item.name}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No students on the leaderboard yet.</Text>
          }
        />
      )}

      {/* QR Modal */}
      <Modal visible={showQR} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Join My Group</Text>
            <View style={styles.qrContainer}>
              <Image 
                source={{ uri: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=pte-flow-join-${encodeURIComponent(userName)}` }}
                style={{ width: 200, height: 200 }}
                referrerPolicy="no-referrer"
              />
            </View>
            <Text style={styles.modalDesc}>Others can scan this to join your local leaderboard.</Text>
            <TouchableOpacity style={styles.closeButton} onPress={() => setShowQR(false)}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Scanner Modal */}
      <Modal visible={showScanner} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
          <View style={styles.scannerHeader}>
            <Text style={styles.scannerTitle}>Scan QR Code</Text>
            <TouchableOpacity onPress={() => setShowScanner(false)}>
              <MaterialCommunityIcons name="close" size={30} color="#fff" />
            </TouchableOpacity>
          </View>
          <CameraView
            style={{ flex: 1 }}
            onBarcodeScanned={handleBarCodeScanned}
          />
          <View style={styles.scannerFooter}>
            <Text style={styles.scannerDesc}>Align the QR code within the frame to join.</Text>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1E293B' },
  subtitle: { fontSize: 14, color: '#64748B', marginTop: 4 },
  readOnlyBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF2F2', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginTop: 10, alignSelf: 'flex-start' },
  readOnlyText: { color: '#EF4444', fontSize: 12, fontWeight: 'bold', marginLeft: 4 },
  
  actionRow: { flexDirection: 'row', justifyContent: 'space-around', padding: 15, backgroundColor: '#fff', marginBottom: 10 },
  actionButton: { alignItems: 'center', gap: 4 },
  actionText: { fontSize: 12, color: '#2563EB', fontWeight: 'bold' },

  listContent: { padding: 15 },
  leadRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 15, borderRadius: 12, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  rankContainer: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  rankText: { color: '#2563EB', fontWeight: 'bold' },
  nameContainer: { flex: 1 },
  nameText: { fontSize: 16, fontWeight: 'bold', color: '#1E293B' },
  timeText: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  scoreContainer: { alignItems: 'flex-end' },
  scoreText: { fontSize: 20, fontWeight: 'bold', color: '#2563EB' },
  ptsLabel: { fontSize: 10, color: '#64748B', fontWeight: 'bold' },
  emptyText: { textAlign: 'center', marginTop: 40, color: '#64748B' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', padding: 30, borderRadius: 24, alignItems: 'center', width: '80%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1E293B', marginBottom: 20 },
  qrContainer: { padding: 20, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  modalDesc: { textAlign: 'center', color: '#64748B', marginTop: 20, lineHeight: 20 },
  closeButton: { marginTop: 30, backgroundColor: '#2563EB', paddingVertical: 12, paddingHorizontal: 40, borderRadius: 12 },
  closeButtonText: { color: '#fff', fontWeight: 'bold' },

  scannerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  scannerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  scannerFooter: { padding: 40, alignItems: 'center' },
  scannerDesc: { color: '#fff', textAlign: 'center' }
});
