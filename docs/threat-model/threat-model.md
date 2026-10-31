
# Secure Mobile Banking Lab — V1 Threat Model

- **Status:** Proposed
- **Date:** 2026-10-22
- **Tracking issue:** #1
- **Methodology:** STRIDE
- **Scope:** Secure Mobile Banking Lab V1

## 1. Purpose

This document identifies security threats, trust boundaries, planned mitigations, residual risks, and verification scenarios for Secure Mobile Banking Lab (SMBL).

SMBL is an educational mobile security reference implementation. It uses synthetic data and simulated authentication.

The threats described here are design considerations, not confirmed vulnerabilities. Mitigations remain planned until their implementation and verification are documented.

## 2. System Overview

SMBL is a React Native application demonstrating:

- Simulated authentication.
- Local biometric reauthentication.
- Explicit session lifecycle management.
- Protected storage of limited synthetic values.
- Privacy-aware rendering of fictional financial data.
- Background and foreground security policies.
- Simulated device trust indicators.

V1 contains no real banking backend, production identity provider, transaction processing, or customer data.

## 3. Security Objectives

The primary security objectives are:

- Restrict protected screens to an `ACTIVE` session.
- Prevent expired or invalid sessions from being reactivated through local biometrics.
- Prevent stale asynchronous operations from restoring access.
- Minimize unnecessary persistence of session-related information.
- Limit accidental disclosure of fictional financial information.
- Handle platform security failures without granting unauthorized access.
- Make session security behavior deterministic and testable.
- Document limitations without claiming production-grade protection.

## 4. Assets

| ID | Asset | Security Requirement |
| --- | --- | --- |
| A-01 | Effective session state | Integrity |
| A-02 | Session lifetime and timestamps | Integrity |
| A-03 | Pending authentication requests | Integrity |
| A-04 | Synthetic session metadata | Integrity and limited confidentiality |
| A-05 | Fictional financial information | Privacy protection for demonstration |
| A-06 | Security policy configuration | Integrity |
| A-07 | Native authentication result | Authentic handling of platform responses |
| A-08 | Security event records | Integrity and data minimization |

These assets have educational value. They do not represent production financial assets or real customer information.

## 5. Threat Actors and Assumptions

### 5.1 In-Scope Threat Actors

**Opportunistic device user**

A person gains temporary physical access to a device while an application is active, locked, or transitioning between states.

**Shoulder surfer**

A person observes the device screen and attempts to read displayed information.

**Malicious or unintended application interaction**

Another application or operating-system feature may interact with screenshots, app previews, clipboard content, or lifecycle behavior.

**Unexpected execution behavior**

Race conditions, delayed asynchronous responses, corrupted local values, and platform API errors may lead to incorrect session decisions.

### 5.2 Assumptions

- The application is installed in a controlled development environment.
- Financial information is fictional.
- Authentication uses a mock identity provider.
- The operating system provides platform APIs, but those APIs can fail or be unavailable.
- Native security features may differ between Android and iOS.
- Automated tests can simulate native results but cannot prove OS-level enforcement.

### 5.3 Out-of-Scope Adversary Capabilities

V1 does not claim protection against:

- A fully compromised or rooted/jailbroken operating system.
- Advanced runtime instrumentation.
- Memory extraction by a privileged attacker.
- Modified application binaries.
- Reverse engineering by a well-resourced adversary.
- Attacks against a production backend or identity provider.

These limitations must not be hidden or interpreted as mitigated threats.

## 6. Entry Points and Trust Boundaries

### Entry Points

- Login form.
- Protected navigation requests.
- Biometric prompt results.
- Secure storage read/write results.
- Application background and foreground events.
- Session timeout events.
- Fictional financial data rendering.
- Simulated device context responses.

### Trust Boundaries

