# Secure Mobile Banking Lab

**A React Native security reference project focused on authentication, session lifecycle protection, secure storage, biometric reauthentication, and privacy-aware mobile interfaces.**

Secure Mobile Banking Lab (SMBL) is an independent, educational project exploring security patterns relevant to mobile financial applications.

The project demonstrates how authentication, session management, native platform capabilities, and privacy controls can be designed, implemented, tested, and documented in a controlled environment.

SMBL is not a production banking application or a security-certified product.

## Project Status

**Current phase: V1 simulated identity, session lifecycle, and fail-closed storage boundary integration**

The initial Expo and React Native application is operational in a web development environment.

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
- Local verification with 103 passing Jest tests across 13 suites.

The GitHub Actions workflow was successfully verified on PR #4 and main. Subsequent implementation changes must pass CI on their respective pull requests.

The domain-level session protection logic is implemented and tested using simulated events and synthetic data.

Production credential verification, backend authentication, server-side authorization, native device lifecycle verification, biometrics, secure storage, and operating-system security enforcement remain pending.

The current storage adapter is memory-only. It does not persist data across application restarts and does not provide encryption or operating-system-backed protection.

The default demo starts with no saved preference. The UI displays "Synthetic preference: unavailable" until a valid preference is supplied through an injected adapter.

The storage recovery flow is simulated. It must not be interpreted as native Keychain, Keystore, or production session restoration.

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

Native Android and iOS security behavior has not yet been verified.

Biometrics, protected storage, background privacy controls, and other native integrations will be implemented and evaluated in later issues.

Expo SDK 58 may require development builds rather than the currently available Expo Go application on some physical devices.

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

**Review date:** 2026-10-23

After updating Expo SDK 58 dependencies, both `npm audit` and `npm audit --omit=dev` reported five high-severity findings in the dependency graph.

### Affected Dependencies

| Dependency | Advisory | Status |
| --- | --- | --- |
| `node-forge` | [GHSA-86w9-cpqp-85rv](https://github.com/advisories/GHSA-86w9-cpqp-85rv) | Unresolved; no patched version published |
| `zod` | [GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5) | Patched upstream in version 4.6.6; compatible transitive update pending |

`node-forge@1.4.0` is introduced through `expo` and `@expo/cli`, both directly and through `@expo/code-signing-certificates`.

`zod@3.25.76` is introduced through `@expo/cli` and separately through `eslint-config-expo` and `eslint-plugin-react-hooks`.

Dependency audit findings do not independently establish that vulnerable code paths are reachable in the mobile application.

The audit count includes findings propagated through dependency relationships and does not establish five independently exploitable application vulnerabilities.

### Risk Assessment

- The project is an educational demonstration using synthetic data.
- No production credentials, customer information, or production signing material are used.
- The application does not intentionally implement cryptographic signature verification through node-forge.
- Reachability of vulnerable upstream code paths has not been fully assessed.
- The reported findings remain unresolved in the installed dependency graph.
- `npm audit fix --force` proposes an incompatible Expo downgrade and is not an approved mitigation.

Avoiding sensitive production data reduces potential exposure but does not eliminate the vulnerabilities.

### Follow-up

Dependency remediation and risk reassessment are tracked in [Issue #8](https://github.com/dannydj/secure-mobile-banking-lab/issues/8).

The findings must be reassessed before any production use or claim of release readiness.

## Security Documentation

| Document | Description |
| --- | --- |
| [Architecture Overview](docs/architecture/overview.md) | System boundaries, layers, responsibilities, and data flows |
| [Session State Machine](docs/architecture/session-state-machine.md) | Session states, guards, transitions, and verification scenarios |
| [ADR-0001](docs/adr/0001-technology-and-architecture.md) | Technology and architecture decisions |
| [Threat Model](docs/threat-model/threat-model.md) | STRIDE threats, planned mitigations, and residual risks |
| [Security Controls](docs/security-controls.md) | Security control register and OWASP MASVS alignment |

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
