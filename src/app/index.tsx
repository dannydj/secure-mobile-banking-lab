
import { StyleSheet, Text, View } from 'react-native';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Secure Mobile Banking Lab</Text>
      <Text style={styles.subtitle}>Mobile Security Reference Project</Text>
      <Text style={styles.description}>
        Architecture defined. Security implementation in progress.
      </Text>
      <Text style={styles.disclaimer}>
        Educational demonstration using synthetic data only.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#F8FAFC',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 16,
    marginTop: 12,
    color: '#334155',
  },
  description: {
    fontSize: 14,
    marginTop: 24,
    textAlign: 'center',
    color: '#475569',
  },
  disclaimer: {
    fontSize: 12,
    marginTop: 16,
    textAlign: 'center',
    color: '#64748B',
  },
});
