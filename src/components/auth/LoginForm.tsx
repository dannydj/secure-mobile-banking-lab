import { Button, StyleSheet, Text, TextInput, View } from 'react-native';

type LoginFormProps = Readonly<{
  username: string;
  accessCode: string;
  disabled: boolean;
  feedback: string | null;
  onUsernameChange: (value: string) => void;
  onAccessCodeChange: (value: string) => void;
  onLogin: () => void;
}>;

export function LoginForm({ username, accessCode, disabled, feedback, onUsernameChange, onAccessCodeChange, onLogin }: LoginFormProps) {
  return (
    <>
      <View style={styles.form}>
        <Text>Demo username</Text>

        <TextInput
          accessibilityLabel="Demo username"
          style={styles.input}
          value={username}
          onChangeText={onUsernameChange}
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Text>Demo access code</Text>

        <TextInput
          accessibilityLabel="Demo access code"
          style={styles.input}
          value={accessCode}
          onChangeText={onAccessCodeChange}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Text style={styles.hint}>
          Public demonstration values: demo-user / demo-only.
          Never enter real credentials.
        </Text>
      </View>

      <Button title="Simulate login" disabled={disabled} onPress={onLogin} />

      {feedback ? (
        <Text style={styles.feedback}>{feedback}</Text>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  form: {
    width: '100%',
    gap: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#FFFFFF',
    color: '#0F172A',
  },
  hint: {
    fontSize: 12,
    color: '#64748B',
  },
  feedback: {
    marginTop: 8,
    fontSize: 13,
    color: '#475569',
    textAlign: 'center',
  },
});
