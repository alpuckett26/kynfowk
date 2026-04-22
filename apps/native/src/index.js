import { AppRegistry } from 'react-native';
import { View, Text, Alert } from 'react-native';
import { useEffect } from 'react';

// Plain React Native — no expo-router, no SafeAreaProvider, no NavigationContainer.
// If this shows the red screen it proves expo-router is the crash cause.
function App() {
  useEffect(() => {
    Alert.alert('Works!', 'Plain React Native rendered successfully.');
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: '#dc2626', justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ color: '#fff', fontSize: 28, fontWeight: 'bold' }}>Kynfowk</Text>
      <Text style={{ color: '#fca5a5', fontSize: 16, marginTop: 8 }}>Plain RN — no router</Text>
    </View>
  );
}

AppRegistry.registerComponent('main', () => App);
