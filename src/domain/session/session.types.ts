export type SessionMetadata = Readonly<{
  id: string;
  authenticatedAt: number;
  expiresAt: number;
  lastActivityAt: number;
}>;

export type SessionState =
  | Readonly<{
    status: 'SIGNED_OUT';
    session: null;
    reauthenticationRequestId: null;
  }>
  | Readonly<{
    status: 'ACTIVE';
    session: SessionMetadata;
    reauthenticationRequestId: null;
  }>
  | Readonly<{
    status: 'LOCKED';
    session: SessionMetadata;
    reauthenticationRequestId: string | null;
  }>
  | Readonly<{
    status: 'EXPIRED';
    session: null;
    reauthenticationRequestId: null;
  }>;

export const initialSessionState: SessionState = {
  status: 'SIGNED_OUT',
  session: null,
  reauthenticationRequestId: null,
};
