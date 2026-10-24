
# Secure Mobile Banking Lab — V1 Security Controls

- **Status:** Proposed
- **Date:** 2026-10-22
- **Tracking issue:** #1
- **Reference:** OWASP MASVS
- **Scope:** SMBL V1

## 1. Purpose

This document maps the security controls planned for Secure Mobile Banking Lab (SMBL) V1 to identified threats, verification scenarios, and relevant OWASP MASVS categories.

SMBL is an educational mobile security reference implementation using simulated authentication and synthetic financial data.

This document does not claim security certification, complete MASVS compliance, production readiness, or independent assessment.

## 2. Control Status Definitions

| Status | Meaning |
| --- | --- |
| `PLANNED` | Defined but not implemented. |
| `SIMULATED` | Implemented and verified using mocks or synthetic behavior only. |
| `IMPLEMENTED` | Implemented with the intended application or platform integration, but not yet independently verified on a device. |
| `DEVICE_VERIFIED` | Tested on a documented device or emulator, with results and limitations recorded. |

A status indicates evidence for a particular control, not a certification of the application.

A successful mocked test cannot justify `DEVICE_VERIFIED`.

All V1 controls were initially classified as `PLANNED`. Their status is updated only when implementation and verification evidence is available.

## 3. Security Control Register

| ID | Security Control | Threats | MASVS Group | Status |
| --- | --- | --- | --- | --- |
| CTRL-001 | Centralized simulated authentication | T-01 | MASVS-AUTH | SIMULATED |
| CTRL-002 | Protected access based on effective session state | T-02 | MASVS-AUTH | SIMULATED |
| CTRL-003 | Absolute session expiration | T-03, T-09 | MASVS-AUTH | SIMULATED |
| CTRL-004 | Stale biometric result rejection | T-04 | MASVS-AUTH | SIMULATED |
| CTRL-005 | Safe session restoration and metadata validation | T-05 | MASVS-AUTH, MASVS-STORAGE | SIMULATED |
| CTRL-006 | Background locking and content obscuring | T-06 | MASVS-AUTH, MASVS-PLATFORM | SIMULATED |
| CTRL-007 | Privacy-aware display and screen protection | T-07 | MASVS-PLATFORM, MASVS-PRIVACY | PLANNED |
| CTRL-008 | Protected storage and error handling | T-08 | MASVS-STORAGE | PLANNED |
| CTRL-009 | Deterministic inactivity and lifecycle policy | T-09 | MASVS-AUTH | SIMULATED |
| CTRL-010 | Isolation of simulated device trust signals | T-10 | MASVS-AUTH | PLANNED |
| CTRL-011 | Minimal security event recording | T-11 | MASVS-STORAGE | PLANNED |
| CTRL-012 | Safe biometric failures and recovery | T-12 | MASVS-AUTH | PLANNED |
| CTRL-013 | Synthetic data and repository hygiene | T-13 | MASVS-STORAGE, MASVS-PRIVACY | PLANNED |

MASVS mappings indicate relevant security topics, not complete satisfaction of individual MASVS requirements.

### 3.1 Domain Implementation Evidence — Issue #5

**Verification date:** 2026-10-23

The session state machine has been implemented as a deterministic TypeScript domain model.

Implementation:

- `src/domain/session/session.types.ts`
- `src/domain/session/session-events.ts`
- `src/domain/session/session-policy.ts`
- `src/domain/session/session-machine.ts`

Automated verification:

- `__tests__/session/session-policy.test.ts`
- `__tests__/session/session-machine.test.ts`

The local Jest execution completed successfully with 31 passing tests across three test suites, including two existing HomeScreen smoke tests.

| Control | Verified Domain Behavior | Relevant Scenarios |
| --- | --- | --- |
| CTRL-002 | Protected access is denied for non-active, invalid, inactive, or internally inconsistent sessions. | SESSION-010, SESSION-015, SESSION-017 |
| CTRL-003 | Absolute expiration takes precedence over reauthentication and can explicitly invalidate an existing session. | SESSION-008, SESSION-009, SESSION-011, SESSION-019 |
| CTRL-004 | Stale, cancelled, superseded, or invalidated reauthentication results cannot restore session access. | SESSION-009, SESSION-013, SESSION-016 |
| CTRL-005 | Simulated restart resets authenticated state; inconsistent session metadata is rejected. | SESSION-014, SESSION-015, SESSION-017 |

