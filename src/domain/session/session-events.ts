type BiometricResultType =
  | 'BIOMETRIC_SUCCESS'
  | 'BIOMETRIC_FAILURE'
  | 'BIOMETRIC_CANCELLED'
  | 'BIOMETRIC_UNAVAILABLE';

export type SessionEvent =
  | Readonly<{
    type: 'LOGIN_SUCCESS';
  }>
  | Readonly<{
    type: 'LOGIN_FAILURE';
  }>
  | Readonly<{
    type: 'LOCK_REQUESTED';
  }>
  | Readonly<{
    type: 'INACTIVITY_TIMEOUT';
  }>
  | Readonly<{
    type: 'USER_ACTIVITY';
  }>
  | Readonly<{
    type: 'APP_BACKGROUND';
  }>
  | Readonly<{
    type: 'APP_FOREGROUND';
  }>
  | Readonly<{
    type: 'REAUTHENTICATION_REQUESTED';
    requestId: string;
  }>
  | Readonly<{
    type: BiometricResultType;
    sessionId: string;
    requestId: string;
  }>
  | Readonly<{
    type: 'SESSION_EXPIRED';
  }>
  | Readonly<{
    type: 'LOGOUT';
  }>
  | Readonly<{
    type: 'APPLICATION_RESTART';
  }>;
