
# Secure Mobile Banking Lab — V1 Architecture Overview

**Status:** Proposed
**Tracking issue:** #1
**Project:** Secure Mobile Banking Lab (SMBL)

## 1. Purpose

Secure Mobile Banking Lab is an independent React Native security reference application demonstrating how mobile financial applications can manage authentication, session lifecycle, local reauthentication, protected storage, and privacy-sensitive interfaces.

The project uses exclusively fictional financial data and independently developed examples.

SMBL is an educational engineering lab, not a production banking application, security-certified solution, or real identity management system.

## 2. Problem Statement

A mobile banking application can provide a functional login experience while still mishandling important security scenarios:

- A previously authenticated session remains accessible after prolonged inactivity.
- Sensitive information remains visible when the application enters the background.
- Biometric authentication is confused with server-side user authorization.
- Session state is incorrectly restored after an application restart.
- Local storage failures or biometric cancellations are handled insecurely.
- Device trust is assumed without reliable supporting evidence.

SMBL V1 demonstrates explicit and testable approaches to these problems.

## 3. V1 Scope

The initial implementation will demonstrate:

1. Simulated authentication using fictional credentials.
2. Explicit session states: `SIGNED_OUT`, `ACTIVE`, `LOCKED`, and `EXPIRED`.
3. Session locking and expiration policies.
4. Foreground and background lifecycle handling.
5. Local biometric reauthentication through an abstracted adapter.
6. Secure storage of limited synthetic session-related values.
7. Privacy-aware rendering of fictional financial information.
8. Simulated device trust and device context indicators.
9. Platform-dependent screen capture protection where supported.
10. Automated tests, security documentation, and reproducible verification evidence.

All controls must clearly distinguish simulated behavior from functionality verified on an actual mobile platform.

## 4. Architecture

The application follows a lightweight modular architecture with four conceptual layers.

### 4.1 Presentation Layer

Responsibilities:

- Render public and protected screens.
- Display session and authentication states.
- Present fictional financial information.
- Collect user interactions.
- Apply privacy-aware UI rendering.
- Enforce navigation restrictions based on the effective session state.

Technologies:

- React Native
- TypeScript
- Expo Router

The presentation layer must not independently decide that a locked or expired session is authorized.

### 4.2 Application Layer

Responsibilities:

- Coordinate simulated login and logout.
- Manage session lifecycle use cases.
- Handle lock, unlock, and expiration requests.
- Coordinate biometric reauthentication.
- Apply privacy policies.
- Communicate with platform adapters through interfaces.

Business flows must remain testable without requiring actual biometric hardware.

### 4.3 Domain Layer

Responsibilities:

- Define session states and valid transitions.
- Define security policies and invariants.
- Represent simulated device trust information.
- Describe authentication and session outcomes.

The domain layer must not depend directly on Expo, React Native, or operating-system APIs.

### 4.4 Infrastructure Layer

Responsibilities:

- Provide a simulated identity adapter.
- Integrate with native biometric APIs.
- Implement secure storage adapters.
- Observe application lifecycle events.
- Provide screen protection functionality where supported.
- Expose deterministic mock adapters for automated tests.

Platform-specific implementation details must remain isolated from domain policies.

## 5. Session Model

The application recognizes four states:

| State | Meaning |
| --- | --- |
| `SIGNED_OUT` | No active simulated session exists. |
| `ACTIVE` | A valid simulated session permits access to protected screens. |
| `LOCKED` | A session exists, but protected access requires permitted local reauthentication. |
| `EXPIRED` | The session is no longer valid; a new simulated login is required. |

Initial security rules:

- The application starts without assuming an authenticated session.
- Successful simulated login may transition to `ACTIVE`.
- A lock condition may transition an active session to `LOCKED`.
- Successful local reauthentication may unlock a still-valid session.
- Cancelled or failed reauthentication must not unlock the session.
- Expiration invalidates the session, regardless of biometric success.
- Logout removes access to protected screens.
- A stored value alone must not restore an `ACTIVE` session.
- Unknown or inconsistent session states must deny access to protected screens.

Detailed events, guards, and transition rules will be defined in `session-state-machine.md`.

## 6. High-Level Data Flows

### 6.1 Simulated Login

1. The user enters fictional credentials.
2. The presentation layer calls an authentication use case.
3. The application layer invokes a mock identity adapter.
4. The adapter returns a deterministic success or failure.
5. On success, the application establishes a simulated session.
6. Protected navigation becomes available only when the session is `ACTIVE`.

No external identity provider or banking service is contacted.

### 6.2 Background and Foreground

1. The application observes a lifecycle transition.
2. The application layer records relevant time information through a clock abstraction.
3. Session policy evaluates whether locking or expiration is required.
4. The effective session state is updated.
5. Protected screens remain inaccessible whenever the state is not `ACTIVE`.