| ID | Boundary | Main Concern |
| --- | --- | --- |
| TB-01 | Presentation to application | UI state must not override session policy. |
| TB-02 | Application to mock identity adapter | Mock responses do not prove real user identity. |
| TB-03 | Application to native biometric adapter | Results may be delayed, cancelled, or unavailable. |
| TB-04 | Application to protected storage | Persisted values may be missing, invalidated, or inconsistent. |
| TB-05 | Application to OS lifecycle | App state changes may occur unexpectedly or repeatedly. |
| TB-06 | Application UI to external observation | Displayed information may be visible through screenshots or previews. |
| TB-07 | Application to simulated device context | Synthetic trust signals must not be treated as attestation. |

## 7. STRIDE Threat Register

The following priorities are relative implementation priorities for this educational lab. They are not quantitative vulnerability severity ratings.

### T-01 — Mock Authentication Bypass

- **Category:** Spoofing
- **Priority:** High
- **Assets:** A-01
- **Boundary:** TB-02

**Threat**

A mock identity response or inconsistent login state incorrectly grants access without an accepted simulated authentication.

**Planned Mitigations**

- Centralized authentication use case.
- Explicit login success and failure outcomes.
- Session establishment only after accepted login.
- Protected routes controlled by effective session state.

**Verification**

- SESSION-001
- SESSION-002
- AUTH-001: Invalid mock credentials cannot establish an active session.

**Residual Risk**

Mock authentication does not provide real identity verification.

### T-02 — Unauthorized Session State Transition

- **Category:** Elevation of Privilege
- **Priority:** High
- **Assets:** A-01, A-06
- **Boundary:** TB-01

**Threat**

A navigation event, UI bug, or invalid transition exposes protected functionality while the effective session state is not `ACTIVE`.

**Planned Mitigations**

- Explicit session state machine.
- Centralized transition guards.
- Default-deny behavior for invalid states.
- Protected screen rendering based on effective state.

**Verification**

- SESSION-015
- SESSION-017
- UI-001: Protected screens remain inaccessible while signed out, locked, or expired.

**Residual Risk**

Local route guards are not a substitute for server-side authorization.

### T-03 — Expired Session Reactivation

- **Category:** Elevation of Privilege
- **Priority:** High
- **Assets:** A-01, A-02
- **Boundary:** TB-03

**Threat**

A successful biometric result restores an expired session.

**Planned Mitigations**

- Evaluate the absolute session deadline before biometric unlock.
- Never extend the absolute deadline through biometric success.
- Require new simulated login after expiration.

**Verification**

- SESSION-008
- SESSION-009
- SESSION-011

**Residual Risk**

Device clock manipulation and monotonic-time behavior require careful handling and additional testing.

### T-04 — Stale Authentication Response

- **Category:** Elevation of Privilege
- **Priority:** High
- **Assets:** A-01, A-03
- **Boundary:** TB-03

**Threat**

An asynchronous biometric result arrives after logout, session expiration, or a newer authentication attempt and incorrectly restores access.

**Planned Mitigations**

- Associate authentication results with a current request identifier.
- Invalidate pending requests after logout or expiration.
- Reevaluate effective session state before accepting a result.

**Verification**

- SESSION-009
- SESSION-013
- AUTH-002: A superseded biometric response does not unlock the application.

**Residual Risk**

Native cancellation may not guarantee that callbacks stop executing. Application-level guards remain necessary.

### T-05 — Session Metadata Tampering

- **Category:** Tampering
- **Priority:** High
- **Assets:** A-01, A-02, A-04
- **Boundary:** TB-04

**Threat**

Corrupted, inconsistent, or manipulated locally persisted values are interpreted as proof of a valid session.

**Planned Mitigations**

- Do not restore authenticated sessions from storage.
- Validate all persisted data before use.
- Fail closed when session metadata is inconsistent.
- Keep protected access decisions independent from storage presence.

**Verification**

- SESSION-014
- SESSION-015
- STORAGE-001: Missing or corrupted storage values do not authorize protected access.

**Residual Risk**

Local storage cannot establish remote session validity or resist a fully privileged attacker.

### T-06 — Sensitive Information Exposure During Backgrounding

- **Category:** Information Disclosure
- **Priority:** High
- **Assets:** A-05
- **Boundary:** TB-05, TB-06

