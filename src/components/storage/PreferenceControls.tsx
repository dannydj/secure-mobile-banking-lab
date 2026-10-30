import { Button, StyleSheet, Text, View } from 'react-native';

type PreferenceControlsProps = Readonly<{
  disabled: boolean;
  feedback: string | null;
  onSaveSessions: () => void;
  onSaveStorage: () => void;
  onClear: () => void;
}>;

export function PreferenceControls({ disabled, feedback, onSaveSessions, onSaveStorage, onClear }: PreferenceControlsProps) {
  return (
    <View style={styles.container}>
      <Button
        title="Save sessions preference"
        disabled={disabled}
        onPress={onSaveSessions}
      />

      <Button
        title="Save storage preference"
        disabled={disabled}
        onPress={onSaveStorage}
      />

      <Button
        title="Clear preference"
        disabled={disabled}
        onPress={onClear}
      />

      {feedback ? (
        <Text style={styles.feedback}>{feedback}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
    gap: 12,
    width: '100%',
  },
  feedback: {
    fontSize: 14,
    marginTop: 12,
    color: '#334155',
  },
});