The specific lifecycle timing and enforcement rules will be defined in the session state machine document.

### 6.3 Biometric Reauthentication

1. An eligible `LOCKED` session requests local reauthentication.
2. The application calls the biometric adapter.
3. The adapter returns success, cancellation, unavailability, or failure.
4. The application evaluates the result together with session validity.
5. Only a successful, policy-permitted result may restore `ACTIVE`.

Local biometric success does not establish server-side identity or authorize financial transactions.

### 6.4 Synthetic Data and Storage

1. Fictional financial information is supplied by local mock data sources.
2. Display values are treated as privacy-sensitive for demonstration purposes.
3. Only explicitly approved synthetic session-related values may be stored.
4. Passwords, production credentials, real access tokens, and customer data must never be stored.
5. Failed, missing, or invalidated storage reads must not grant protected access.

Secure storage is not treated as an authoritative server-side session validator.

## 7. Trust Boundaries

| Boundary | Security consideration |
| --- | --- |
| UI to application logic | UI state alone must not authorize protected functionality. |
| Application to mock identity provider | Mock authentication proves only simulated behavior. |
| JavaScript to native platform adapters | Native APIs may fail, be unavailable, or behave differently by platform. |
| Application to OS-protected storage | Data availability, persistence, and biometric invalidation require explicit handling. |
| Rendered application to OS screen capture mechanisms | Protection may vary across platforms and cannot guarantee universal prevention. |
| Public repository to development environment | No proprietary code, secrets, real financial data, or employer configurations are permitted. |

The complete threat analysis will be documented separately.

## 8. Technology Decisions

Proposed technology baseline:

- React Native and TypeScript
- Expo and Expo Router
- Expo Local Authentication
- Expo SecureStore
- Expo ScreenCapture
- React Native AppState
- Jest and React Native Testing Library
- GitHub Actions

Exact package versions will be selected during application initialization.

Native security behavior requires platform-specific verification. Automated mock tests alone are not sufficient to validate OS-enforced protections.

## 9. Security Design Principles

- Deny protected access when session validity is unknown.
- Separate local device authentication from remote authorization.
- Avoid storing unnecessary data.
- Never use real financial information.
- Keep security decisions independent from UI rendering.
- Handle cancelled, failed, and unavailable native operations explicitly.
- Make session expiration deterministic and testable.
- Document platform-specific limitations.
- Avoid claims of real device attestation.
- Distinguish implemented, simulated, planned, and device-verified controls.

## 10. Explicit Non-Goals

V1 does not implement:

- Real banking accounts, payments, or transfers.
- Production authentication or identity providers.
- Remote authorization or backend session validation.
- Real fraud detection or financial risk scoring.
- Production device attestation.
- Production certificate pinning.
- Universal screenshot prevention.
- Real customer data processing.
- Claims of OWASP MASVS certification or compliance.
- Production deployment to a financial institution.

Certificate pinning and advanced mobile integrity techniques may be evaluated in future technical documentation.

## 11. Verification Strategy

V1 verification will include:

- Domain and application unit tests.
- Session transition and expiration tests.
- Authentication success, failure, and cancellation tests.
- Secure storage adapter failure scenarios.
- Privacy-related component tests.
- GitHub Actions validation.
- Manual platform verification for native security integrations.
- Threat-to-control-to-test traceability.

Test results must distinguish mock-based evidence from actual device verification.

## 12. OWASP MASVS Alignment

The initial security focus is aligned with the following OWASP MASVS control groups:

- **MASVS-AUTH:** Authentication and authorization.
- **MASVS-STORAGE:** Secure storage of sensitive data.
- **MASVS-PLATFORM:** Secure interaction with the mobile platform.
- **MASVS-PRIVACY:** Protection of user privacy.

Alignment is a design reference only. It does not imply certification, compliance, or successful independent security assessment.

Detailed control mappings and verification status will be maintained in `docs/security-controls.md`.

Reference: https://mas.owasp.org/MASVS/

## 13. Relationship to Fraud Risk Decision Engine

Secure Mobile Banking Lab complements the existing Fraud Risk Decision Engine (FRDE).

FRDE demonstrates explainable backend fraud-risk decisions.

SMBL demonstrates mobile-side authentication, session lifecycle, protected storage, and privacy-aware application behavior.

The projects are independent. SMBL V1 does not integrate with FRDE or reuse its internal implementation.

## 14. Future Work

Potential later enhancements include:

- Documented certificate pinning integration patterns.
- More advanced simulated device trust policies.
- Accessibility and usability evaluation of security flows.
- Additional platform security testing.
- Optional demonstration integration with a synthetic backend.

These items are not commitments for V1.