**Verification environment:** Local Jest and TypeScript execution using synthetic data and deterministic timestamps.

**Implementation limitations:**

- Session and reauthentication identifiers use deterministic counters for demonstration and are not cryptographic authentication tokens.
- Counter uniqueness is limited to the lifetime of the session-machine instance.
- Restart behavior is simulated; no persistent storage adapter is integrated.
- Biometric outcomes are simulated events, not native biometric verification.
- No backend authentication, server-side authorization, or native device security enforcement has been verified.
- At the time of Issue #5, CTRL-001 remained PLANNED. Its subsequent simulated implementation is documented under Issue #10.

These results support the SIMULATED status of the applicable domain controls. They do not justify DEVICE_VERIFIED status or OWASP MASVS compliance claims.

### 3.2 Application Lifecycle Evidence — Issue #7

**Verification date:** 2026-10-23

The domain session state machine is integrated with a simulated application lifecycle and a React Native user interface.

Implementation:

- `src/application/session/session-coordinator.ts`
- `src/infrastructure/session/app-state-adapter.ts`
- `src/infrastructure/session/session-deadline-adapter.ts`
- `src/app/index.tsx`

Automated verification:

- `__tests__/session/session-coordinator.test.ts`
- `__tests__/session/app-state-adapter.test.ts`
- `__tests__/session/session-deadline-adapter.test.ts`
- `__tests__/session/session-demo.test.tsx`

Local validation: 47 passing tests across seven Jest suites.

| Control | Verified Behavior | Evidence |
| --- | --- | --- |
| CTRL-002 | Protected synthetic content is rendered only when session access is authorized. | UI integration tests |
| CTRL-003 | Absolute expiration invalidates access, including after delayed lifecycle events. | Deadline adapter tests |
| CTRL-006 | Background transitions lock the session and hide protected synthetic content. | AppState and UI integration tests |
| CTRL-009 | Inactivity deadlines are scheduled and lifecycle events cannot automatically unlock the session. | Deadline and lifecycle tests |

Manual browser verification:

- Environment: local Expo web development application in Chrome.
- Simulated login displayed protected synthetic content while ACTIVE.
- Manual locking hid protected content.
- Switching browser tabs and returning did not automatically unlock the session.
- Inactivity caused the session to lock.
- Logout restored SIGNED_OUT and hid protected content.

**Limitations:**

- Browser observations are not equivalent to native Android or iOS device verification.
- Background timer execution may be delayed or suspended.
- Native operating-system previews and screenshot protection have not been verified.
- No production authentication, native biometric adapter, or secure storage integration is implemented.
- CTRL-006 and CTRL-009 are SIMULATED, not DEVICE_VERIFIED.

The implementation provides educational evidence of session lifecycle handling without claiming full OWASP MASVS compliance.

### 3.3 Simulated Identity Integration — Issue #10

**Verification date:** 2026-10-23

The application integrates an explicit mock identity adapter with a guarded asynchronous login use case.

Implementation:

- `src/application/identity/identity.types.ts`
- `src/application/identity/login-use-case.ts`
- `src/infrastructure/identity/mock-identity-adapter.ts`
- `src/app/index.tsx`

Automated verification:

- `__tests__/identity/mock-identity-adapter.test.ts`
- `__tests__/identity/login-use-case.test.ts`
- `__tests__/session/session-demo.test.tsx`

Local validation: 65 passing tests across nine Jest suites.

Verified behavior:

- Recognized synthetic credentials can establish a simulated session.
- Invalid credentials and malformed input cannot establish a session.
- Adapter errors do not authorize protected content.
- Duplicate requests do not create multiple sessions.
- Results from obsolete login attempts are rejected after logout or background transitions.
- Pending authentication is cancelled when the UI leaves the foreground.
- A new login may begin after returning to the foreground.
- Late authentication results cannot override a newer accepted session.
- Component disposal prevents pending results from establishing access.

