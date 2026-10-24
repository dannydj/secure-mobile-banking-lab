
# Secure Mobile Banking Lab — V1 Session State Machine

- **Status:** Domain and application lifecycle integration simulated; native device verification pending
- **Implementation issue:** #5
- **Tracking issue:** #1
- **Related document:** [Architecture Overview](overview.md)

## 1. Purpose

Define deterministic session states, transitions, security guards, and lifecycle policies for Secure Mobile Banking Lab V1.

The state machine represents a simulated mobile session. It does not replace server-side authentication, authorization, or session validation in a production financial system.

## 2. Session States

| State | Description | Protected Access |
| --- | --- | --- |
| `SIGNED_OUT` | No valid simulated session exists. | Denied |
| `ACTIVE` | A valid simulated session permits protected access. | Allowed |
| `LOCKED` | A valid session exists but local reauthentication is required. | Denied |
| `EXPIRED` | Session validity has ended. New login is required. | Denied |

The initial state must always be `SIGNED_OUT`.

## 3. Session Policy

V1 uses the following configurable policies:

| Policy | Initial V1 Value | Behavior |
| --- | --- | --- |
| Absolute session lifetime | 15 minutes | Session expires regardless of activity. |
| Foreground inactivity timeout | 2 minutes | Session becomes locked after inactivity. |
| Background behavior | Immediate lock | Leaving the foreground locks an active session. |
| Biometric reauthentication | Optional | Can unlock a valid locked session. |
| Expired session recovery | New login required | Biometrics alone cannot restore an expired session. |
| Application restart | Signed out | An active session is not restored from local storage. |

The timeout values are demonstration defaults, not claims of industry-wide banking requirements.

A successful biometric unlock must not extend the absolute session expiration time.

## 4. Session Events

| Event | Description |
| --- | --- |
| `LOGIN_SUCCESS` | Simulated authentication succeeds. |
| `LOGIN_FAILURE` | Simulated authentication fails. |
| `LOCK_REQUESTED` | A lock is required by policy or user action. |
| `INACTIVITY_TIMEOUT` | Foreground inactivity threshold is exceeded. |
| `APP_BACKGROUND` | Application leaves the foreground. |
| `APP_FOREGROUND` | Application returns to the foreground. |
| `BIOMETRIC_SUCCESS` | Local biometric adapter reports success. |
| `BIOMETRIC_FAILURE` | Local biometric adapter reports failure. |
| `BIOMETRIC_CANCELLED` | Local biometric prompt is cancelled. |
| `BIOMETRIC_UNAVAILABLE` | Local biometric capability is unavailable. |
| `SESSION_EXPIRED` | Session lifetime is exceeded. |
| `LOGOUT` | User requests session termination. |
| `APPLICATION_RESTART` | Application initializes after process restart. |

## 5. Transition Table

| Current State | Event | Guard | Next State |
| --- | --- | --- | --- |
| `SIGNED_OUT` | `LOGIN_SUCCESS` | Login accepted | `ACTIVE` |
| `SIGNED_OUT` | `LOGIN_FAILURE` | Always | `SIGNED_OUT` |
| `ACTIVE` | `LOCK_REQUESTED` | Session valid | `LOCKED` |
| `ACTIVE` | `INACTIVITY_TIMEOUT` | Session valid | `LOCKED` |
| `ACTIVE` | `APP_BACKGROUND` | Session valid | `LOCKED` |
| `ACTIVE` | `SESSION_EXPIRED` | Always | `EXPIRED` |
| `LOCKED` | `BIOMETRIC_SUCCESS` | Session valid and request current | `ACTIVE` |
| `LOCKED` | `BIOMETRIC_FAILURE` | Session valid | `LOCKED` |
| `LOCKED` | `BIOMETRIC_CANCELLED` | Session valid | `LOCKED` |
| `LOCKED` | `BIOMETRIC_UNAVAILABLE` | Session valid | `LOCKED` |
| `LOCKED` | `SESSION_EXPIRED` | Always | `EXPIRED` |
| `EXPIRED` | `LOGIN_SUCCESS` | New login accepted | `ACTIVE` |
| `EXPIRED` | `BIOMETRIC_SUCCESS` | Always | `EXPIRED` |
| Any state | `LOGOUT` | Always | `SIGNED_OUT` |
| Any state | `APPLICATION_RESTART` | Always | `SIGNED_OUT` |
| `LOCKED` | `APP_FOREGROUND` | Session valid | `LOCKED` |
| `LOCKED` | `APP_FOREGROUND` | Absolute deadline reached | `EXPIRED` |

