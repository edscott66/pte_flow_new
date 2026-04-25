// Use a safer way to detect environment without immediately requiring react-native if possible
// This avoids issues when this file is imported in a Node.js context
const isWeb = typeof window !== 'undefined';

// Use the AIS Shared App URL as the base for API calls if running in Expo Go
// The shared URL (ais-pre) is more accessible for mobile apps than the dev URL.
const AIS_APP_URL = "https://ais-pre-p7pekcpklsxlfphmw34a56-565384667751.europe-west2.run.app";

/**
 * Access environment variables safely in Expo/Web/Node environments
 * Fixed: Avoids direct 'process.env' access which can cause issues with Expo's virtual env
 */
const getEnvVar = (name: string): string | undefined => {
  try {
    const g = (typeof globalThis !== 'undefined' ? globalThis : typeof global !== 'undefined' ? global : typeof window !== 'undefined' ? window : {}) as any;
    const env = g.process?.env || (typeof process !== 'undefined' ? process.env : undefined) || {};
    return env[name];
  } catch (e) {
    return undefined;
  }
};

const rawApiUrl = getEnvVar('EXPO_PUBLIC_API_URL');
let resolvedUrl = rawApiUrl || AIS_APP_URL;

// On AIS, dev URLs often have cors/auth restrictions, so we preference pre-production
if (resolvedUrl && resolvedUrl.includes('ais-dev-')) {
  resolvedUrl = resolvedUrl.replace('ais-dev-', 'ais-pre-');
}

// On web (AIS Preview), use relative paths to avoid CORS and cookie check issues.
// On native (Expo Go), use the full URL.
export const API_BASE_URL = isWeb ? '' : resolvedUrl;

export const Config = {
  API_BASE_URL
};

if (!API_BASE_URL && !isWeb) {
  console.warn("API_BASE_URL is not defined in a native environment.");
}
