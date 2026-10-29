# Secure Mobile Banking Lab

**A React Native security reference project focused on authentication, session lifecycle protection, secure storage, biometric reauthentication, and privacy-aware mobile interfaces.**

Secure Mobile Banking Lab (SMBL) is an independent, educational project exploring security patterns relevant to mobile financial applications.

The project demonstrates how authentication, session management, native platform capabilities, and privacy controls can be designed, implemented, tested, and documented in a controlled environment.

SMBL is not a production banking application or a security-certified product.

## Project Status

**Current phase: V1 native biometric reauthentication and secure storage integration**

The Expo and React Native application is operational in web development and has been built and functionally verified on an iOS simulator.

Completed foundations:

- Expo SDK 58 with React Native and TypeScript.
- Basic Expo Router navigation and starter screen.
- ESLint and TypeScript validation.
- Jest and React Native Testing Library.
- Two passing component smoke tests.
- GitHub Actions quality workflow configuration.
- Deterministic TypeScript session state machine.
- Explicit session states, transition guards, and access policy.
- Simulated session expiration and reauthentication handling.
- Security-focused domain tests covering expiration, invalid states, and stale authentication results.
- Application-level session coordinator with injectable clock.
- React Native AppState adapter with conservative foreground handling.
- Automatic inactivity and absolute-expiration scheduling.
- Synthetic protected-content rendering governed by session authorization.
- Automated integration tests and manual Expo web lifecycle verification.
- Typed identity adapter contract and synthetic identity implementation.
- Guarded asynchronous login use case with explicit acceptance, rejection, cancellation, and error outcomes.
- UI integration without direct LOGIN_SUCCESS dispatch.
- Concurrent request protection and stale authentication result rejection.
- Automated tests for identity failures, lifecycle transitions, and authentication races.
- Typed storage port with an in-memory adapter and simulated read, write, and removal failures.
- Versioned synthetic preference validation with explicit missing, invalid, expired, and error outcomes.
- Controlled preference saving, loading, updating, and removal.
- Simulated application restart that invalidates session access before reading stored information.
- UI-level restoration of synthetic preferences without granting authentication or protected-content access.
- Expo SecureStore integration through an injectable native storage adapter.
- Platform-specific storage implementations for iOS, Android, and web.
- Native iOS simulator verification of synthetic preference persistence and removal.
- Session access remains denied after application restart, regardless of restored preferences.
- Native biometric reauthentication through Expo LocalAuthentication.
- Explicit biometric success, failure, cancellation, unavailability, and error handling.
- Session and request correlation preventing stale biometric results from authorizing access.
- Safe handling of transient iOS inactive states without bypassing background session protection.
- Fail-closed biometric behavior on web and unsupported platforms.
- Native iOS simulator verification of successful Face ID reauthentication, non-matching attempts, and cancellation.
- Local verification with 155 passing Jest tests across 18 suites.

The GitHub Actions workflow was successfully verified on PR #4 and main. Subsequent implementation changes must pass CI on their respective pull requests.

The domain-level session protection logic is implemented and tested using simulated events and synthetic data.

Production credential verification, backend authentication, server-side authorization, Android runtime verification, physical-device testing, and broader operating-system security enforcement remain pending.

The application uses Expo SecureStore through platform-specific storage adapters on iOS and Android. Synthetic preference persistence and removal have been functionally verified on an iPhone 18 Pro Max simulator running iOS 27.0. Android and physical-device behavior have not yet been verified.

The web implementation uses temporary, non-encrypted in-memory storage and does not persist preferences across page reloads.

When no valid preference exists, the UI displays "Synthetic preference: unavailable". On supported native platforms, a previously saved synthetic preference can be restored after relaunch.

Restoring a synthetic preference never restores an authenticated session. The application requires a new explicit simulated login to access protected synthetic content.

