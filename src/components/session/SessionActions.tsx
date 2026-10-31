import { Button, StyleSheet, Text } from 'react-native';

type SessionActionsProps = Readonly<{
  canViewProtected: boolean;
  isLocked: boolean;
  biometricDisabled: boolean;
  biometricFeedback: string | null;
  onActivity: () => void;
  onLock: () => void;
  onBiometricUnlock: () => void;
  onLogout: () => void;
}>;

export function SessionActions({ canViewProtected, isLocked, biometricDisabled, biometricFeedback, onActivity, onLock, onBiometricUnlock, onLogout }: SessionActionsProps) {
  return (
    <>
      <Button title="Simulate activity" disabled={!canViewProtected} onPress={onActivity} />

      <Button title="Lock session" disabled={!canViewProtected} onPress={onLock} />

      {isLocked ? (
        <>
          <Button title="Unlock with device biometrics" disabled={biometricDisabled} onPress={onBiometricUnlock} />

          {biometricFeedback ? (
            <Text style={styles.feedback}>
              {biometricFeedback}
            </Text>
          ) : null}
        </>
      ) : null}

      <Button title="Log out" onPress={onLogout} />
    </>
  );
}

const styles = StyleSheet.create({
  feedback: {
    fontSize: 14,
    marginTop: 12,
    color: '#334155',
  },
});
