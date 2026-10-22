
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

All V1 controls start as `PLANNED`.

## 3. Security Control Register

| ID | Security Control | Threats | MASVS Group | Status |
| --- | --- | --- | --- | --- |
| CTRL-001 | Centralized simulated authentication | T-01 | MASVS-AUTH | PLANNED |
| CTRL-002 | Protected access based on effective session state | T-02 | MASVS-AUTH | PLANNED |
| CTRL-003 | Absolute session expiration | T-03, T-09 | MASVS-AUTH | PLANNED |
| CTRL-004 | Stale biometric result rejection | T-04 | MASVS-AUTH | PLANNED |
| CTRL-005 | Safe session restoration and metadata validation | T-05 | MASVS-AUTH, MASVS-STORAGE | PLANNED |
| CTRL-006 | Background locking and content obscuring | T-06 | MASVS-AUTH, MASVS-PLATFORM | PLANNED |
| CTRL-007 | Privacy-aware display and screen protection | T-07 | MASVS-PLATFORM, MASVS-PRIVACY | PLANNED |
| CTRL-008 | Protected storage and error handling | T-08 | MASVS-STORAGE | PLANNED |
| CTRL-009 | Deterministic inactivity and lifecycle policy | T-09 | MASVS-AUTH | PLANNED |
| CTRL-010 | Isolation of simulated device trust signals | T-10 | MASVS-AUTH | PLANNED |
| CTRL-011 | Minimal security event recording | T-11 | MASVS-STORAGE | PLANNED |
| CTRL-012 | Safe biometric failures and recovery | T-12 | MASVS-AUTH | PLANNED |
| CTRL-013 | Synthetic data and repository hygiene | T-13 | MASVS-STORAGE, MASVS-PRIVACY | PLANNED |

MASVS mappings indicate relevant security topics, not complete satisfaction of individual MASVS requirements.

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