Track development through [GitHub Issues](https://github.com/dannydj/secure-mobile-banking-lab/issues).

## Local Development

### Prerequisites

- Node.js 22.23.4 (see `.nvmrc`).
- npm 10 or a compatible npm version.
- A supported web or mobile development environment.

### Installation

```bash
nvm use
npm ci
```

### Run the Application

```bash
npm run web
```

The web version demonstrates simulated login, protected synthetic content, locking, inactivity expiration, and logout. Web execution does not verify native mobile security capabilities.

### Quality Checks

```bash
npm run lint
npm run typecheck
npm test
npx expo install --check
```

GitHub Actions is configured to execute the same checks on pull requests targeting `main` and on pushes to `main`.

### Platform Verification

**iOS simulator:** Native Expo development build successfully executed on an iPhone 18 Pro Max simulator running iOS 27.0.

Verified functionality includes:

- Synthetic preference persistence and removal using Expo SecureStore.
- Native Expo LocalAuthentication flow using simulated Face ID responses to reauthenticate a valid locked synthetic session.
- Protected-content restoration after successful local biometric verification.
- Continued session locking after non-matching Face ID attempts and cancellation.
- Safe handling of transient inactive states during native biometric prompts.

**Automated verification:** 154 passing Jest tests across 18 suites.

**Limitations:** The iOS simulator does not verify physical biometric sensors. Android and physical devices have not been functionally verified. Native biometric verification is not equivalent to initial identity verification, server authorization, or security certification.

Native biometric testing on iOS requires a development build rather than Expo Go.

See [Security Controls](docs/security-controls.md#36-native-biometric-reauthentication--issue-17) for detailed observations and limitations.

## Problem Statement

Mobile financial applications require more than a functional login screen.

Security-related failures can arise when applications:

- Continue exposing protected content after entering the background.
- Fail to lock or expire sessions correctly.
- Accept outdated biometric authentication results.
- Confuse local biometric authentication with remote authorization.
- Restore session access from untrusted local information.
- Handle protected storage failures incorrectly.
- Expose sensitive information through application previews or screenshots.
- Assume device trust without reliable verification.

SMBL explores these problems through explicit security policies, testable application logic, and documented platform limitations.

## V1 Objectives

The initial version is designed to demonstrate:

1. Simulated authentication with fictional credentials.
2. Explicit session states and controlled transitions.
3. Absolute session expiration and inactivity policies.
4. Foreground and background session protection.
5. Local biometric reauthentication.
6. Protected storage of limited synthetic session-related values.
7. Privacy-aware presentation of fictional financial information.
8. Simulated device trust indicators.
9. Platform-dependent screen protection.
10. Automated security-focused tests and reproducible evidence.

The implementation will distinguish simulated security behavior from security controls verified through native platform testing.

## Session Lifecycle

V1 defines four session states:

| State | Meaning | Protected Access |
| --- | --- | --- |
| `SIGNED_OUT` | No valid simulated session exists. | Denied |
| `ACTIVE` | A valid session permits protected access. | Allowed |
| `LOCKED` | Local reauthentication is required. | Denied |
| `EXPIRED` | Session validity has ended. | Denied |

Initial demonstration policies:

- Absolute session lifetime: 15 minutes.
- Foreground inactivity timeout: 2 minutes.
- Background transition: immediate session lock.
- Biometric reauthentication: permitted only for eligible, valid locked sessions.
- Application restart: start signed out.
- Expired sessions: require a new simulated login.

These values are educational defaults, not universal banking security requirements.

See the [Session State Machine](docs/architecture/session-state-machine.md) for detailed transitions, guards, and edge cases.

## Architecture

SMBL adopts a lightweight modular architecture:

| Layer | Responsibility |
| --- | --- |
| Presentation | React Native screens, navigation, and privacy-aware rendering |
| Application | Authentication, session lifecycle, and security use cases |
| Domain | Session states, transition rules, and security policies |
| Infrastructure | Native platform adapters and deterministic mock implementations |

The architecture separates application security decisions from UI behavior and operating-system APIs.

See the [Architecture Overview](docs/architecture/overview.md) for the planned design.

## Technology Stack

The proposed V1 technology baseline includes:

- React Native
- TypeScript
- Expo and Expo Router
- Expo LocalAuthentication
- Expo SecureStore
- Expo ScreenCapture
- React Native AppState
- Jest and jest-expo
- React Native Testing Library
- GitHub Actions

## Security Engineering

The security design focuses on:

- Explicit session authorization boundaries.
- Safe handling of asynchronous authentication results.
- Session expiration and lifecycle protection.
- Data minimization and protected storage.
- Biometric error and cancellation handling.
- Privacy-aware rendering.
- Clear separation between simulated trust and verified platform security.

Security design is informed by relevant OWASP Mobile Application Security Verification Standard (MASVS) categories:

- MASVS-AUTH
- MASVS-STORAGE
- MASVS-PLATFORM
- MASVS-PRIVACY

This alignment does not imply formal MASVS compliance, independent assessment, or certification.

## Known Dependency Security Advisories

**Assessment period:** 2026-10-23 to 2026-10-27

The project tracks transitive dependency advisories separately from application-level security controls.

### Audit History

| Date | Audit | Low | High | Total |
| --- | --- | ---: | ---: | ---: |
| 2026-10-23 | Initial audit | Not recorded | 5 | Not recorded |
| 2026-10-27 | `npm audit --omit=dev` | 11 | 3 | 14 |
| 2026-10-27 | `npm audit` | 13 | 3 | 16 |

Audit findings include dependency-chain propagation and do not necessarily represent independent vulnerabilities exploitable in the mobile application.

### Current Dependency Assessment

| Dependency | Installed version | Assessment |
| --- | --- | --- |
| `node-forge` | `1.4.2` | Not flagged by the current audit; outside the affected range of the originally tracked advisory |
| `zod` | `3.25.76` | Advisory remains; the patched Zod 4 release is outside Expo CLI 58.1.16's declared dependency range |
| `deepmerge` | `4.3.1` | Advisory remains; no compatible patched version identified |

An iOS source map inspection examined 1,175 source entries and found no matching paths for `zod`, `deepmerge`, or `node-forge`. This observation is limited to the inspected export and does not establish that vulnerable code paths are unreachable in all execution contexts.

The identified packages are introduced through Expo, Jest, and ESLint dependency chains. No direct imports were found in the application's `src` or `__tests__` directories.

This does not establish that affected code paths are unreachable or absent from every application bundle.

### Risk and Remediation Decision

- Do not use `npm audit fix --force` because the proposed Expo downgrade is incompatible with the current SDK 58 implementation.
- Do not force transitive dependency overrides without compatibility verification.
- Monitor upstream Expo, Jest, and dependency fixes.
- Reassess the dependency tree after compatible updates.
- Do not introduce production credentials, customer data, or signing secrets into the educational project.

The residual dependency risk remains documented and is not considered remediated.

For the detailed baseline, dependency paths, exposure analysis, and remediation decisions, see [Dependency Security Risk Assessment](docs/dependency-risk-assessment.md).

Follow-up is tracked in [Issue #8](https://github.com/dannydj/secure-mobile-banking-lab/issues/8).

These findings must be reassessed before any production use or claim of release readiness.

## Security Documentation

| Document | Description |
| --- | --- |
| [Architecture Overview](docs/architecture/overview.md) | System boundaries, layers, responsibilities, and data flows |
| [Session State Machine](docs/architecture/session-state-machine.md) | Session states, guards, transitions, and verification scenarios |
| [ADR-0001](docs/adr/0001-technology-and-architecture.md) | Technology and architecture decisions |
| [Threat Model](docs/threat-model/threat-model.md) | STRIDE threats, planned mitigations, and residual risks |
| [Security Controls](docs/security-controls.md) | Security control register and OWASP MASVS alignment |
| [Dependency Risk Assessment](docs/dependency-risk-assessment.md) | Third-party dependency advisories, exposure analysis, and residual risk |

The threat model and control register distinguish planned controls from implemented and device-verified behavior.

## Verification Strategy

V1 will use:

- Domain-level unit tests.
- Application use-case tests with deterministic mocks.
- Session expiration and asynchronous race-condition tests.
- React Native component tests.
- GitHub Actions validation.
- Manual native platform verification where required.

Automated tests using mocked native APIs do not prove operating-system security enforcement.

Device verification evidence will document the tested platform, operating-system version, observed results, and limitations.

## Synthetic Data and Confidentiality

All examples, credentials, financial records, account identifiers, and device context signals must be fictional or synthetic.

This repository must not include:

- Real customer information.
- Production credentials or access tokens.
- Proprietary banking source code.
- Internal financial institution configurations.
- Employer or vendor-specific security rules.
- Private endpoints, certificates, or secrets.

The project is independently developed and does not represent any financial institution, employer, or commercial security vendor.

## Explicit Non-Goals

V1 does not implement:

- Real banking transactions or accounts.
- Production identity providers or remote authorization.
- Fraud detection or financial risk scoring.
- Production device attestation.
- Production certificate pinning.
- Universal screenshot prevention.
- Protection against fully compromised devices.
- A production-ready banking security platform.

These boundaries keep V1 focused on demonstrable mobile security engineering patterns.

## Relationship to Fraud Risk Decision Engine

SMBL complements [Fraud Risk Decision Engine](https://github.com/dannydj/fraud-risk-decision-engine), an independent reference implementation for explainable backend fraud-risk decisions.

The projects address different security concerns:

- **FRDE:** Backend fraud-risk evaluation, explainability, and auditability.
- **SMBL:** Mobile authentication, session lifecycle, protected storage, and privacy-aware interfaces.

SMBL V1 does not integrate with FRDE or reuse its implementation.

## Roadmap

Development will proceed through:

1. V1 scope and security architecture.
2. React Native and Expo project initialization.
3. Session state machine implementation.
4. Lifecycle-based session locking and expiration.
5. Protected storage integration.
6. Biometric reauthentication.
7. Privacy and simulated device context controls.
8. Automated and platform verification.
9. V1 documentation and release.

Progress is tracked through GitHub issues and pull requests.

## References

- [OWASP MASVS](https://mas.owasp.org/MASVS/)
- [OWASP MASTG](https://mas.owasp.org/MASTG/)
- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/)
