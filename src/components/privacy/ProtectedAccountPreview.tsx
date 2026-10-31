import { StyleSheet, Text, View } from 'react-native';
import { maskAccountIdentifier } from '../../domain/privacy/mask-account-identifier';

type ProtectedAccountPreviewProps = Readonly<{
  accountIdentifier: string;
  balance: string;
}>;

export function ProtectedAccountPreview({ accountIdentifier, balance }: ProtectedAccountPreviewProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Protected synthetic preview
      </Text>
      <Text>
        Fictional account: {maskAccountIdentifier(accountIdentifier)}
      </Text>
      <Text>Fictional account balance: {balance}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
  },
  title: {
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
});
