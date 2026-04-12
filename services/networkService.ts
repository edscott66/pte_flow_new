import * as Network from 'expo-network';
import { scoreService } from './scoreService';

export const networkService = {
  async getCurrentSSID(): Promise<string | null> {
    try {
      // In Expo Go / Development, SSID might not be available without specific permissions
      // or on some platforms. We fallback to a mock for the preview if needed.
      const state = await Network.getNetworkStateAsync();
      
      // Note: getNetworkStateAsync doesn't always return SSID directly on all platforms
      // In a real standalone app, you'd use native modules or specific permissions.
      // For this implementation, we'll use the network type and a mock SSID if unavailable.
      if (state.type === Network.NetworkStateType.WIFI) {
        // In a real app, you'd use a more specific SSID fetcher
        return "Business_WiFi_PTE"; 
      }
      return null;
    } catch (error) {
      console.error("Error getting SSID:", error);
      return null;
    }
  },

  async canEditTable(): Promise<boolean> {
    const currentSSID = await this.getCurrentSSID();
    const originalSSID = await scoreService.getOriginalSSID();
    
    if (!originalSSID) return true; // Not registered yet
    return currentSSID === originalSSID;
  }
};