For an existing session whose absolute deadline has passed, expiration must be evaluated before any event that could reuse or unlock that session. A successful new login after expiration establishes a fresh session with a new deadline.

An attempted transition that is not explicitly permitted must not grant protected access.

## 6. Transition Guards

### 6.1 Session Validity

A simulated session is valid only when:

- A successful login established the session.
- Its absolute expiration deadline has not passed.
- Its session metadata is internally consistent.
- The application has not explicitly invalidated it.

Invalid session metadata must not be interpreted as valid.

### 6.2 Biometric Unlock

Biometric success may transition `LOCKED` to `ACTIVE` only when:

- The current session remains valid.
- The state is still `LOCKED`.
- Reauthentication is permitted by policy.
- The result belongs to the current authentication request.
- The application is in the foreground.

A biometric result returned after logout, expiration, or a superseding authentication attempt must not reactivate the session.

### 6.3 Login

Successful simulated login creates a new session identity and a new absolute expiration deadline.

A failed login does not establish an authenticated session.

### 6.4 Logout

Logout invalidates the current simulated session and pending reauthentication requests.

Protected navigation must become unavailable immediately.

## 7. Foreground and Background Behavior

### Background

When an active application enters the background:

1. Privacy-sensitive information must be obscured where supported.
2. The application requests a transition to `LOCKED`.
3. Pending biometric results must not automatically restore access.
4. The absolute expiration deadline remains unchanged.

Actual operating-system screen capture behavior must be verified separately.

### Foreground

When the application returns to the foreground:

1. Evaluate the absolute session expiration deadline.
2. If expired, transition to `EXPIRED`.
3. Otherwise preserve `LOCKED` if local reauthentication is required.
4. Do not display protected information until the session is `ACTIVE`.

Repeated lifecycle events must not unlock a protected session.

## 8. Foreground Inactivity

The application tracks relevant user activity through an abstracted time source.

When the inactivity threshold is exceeded:

- An `ACTIVE` session transitions to `LOCKED` if still valid.
- An expired session transitions to `EXPIRED`.
- An existing `LOCKED` state remains locked unless the absolute deadline has passed.

Inactivity must never extend the absolute lifetime of a session.

Tests should use a controllable clock rather than real waiting periods.

Clock discontinuities, invalid timestamps, or inconsistent time metadata must not grant access.

## 9. Application Restart and Restoration

V1 does not persist an authenticated session across process restarts.

On application initialization:

- Session state is `SIGNED_OUT`.
- Previous session identifiers are not treated as authorization.
- Stored synthetic preferences must not restore protected access.
- Any pending authentication result from a previous runtime is invalid.

This conservative restoration policy avoids relying on local storage as proof of remote session validity.

## 10. Failure and Recovery Scenarios

### Biometric Cancellation

The session remains `LOCKED`.

### Biometric Failure

The session remains `LOCKED`.

### Biometric Unavailability

The application reports unavailability and remains `LOCKED`.

A new simulated login may be offered through an explicit logout or session replacement flow, but must not be confused with biometric success.

### Secure Storage Failure

A storage failure must not activate a signed-out, expired, or locked session.

### Invalid Session Metadata

The application invalidates the affected session and denies protected access.

### Unknown Event or State

Unknown events must not grant protected access. Unknown or inconsistent states must trigger safe session invalidation.

## 11. Security Invariants

The following invariants must hold:

1. Only `ACTIVE` permits access to protected features.
2. `EXPIRED` cannot transition to `ACTIVE` through biometrics alone.
3. A cancelled biometric operation never unlocks a session.
4. An outdated asynchronous result never restores access.
5. Background transitions never directly unlock a session.
6. Session restoration after restart never assumes authentication.
7. Absolute expiration takes precedence over reauthentication success.
8. Logout invalidates the previous session.
9. Invalid or unknown session metadata never authorizes access.
10. UI rendering cannot override the effective session state.

## 12. Verification Scenarios