**Threat**

Fictional financial information remains visible in application previews or during foreground/background transitions.

**Planned Mitigations**

- Obscure protected content when the application loses focus.
- Lock active sessions on background transition.
- Avoid displaying sensitive content before lifecycle evaluation completes.
- Evaluate applicable platform screen-protection capabilities.

**Verification**

- SESSION-003
- SESSION-016
- UI-002: Protected content is hidden after background transition.
- PLATFORM-001: Document actual app-preview behavior on a supported test device.

**Residual Risk**

Operating-system previews and capture mechanisms vary. Universal screenshot or recording prevention is not guaranteed.

### T-07 — Sensitive Data Exposure Through UI and Screenshots

- **Category:** Information Disclosure
- **Priority:** Medium
- **Assets:** A-05
- **Boundary:** TB-06

**Threat**

Fictional account identifiers and protected synthetic financial information may be unnecessarily exposed through application rendering, screenshots, screen recordings, operating-system application previews, or external observation.

**Implemented Mitigations — Issue #19**

- Mask fictional account identifiers before rendering, exposing only the last four digits when applicable.
- Keep protected synthetic account information hidden unless the existing session authorization policy permits access.
- Hide protected content when the session is `SIGNED_OUT`, `LOCKED`, or `EXPIRED`, and during background transitions.
- Keep privacy-aware presentation logic separate from session authorization decisions.

**Pending Platform Evaluation**

- Document application-switcher preview behavior on the iOS simulator.
- Evaluate screenshot and application-preview behavior on additional supported native platforms, including Android.
- Assess native screen-capture mitigations separately if justified by observed risks.
- Document platform-specific limitations without claiming universal screenshot prevention.

**Verification**

- UI-003: Automated tests verify account identifier masking and protected-content visibility restrictions.
- CTRL-007: Automated tests confirm that fictional account information is hidden when session access is denied.
- **PLATFORM-002 — Partially verified (iOS simulator):** On October 30, 2026, screenshot capture was successfully performed on an iPhone 18 Pro Max simulator running iOS 27.0 while the synthetic session was ACTIVE. The resulting screenshot contained the masked fictional account identifier and synthetic balance. Screenshot prevention was not observed. Application-switcher preview behavior remains pending documented verification.

**Residual Risk**

Privacy-aware masking reduces unnecessary exposure of fictional account identifiers but does not prevent screenshots, screen recordings, external photography, or observation of information intentionally displayed during an authorized session.

Manual iOS simulator verification confirmed that screenshots can capture the masked account identifier and synthetic balance. No native screenshot-blocking mechanism has been implemented or verified. Application-switcher preview protection remains unverified, and results from an iOS simulator cannot be generalized to all physical devices or operating-system versions.

No universal operating-system screen-capture protection is claimed.

### T-08 — Secure Storage Failure Mishandling

- **Category:** Tampering / Information Disclosure
- **Priority:** High
- **Assets:** A-04
- **Boundary:** TB-04

**Threat**

Storage failures, unavailable keys, or invalidated biometric-protected entries cause inconsistent session behavior or unintended data exposure.

**Planned Mitigations**

- Handle read, write, deletion, and invalidation failures explicitly.
- Do not persist passwords or production tokens.
- Do not unlock sessions because a stored value exists.
- Avoid logging storage contents.

**Verification**

- STORAGE-002: Storage read failure is handled safely.
- STORAGE-003: Storage write failure is handled safely.
- STORAGE-004: Invalidated or unavailable stored values do not enable access.

**Residual Risk**

OS-backed storage behavior depends on platform configuration and device state.

### T-09 — Inactivity and Lifecycle Race Conditions

- **Category:** Elevation of Privilege
- **Priority:** High
- **Assets:** A-01, A-02
- **Boundary:** TB-05

**Threat**

Repeated lifecycle events, unusual timing, or inconsistent inactivity calculations result in protected content being exposed.

**Planned Mitigations**