**Limitations:**

- Demo credentials are public and are not production secrets.
- The mock adapter performs no real identity verification.
- No backend authentication or server-side authorization is implemented.
- Session identifiers are synthetic and deterministic.
- The domain state machine still accepts typed LOGIN_SUCCESS events from trusted application callers; it does not independently verify identity.
- Native Android and iOS device behavior has not been verified.
- CTRL-001 is SIMULATED, not DEVICE_VERIFIED.

These results support the simulated implementation of CTRL-001 without establishing OWASP MASVS compliance.

## 4. Authentication and Session Controls

### CTRL-001 — Simulated Authentication

**Requirement**

Only an accepted simulated login may establish a new active session.

**Expected behavior**

- Incorrect credentials cannot create an active session.
- Authentication outcomes are explicit.
- Login uses a mock identity adapter.
- Mock responses are never presented as real identity verification.

**Verification:** SESSION-001, SESSION-002, AUTH-001

### CTRL-002 — Protected Session Access

**Requirement**

Protected functionality is accessible only when the effective session state is `ACTIVE`.

**Expected behavior**

- Signed-out, locked, and expired states deny protected access.
- Invalid states do not grant access.
- Navigation state cannot override session authorization rules.

**Verification:** SESSION-015, SESSION-017, UI-001

### CTRL-003 — Absolute Session Expiration

**Requirement**

An existing session cannot be reused after its absolute deadline.

**Expected behavior**

- A valid session expires at its configured deadline.
- Biometric success does not extend the deadline.
- Reauthentication cannot restore an expired session.
- A new accepted login creates a fresh session and deadline.

**Verification:** SESSION-008, SESSION-009, SESSION-011

### CTRL-004 — Stale Biometric Result Rejection

**Requirement**

Outdated authentication responses must not restore protected access.

**Expected behavior**

- Authentication attempts have distinguishable identifiers.
- Logout or expiration invalidates pending requests.
- A superseded request cannot unlock the application.

**Verification:** SESSION-009, SESSION-013, AUTH-002

### CTRL-005 — Safe Session Restoration

**Requirement**

Persisted information must not restore an authenticated session automatically.

**Expected behavior**

- Application restart begins in `SIGNED_OUT`.
- Invalid session metadata denies access.
- Stored preferences do not establish authorization.

**Verification:** SESSION-014, SESSION-015, STORAGE-001

## 5. Mobile Platform Controls

### CTRL-006 — Background Session Protection

**Requirement**

Protected content must not remain intentionally accessible after the application enters the background.

**Expected behavior**

- An active session transitions to `LOCKED`.
- Protected content is obscured.
- Returning to the foreground does not automatically unlock the session.
- Session expiration takes precedence over local reauthentication.

**Verification:** SESSION-003, SESSION-016, UI-002, PLATFORM-001

**Platform limitation**

Operating-system app previews and lifecycle timing require separate device verification.

### CTRL-007 — Privacy-Aware Rendering

**Requirement**

The application minimizes unnecessary exposure of fictional financial information.

**Expected behavior**

- Account identifiers are masked where applicable.
- Privacy-sensitive views avoid unnecessary disclosure.
- Supported platform screen-capture controls are evaluated.
- Unsupported protections are documented rather than assumed.

**Verification:** UI-003, PLATFORM-002

**Platform limitation**

No universal screenshot or screen-recording prevention is claimed.

### CTRL-009 — Inactivity and Lifecycle Policies

**Requirement**

Session lifecycle decisions remain deterministic under repeated or delayed events.

**Expected behavior**

- Foreground inactivity can lock a valid active session.
- Expiration takes precedence over session reuse.
- Repeated lifecycle events never unlock the application.
- Timeout tests use a controllable clock.

**Verification:** SESSION-010, SESSION-011, SESSION-016, SESSION-019