| Test ID | Scenario | Expected Result |
| --- | --- | --- |
| SESSION-001 | Successful simulated login | `ACTIVE` |
| SESSION-002 | Failed simulated login | `SIGNED_OUT` |
| SESSION-003 | Active session enters background | `LOCKED` |
| SESSION-004 | Valid locked session passes biometrics | `ACTIVE` |
| SESSION-005 | Biometric authentication cancelled | `LOCKED` |
| SESSION-006 | Biometric authentication fails | `LOCKED` |
| SESSION-007 | Biometric capability unavailable | `LOCKED` |
| SESSION-008 | Session expires while locked | `EXPIRED` |
| SESSION-009 | Biometric result arrives after expiration | Remains `EXPIRED` |
| SESSION-010 | Foreground inactivity threshold exceeded | `LOCKED` |
| SESSION-011 | Absolute session deadline exceeded | `EXPIRED` |
| SESSION-012 | User logs out from active session | `SIGNED_OUT` |
| SESSION-013 | Pending biometric result arrives after logout | Remains `SIGNED_OUT` |
| SESSION-014 | Application restarts | `SIGNED_OUT` |
| SESSION-015 | Corrupted session metadata | Protected access denied |
| SESSION-016 | Repeated background/foreground events | No unauthorized unlock |
| SESSION-017 | Unknown state or event | Protected access denied |
| SESSION-018 | New successful login after expiration | New `ACTIVE` session |
| SESSION-019 | Absolute deadline reached exactly at `expiresAt` | `EXPIRED`; protected access denied |

Additional tests should verify deadline boundary conditions and ordering of asynchronous events.

## 13. Implementation Status — Issue #5

**Verification date:** 2026-10-23

The deterministic session state machine has been implemented in the TypeScript domain layer.

### Implemented Behavior

- Four explicit states: `SIGNED_OUT`, `ACTIVE`, `LOCKED`, and `EXPIRED`.
- Simulated login with internally generated session identifiers.
- Absolute session expiration and inactivity-based access restrictions.
- Explicit locking, logout, and simulated application restart.
- Foreground/background event handling at the domain level.
- Simulated reauthentication with request identity validation.
- Rejection of expired, stale, cancelled, and superseded authentication results.
- Session metadata and internal identity consistency checks.
- Deterministic session and reauthentication counters.

### Automated Verification

- `__tests__/session/session-policy.test.ts`
- `__tests__/session/session-machine.test.ts`

Local validation completed with 31 passing tests across three Jest suites, including the two existing HomeScreen tests.

### Implementation Boundaries

This implementation is limited to deterministic application logic.

- Native biometric authentication is not integrated.
- React Native AppState is integrated through an application adapter, but native Android and iOS lifecycle behavior has not been verified on physical devices.
- Session state is not persisted or restored from secure storage.
- The domain state machine does not verify credentials. Issue #10 introduces an application-level mock identity adapter, which accepts only configured synthetic demonstration values. No real identity verification or backend authentication is performed.
- Session and reauthentication identifiers are deterministic, predictable, and not suitable as production authentication tokens.
- Identifier uniqueness is limited to the lifetime of the state-machine instance.
- Reauthentication request identifiers currently follow a machine-defined sequence that the caller must supply.
- No server-side session validation or authorization is performed.

The domain tests support simulated control verification only. Native platform behavior requires separate implementation and testing.

### Application Integration — Issue #7

The session coordinator connects the deterministic domain model with application events and a controllable clock.

React Native AppState changes and session deadlines are handled through separate infrastructure adapters.

The interface derives protected-content visibility from `canAccessSession`, rather than relying solely on the displayed session status.

Verification includes automated integration tests and manual Expo web testing.

The application integration remains simulated and does not establish device-level security guarantees.

### Simulated Identity Integration — Issue #10

The UI delegates authentication attempts to an application-level login use case.

The use case invokes an injected identity adapter and dispatches LOGIN_SUCCESS only after receiving a valid accepted result, provided the attempt remains current and the session is eligible for login.

Request correlation and cancellation prevent obsolete asynchronous results from establishing sessions after lifecycle changes, logout, replacement attempts, or component disposal.

The implementation uses publicly documented fictional credentials. It does not provide production authentication, cryptographic identity assurance, or server-side authorization.

## 14. Security Limitations

The state machine demonstrates local application behavior only.

It does not provide:

- Server-side session validation.
- Production identity verification.
- Remote transaction authorization.
- Protection against a fully compromised operating system.
- Real device attestation.
- Guarantees that all screenshots or system previews are prevented.

Production systems require additional server-side and platform-specific security controls.

## 15. Relationship to Other Documents

- [Architecture Overview](overview.md)
- [OWASP MASVS](https://mas.owasp.org/MASVS/)

The threat model and security control mapping will reference these state transitions and test identifiers.