- Use centralized session policy evaluation.
- Apply expiration before permitting session reuse.
- Test deadline boundaries with a controllable clock.
- Make repeated lifecycle events safe and predictable.

**Verification**

- SESSION-010
- SESSION-011
- SESSION-016
- SESSION-018
- SESSION-019: Exact deadline boundary behavior remains secure.

**Residual Risk**

Real-world timing, scheduling, and application suspension behavior require device validation.

### T-10 — Incorrect Trust in Simulated Device Signals

- **Category:** Spoofing
- **Priority:** Medium
- **Assets:** A-06
- **Boundary:** TB-07

**Threat**

A simulated trusted-device indicator may be mistaken for actual operating-system or hardware-backed device attestation, potentially leading to incorrect authentication or authorization decisions.

**Implemented Mitigations — Issue #19**

- Define an injectable device-context port with synthetic `TRUSTED`, `UNTRUSTED`, and `UNAVAILABLE` outcomes.
- Default simulated device trust to `UNAVAILABLE`.
- Clearly label the user interface with `SIMULATED — NOT DEVICE ATTESTATION`.
- Keep device-context information separate from the session state machine and authentication authority.
- Prevent simulated trust values from establishing identity, unlocking sessions, extending expiration, or overriding protected-content access restrictions.
- Avoid collecting real device identifiers, performing device fingerprinting, or persisting simulated device trust.

**Verification**

- DEVICE-001: Automated tests verify that simulated `TRUSTED` cannot bypass `SIGNED_OUT`.
- DEVICE-002: Automated tests verify that simulated `TRUSTED` cannot unlock `LOCKED` or `EXPIRED`.
- UI integration tests verify that background transitions keep protected content hidden regardless of simulated device trust.
- Adapter tests verify the three supported synthetic outcomes and the default `UNAVAILABLE` behavior.

**Residual Risk**

No production device attestation, hardware-backed trust verification, or real device identity validation is implemented. Simulated trust values are educational indicators only and provide no independent security assurance.

Automated tests demonstrate separation of responsibilities but do not constitute native platform attestation verification or OWASP MASVS certification.

### T-11 — Inadequate Security Event Traceability

- **Category:** Repudiation
- **Priority:** Medium
- **Assets:** A-08

**Threat**

Security-related state transitions cannot be understood during testing because their outcomes are not recorded consistently.

**Planned Mitigations**

- Define structured, minimal security events.
- Record event types and outcomes using synthetic identifiers.
- Exclude passwords, biometric details, tokens, and protected values from logs.
- Use deterministic event observation in automated tests.

**Verification**

- AUDIT-001: Expected security event types can be observed in tests.
- AUDIT-002: Logged events exclude sensitive values.

**Residual Risk**

Local development logs are not tamper-proof audit evidence or production security monitoring.

### T-12 — Native Capability Unavailability

- **Category:** Denial of Service
- **Priority:** Medium
- **Assets:** A-01, A-07
- **Boundary:** TB-03

**Threat**

Unavailable biometric hardware, denied permissions, or native API errors prevent legitimate reauthentication or trigger unsafe fallback behavior.

**Planned Mitigations**

- Explicitly model cancellation, error, and unavailable outcomes.
- Keep the application locked after unsuccessful reauthentication.
- Provide a separate simulated login recovery flow.
- Never treat API failure as authentication success.

**Verification**

- SESSION-005
- SESSION-006
- SESSION-007
- PLATFORM-003: Device-specific biometric unavailability behavior is documented.

**Residual Risk**

Platform-specific error codes and biometric enrollment changes may require additional handling.

### T-13 — Accidental Disclosure in Source or Logs

- **Category:** Information Disclosure
- **Priority:** Medium
- **Assets:** A-04, A-08

**Threat**

Development artifacts accidentally contain real financial information, credentials, personal data, or proprietary implementation details.

**Planned Mitigations**

- Use exclusively fictional and synthetic values.
- Keep examples independent of financial institutions.
- Review committed configuration and fixture data.
- Exclude secret values and unnecessary payloads from logs.
- Review public documentation before release.

**Verification**

