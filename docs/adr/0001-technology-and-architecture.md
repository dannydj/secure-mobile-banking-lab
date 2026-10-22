
# ADR-0001 — Technology and Architecture Selection

- **Status:** Proposed
- **Date:** 2026-10-22
- **Tracking issue:** #1
- **Project:** Secure Mobile Banking Lab

## 1. Context

Secure Mobile Banking Lab (SMBL) is an independent mobile security reference project.

V1 will demonstrate simulated authentication, deterministic session lifecycle management, local biometric reauthentication, protected storage, privacy-aware rendering, and platform lifecycle handling.

The project must remain reproducible, testable, and independent of real banking infrastructure.

The architecture must support security-focused engineering without introducing unnecessary backend services or native platform maintenance.

## 2. Decision

Use the following technology baseline:

- React Native for mobile application development.
- TypeScript for typed application and domain logic.
- Expo for native integration and development workflows.
- Expo Router for navigation.
- Expo LocalAuthentication for supported local biometric prompts.
- Expo SecureStore for limited protected local storage.
- Expo ScreenCapture for supported screenshot and capture controls.
- React Native AppState for foreground/background observation.
- Jest with jest-expo for automated tests.
- React Native Testing Library for component-level tests.
- GitHub Actions for automated validation.

Package versions will be selected and recorded when the application is initialized.

## 3. Architecture Style

Adopt a lightweight modular architecture with four conceptual layers:

1. Presentation
2. Application
3. Domain
4. Infrastructure

The purpose of these layers is to separate security policies from UI and platform APIs.

This is not intended to become a full enterprise architecture framework.

Introduce interfaces only where they improve testability, isolation, or portability.

### Domain

Contains session states, security policies, transition rules, and simulated device-trust concepts.

It must not depend on React Native or Expo.

### Application

Coordinates authentication, session lifecycle, privacy handling, and calls to platform abstractions.

### Infrastructure

Implements access to platform APIs and deterministic mock services.

### Presentation

Renders screens and user interactions according to application-controlled session state.

Navigation visibility alone is not sufficient to authorize protected functionality.

## 4. Dependency Direction

The intended dependency direction is:

Presentation -> Application -> Domain

Infrastructure provides implementations of interfaces required by the application layer.

Domain policies must not import presentation or infrastructure modules.

The application layer should not depend directly on concrete Expo implementations when a testable abstraction is appropriate.

## 5. Authentication Decision

V1 will use a simulated identity provider with fictional credentials.

Authentication results are deterministic and do not represent real identity verification.

Biometrics are used for local reauthentication only.

Biometric success must not:

- Authorize remote transactions.
- Extend an expired session.
- Restore a signed-out session.
- Override a more recent logout or expiration event.

## 6. Session Management Decision

Use an explicit state machine with:

- SIGNED_OUT
- ACTIVE
- LOCKED
- EXPIRED

Session transitions must use deterministic policy evaluation.

A controllable clock abstraction will support expiration and inactivity tests.

The application will not restore authenticated sessions after process restart in V1.

Unknown, inconsistent, or expired session metadata must not grant protected access.

## 7. Storage Decision

Use Expo SecureStore for approved synthetic session-related values when platform functionality is implemented.

Do not persist:

- Real passwords.
- Production access tokens.
- Customer records.
- Real financial account data.
- Secrets from employers or financial institutions.

Local storage must never become the sole authority for determining whether a session is valid.

Storage failures, unavailable values, and invalidated biometric-protected entries must be handled explicitly.

## 8. Platform Security Decision

Use platform adapters to isolate biometric, storage, application lifecycle, and screen-protection behavior.

Automated mocks demonstrate application behavior, not operating-system security guarantees.

Platform-specific functionality must be verified separately.

Screen-capture protection is best-effort within documented platform capabilities. Universal screenshot prevention is not claimed.

Simulated device-trust indicators must never be described as production device attestation.

## 9. Testing Decision

Use multiple verification levels.

### Domain Tests

Test states, transitions, expiration, guards, and security invariants without React Native dependencies.

### Application Tests

Test workflows with deterministic adapters and controlled time.

### Component Tests

Verify protected rendering, locked screens, privacy behavior, and error handling using React Native Testing Library.

### Platform Verification

Verify native biometric behavior, protected storage, and supported screen protection on suitable devices or emulators.

Document platform, operating-system version, test result, and limitations.

### CI

GitHub Actions will execute linting, type checking, and automated tests.

CI success does not imply that native security controls have been independently verified.

## 10. Alternatives Considered

### React Native CLI

Advantages:

- Direct control over native Android and iOS projects.
- Flexibility for custom native integrations.

Disadvantages for V1:

- Increased platform configuration and maintenance.
- Additional complexity unrelated to the core security demonstration.

Decision: Not selected for V1.

### Expo

Advantages:

- React Native and TypeScript development workflow.
- Documented libraries for the required platform capabilities.
- Development builds for native integration testing.

Trade-offs:

- Some platform behaviors require development builds.
- Native security features have platform-specific limitations.
- Certain future requirements may require custom native code.

Decision: Selected for V1.

### Backend Authentication Service

Advantages:

- Could demonstrate real server-side session validation.
- Could support remote authorization flows.

Disadvantages for V1:

- Introduces infrastructure and operational complexity.
- Expands scope beyond mobile security patterns.
- Risks confusing simulated security controls with production authentication.

Decision: Deferred.

### Global State Management Library

Redux or another dedicated state library could be introduced if complexity justifies it.

For V1, prefer a small, explicit session controller and minimal React state integration.

Decision: No global state library required initially.

## 11. Security and Privacy Constraints

- Use synthetic data only.
- Maintain clear trust boundaries.
- Do not claim production-grade security or formal certification.
- Document all implemented and simulated controls separately.
- Never copy proprietary banking implementations.
- Treat native API failure and asynchronous race conditions as security-relevant.
- Keep logging free from credentials, sensitive values, and unnecessary session metadata.

## 12. Consequences

### Positive

- Clear separation between security rules and platform integrations.
- Testable session lifecycle.
- Limited V1 implementation complexity.
- Reusable reference documentation.
- Direct alignment with mobile security engineering practices.

### Trade-offs

- Simulated authentication cannot prove backend authorization security.
- Mocked tests cannot validate the underlying operating system.
- Some security behavior differs between Android and iOS.
- Documentation must clearly distinguish design intent from verified results.

## 13. Future Reconsideration

Revisit this ADR if the project requires:

- A real demonstration backend.
- Production-style identity integration.
- Hardware-backed device attestation.
- Certificate pinning implementation.
- Native modules unavailable through Expo libraries.
- Additional platform-specific security testing.

Any significant architectural change should receive a separate ADR.

## 14. References

- https://docs.expo.dev/
- https://docs.expo.dev/versions/latest/sdk/local-authentication/
- https://docs.expo.dev/versions/latest/sdk/securestore/
- https://docs.expo.dev/versions/latest/sdk/screen-capture/
- https://docs.expo.dev/develop/unit-testing/
- https://mas.owasp.org/MASVS/
