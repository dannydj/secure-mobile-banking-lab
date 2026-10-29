export type BiometricAuthenticationResult =
  | Readonly<{ status: 'SUCCESS' }>
  | Readonly<{ status: 'FAILURE' }>
  | Readonly<{ status: 'CANCELLED' }>
  | Readonly<{ status: 'UNAVAILABLE' }>
  | Readonly<{ status: 'ERROR' }>;

export type BiometricAuthenticationPort = Readonly<{
  authenticate: () => Promise<BiometricAuthenticationResult>;
}>;