- REPO-001: Source and fixtures contain no actual credentials or customer information.
- REPO-002: Documentation contains no proprietary bank configurations.
- AUDIT-002: Sensitive values are excluded from logs.

**Residual Risk**

Automated scanning cannot guarantee detection of every accidental disclosure.

## 8. Threat Prioritization

The initial V1 implementation order should prioritize:

1. Session authorization invariants.
2. Expiration and asynchronous authentication guards.
3. Lifecycle locking and sensitive-content hiding.
4. Storage failure handling.
5. Biometric failure and unavailable-state behavior.
6. Device context and privacy demonstrations.
7. Security event observability.

This ordering reflects the educational scope and expected impact of incorrect session behavior.

It is not a formal organizational risk assessment.

## 9. Security Control Mapping

| Control | Threats | Planned Verification |
| --- | --- | --- |
| Centralized session state machine | T-01, T-02, T-03, T-09 | SESSION tests |
| Current-request validation | T-04 | AUTH-002, SESSION-013 |
| Non-restoration of active sessions | T-05 | SESSION-014, STORAGE-001 |
| Background lock and privacy overlay | T-06, T-09 | UI-002, PLATFORM-001 |
| Privacy-aware rendering | T-07 | UI-003, PLATFORM-002 |
| Explicit storage error handling | T-05, T-08 | STORAGE tests |
| Separation of simulated trust signals | T-10 | DEVICE tests |
| Minimal structured security events | T-11, T-13 | AUDIT tests |
| Safe biometric failure handling | T-04, T-12 | SESSION-005 through SESSION-007 |
| Public repository data review | T-13 | REPO tests |

These controls are proposed. No implementation or successful test result is implied by this table.

## 10. OWASP MASVS Alignment

The primary relevant control groups are:

| Category | V1 Focus |
| --- | --- |
| MASVS-AUTH | Local authentication flows, session handling, and authorization boundaries |
| MASVS-STORAGE | Protected storage and data minimization |
| MASVS-PLATFORM | Native platform interactions and lifecycle-related security |
| MASVS-PRIVACY | Privacy-aware rendering and information disclosure reduction |

Other MASVS groups may be relevant in production systems but are not comprehensively assessed by this V1 lab.

This mapping represents design alignment, not compliance certification or independent verification.

Detailed control status will be maintained in `docs/security-controls.md`.

## 11. Verification Evidence Requirements

Each implemented security control should produce evidence containing:

- Related threat ID.
- Related test or verification ID.
- Expected behavior.
- Actual observed behavior.
- Automated or manual verification method.
- Platform and OS version when applicable.
- Result and limitations.

The evidence must distinguish:

- Planned controls.
- Simulated controls.
- Implemented controls.
- Device-verified controls.

A successful mocked test must never be labeled as proof of OS-level security enforcement.

## 12. Residual Risks and Limitations

Even after V1 is complete, the project will not guarantee:

- Protection against compromised operating systems.
- Production identity or transaction authorization.
- Secure behavior of real financial APIs.
- Prevention of all screenshot or recording mechanisms.
- Resistance to advanced reverse engineering.
- Hardware-backed device attestation.
- Production-grade audit integrity.
- Complete OWASP MASVS compliance.

The application uses synthetic data and is intended to demonstrate engineering practices rather than production security assurances.

## 13. Review Triggers

Review this threat model when:

- New authentication mechanisms are introduced.
- Session policies change.
- New native libraries are added.
- Data persistence requirements change.
- A backend or external service is introduced.
- Device trust or attestation behavior changes.
- New platform-specific risks are discovered.
- Automated or manual verification contradicts an existing assumption.

Threat IDs should remain stable so tests and documentation can reference them.

## 14. References

- [OWASP MASVS](https://mas.owasp.org/MASVS/)
- [OWASP MASTG](https://mas.owasp.org/MASTG/)
- [Architecture Overview](../architecture/overview.md)
- [Session State Machine](../architecture/session-state-machine.md)
- [ADR-0001](../adr/0001-technology-and-architecture.md)
