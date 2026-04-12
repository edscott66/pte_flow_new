import { Platform } from 'react-native';

/**
 * Application Configuration
 */

// Use the AIS App URL as the base for API calls if running in Expo Go
// This allows the mobile app to connect to the backend server running in the AIS environment.
const AIS_APP_URL = "https://ais-dev-p7pekcpklsxlfphmw34a56-565384667751.europe-west2.run.app";

// On web (AIS Preview), use relative paths to avoid CORS and cookie check issues.
// On native (Expo Go), use the full URL.
// IMPORTANT: If testing locally with Expo Go, set EXPO_PUBLIC_API_URL to your local IP (e.g., http://192.168.0.150:3000)
export const API_BASE_URL = Platform.OS === 'web' 
  ? '' 
  : (process.env.EXPO_PUBLIC_API_URL || AIS_APP_URL);

export const Config = {
  API_BASE_URL
};

if (!API_BASE_URL) {
  console.warn("API_BASE_URL is not defined. API calls will likely fail.");
} else if (API_BASE_URL === AIS_APP_URL && !process.env.EXPO_PUBLIC_API_URL) {
  console.warn("Using hardcoded AIS_APP_URL. If you have remixed this app, please update EXPO_PUBLIC_API_URL in your .env file.");
}
