export type DemoLoginInput = Readonly<{
  username: string;
  accessCode: string;
}>;

export type IdentityResult =
  | Readonly<{
    accepted: true;
    subjectId: string;
  }>
  | Readonly<{
    accepted: false;
    reason: 'INVALID_INPUT' | 'NOT_RECOGNIZED';
  }>;

export type IdentityAdapter = Readonly<{
  authenticate: (input: DemoLoginInput) => Promise<IdentityResult>;
}>;
