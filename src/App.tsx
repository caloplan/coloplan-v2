// src/App.tsx
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native'

function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Hello React Native Web</Text>
      <Text style={styles.subtitle}>
        当前运行平台：{Platform.OS}
      </Text>
      <TouchableOpacity
        style={styles.button}
        onPress={() => alert('点击生效')}
      >
        <Text style={styles.buttonText}>按钮</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333'
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 30
  },
  button: {
    backgroundColor: '#1677ff',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8
  },
  buttonText: {
    color: '#fff',
    fontSize: 16
  }
})

export default App