### CTRL-010 — Simulated Device Trust

**Requirement**

Simulated device context signals must not act as authentication authority.

**Expected behavior**

- Device trust indicators are explicitly labeled as simulated.
- A trusted indicator cannot establish a session.
- Device context cannot bypass a locked or expired state.

**Verification:** DEVICE-001, DEVICE-002

**Limitation**

V1 does not implement hardware-backed device or application attestation.

## 6. Storage and Observability Controls

### CTRL-008 — Protected Local Storage

**Requirement**

Only explicitly approved synthetic session-related values may be persisted.

**Expected behavior**

- Protected storage is accessed through an adapter.
- Missing and invalidated values are handled explicitly.
- Storage errors cannot authorize a session.
- Real credentials and customer data are prohibited.

**Verification:** STORAGE-001 through STORAGE-004

**Platform limitation**

Actual protected storage behavior must be evaluated on supported platforms.

### CTRL-011 — Minimal Security Events

**Requirement**

Security-relevant application decisions should be observable without logging sensitive values.

**Expected behavior**

- Events have defined types and outcomes.
- Test identifiers are synthetic.
- Passwords, tokens, biometric details, and sensitive payloads are excluded.

**Verification:** AUDIT-001, AUDIT-002

**Limitation**

Development event records are not production-grade, tamper-resistant audit logs.

### CTRL-012 — Biometric Error Handling

**Requirement**

Failed, cancelled, or unavailable biometric authentication must not unlock a session.

**Expected behavior**

- Cancellation preserves `LOCKED`.
- Failure preserves `LOCKED`.
- Unavailability preserves `LOCKED`.
- Recovery requires a separately defined simulated login flow.

**Verification:** SESSION-005, SESSION-006, SESSION-007, PLATFORM-003

## 7. Repository and Data Protection

### CTRL-013 — Synthetic Data and Source Hygiene

**Requirement**

The public repository must contain no employer, customer, or production banking information.

**Expected behavior**

- All financial fixtures are fictional.
- No production credentials or endpoints are committed.
- Documentation contains no proprietary implementation details.
- Logs and test evidence exclude secrets.
- Public release contents are reviewed before publication.

**Verification:** REPO-001, REPO-002, AUDIT-002

## 8. Verification Evidence

Future implementation issues must record:

| Field | Description |
| --- | --- |
| Control ID | Stable CTRL identifier |
| Threat ID | Related threat from the threat model |
| Test ID | Automated or manual verification |
| Expected Result | Defined security behavior |
| Actual Result | Observed behavior |
| Environment | Mock, emulator, or physical device |
| Platform | Android or iOS, when applicable |
| OS Version | Recorded for native verification |
| Evidence | Test output, report, or sanitized screenshot |
| Limitations | Unverified behavior and residual risks |
| Status | Current control implementation status |

No control may be marked `DEVICE_VERIFIED` based only on Jest, mocked adapters, or documentation.

## 9. Out-of-Scope MASVS Areas

V1 does not comprehensively assess:

- MASVS-CRYPTO
- MASVS-NETWORK
- MASVS-CODE
- MASVS-RESILIENCE

Some aspects may be relevant to later versions.

In particular, certificate pinning, server-side authorization, runtime tampering resistance, and real device attestation are not implemented in V1.

The project must not claim broad OWASP MASVS compliance.

## 10. Maintenance Rules

When implementation begins:

1. Keep stable control and threat IDs.
2. Link tests to their corresponding control IDs.
3. Update control status only after evidence exists.
4. Record implementation limitations.
5. Distinguish mock verification from device verification.
6. Update the threat model when security assumptions change.
7. Avoid removing failed test evidence without explanation.

## 11. References

- [OWASP MASVS](https://mas.owasp.org/MASVS/)
- [OWASP MASTG](https://mas.owasp.org/MASTG/)
- [Threat Model](threat-model/threat-model.md)
- [Session State Machine](architecture/session-state-machine.md)
- [Architecture Overview](architecture/overview.md)
- [ADR-0001](adr/0001-technology-and-architecture.md)
