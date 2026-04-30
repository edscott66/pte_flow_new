import * as Network from 'expo-network';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { scoreService } from './scoreService';

export const networkService = {
  async getCurrentSSID(): Promise<string | null> {
    try {
      // For web platform - return null as SSID detection isn't possible
      if (Platform.OS === 'web') {
        console.log("[Network] Web platform - SSID detection not available");
        return null;
      }

      // For iOS/Android, attempt to get network info without location
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        // Get network state
        const state = await Network.getNetworkStateAsync();
        
        if (state.type === Network.NetworkStateType.WIFI) {
          // Try to get stored SSID first
          let ssid = await AsyncStorage.getItem('pte_flow_last_known_ssid');
          
          if (!ssid) {
            // Get IP address as fallback identifier
            let ipAddress = '';
            try {
              ipAddress = await Network.getIpAddressAsync();
              console.log(`[Network] Connected to WiFi with IP: ${ipAddress}`);
            } catch (ipError) {
              console.log("[Network] Could not get IP address:", ipError);
            }
            
            // On Android, try to get SSID directly (works on some versions without location)
            if (Platform.OS === 'android') {
              try {
                const networkState = await Network.getNetworkStateAsync();
                // @ts-ignore - SSID exists on some Android platforms
                if (networkState.ssid && networkState.ssid !== '<unknown ssid>') {
                  // @ts-ignore
                  ssid = networkState.ssid;
                  console.log(`[Network] Got Android SSID: ${ssid}`);
                }
              } catch (e) {
                console.log("[Network] Could not get Android SSID");
              }
            }
            
            // Create fallback identifier based on IP address
            if (!ssid && ipAddress) {
              const ipPrefix = ipAddress.split('.').slice(0, 2).join('.');
              ssid = `network_${ipPrefix}`;
              console.log(`[Network] Using IP-based identifier: ${ssid}`);
            }
            
            // Ultimate fallback
            if (!ssid) {
              ssid = `pteflow_${Platform.OS}_network`;
              console.log(`[Network] Using default identifier: ${ssid}`);
            }
          }
          
          return ssid;
        } else if (state.type === Network.NetworkStateType.CELLULAR) {
          return "cellular_network";
        }
      }
      
      return null;
    } catch (error) {
      console.error("[Network] Error getting SSID:", error);
      
      // Return stored SSID as fallback
      const storedSSID = await AsyncStorage.getItem('pte_flow_last_known_ssid');
      return storedSSID;
    }
  },

  async setCurrentSSID(ssid: string): Promise<void> {
    try {
      await AsyncStorage.setItem('pte_flow_last_known_ssid', ssid);
      console.log(`[Network] Saved SSID: ${ssid}`);
    } catch (error) {
      console.error("[Network] Error saving SSID:", error);
    }
  },

  async canEditTable(): Promise<boolean> {
    try {
      const currentSSID = await this.getCurrentSSID();
      const originalSSID = await scoreService.getOriginalSSID();
      
      if (!originalSSID) {
        console.log("[Network] No original SSID - allowing editing");
        return true;
      }
      
      if (!currentSSID || !originalSSID) {
        console.log(`[Network] Network detection failed - defaulting to read-only`);
        return false;
      }
      
      const canEdit = currentSSID === originalSSID;
      console.log(`[Network] canEdit: ${canEdit} (current: ${currentSSID}, original: ${originalSSID})`);
      return canEdit;
    } catch (error) {
      console.error("[Network] Error in canEditTable:", error);
      return false;
    }
  },
  
  async manualSetNetwork(ssid: string): Promise<void> {
    await this.setCurrentSSID(ssid);
    console.log(`[Network] Manually set network to: ${ssid}`);
  },
  
  async clearNetworkSettings(): Promise<void> {
    await AsyncStorage.removeItem('pte_flow_last_known_ssid');
    console.log("[Network] Cleared network settings");
  }
};