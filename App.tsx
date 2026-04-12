/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { registerRootComponent } from 'expo';

// Must be exported or used with registerRootComponent
export default function App() {
  // @ts-ignore
  const { ExpoRoot } = require('expo-router');
  // @ts-ignore
  const ctx = require.context('./app');
  return <ExpoRoot context={ctx} />;
}
