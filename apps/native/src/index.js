import { AppRegistry } from 'react-native';
import { View, Text } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';

// Force-hide splash immediately at module load — don't wait for useEffect
SplashScreen.hideAsync();

function App() {
  return (
    <View style={{ flex: 1, backgroundColor: '#dc2626', justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ color: '#fff', fontSize: 28, fontWeight: 'bold' }}>IT WORKS</Text>
      <Text style={{ color: '#fca5a5', fontSize: 16, marginTop: 8 }}>Red = app is rendering</Text>
    </View>
  );
}

AppRegistry.registerComponent('main', () => App);
