# Dependency Security Risk Assessment — Issue #8

| Environment | Value |
| --- | --- |
| Assessment date | 2026-10-27 |
| Branch | `chore/issue-8-dependency-audit` |
| Node.js | `22.23.4` |
| npm | `10.9.9` |
| Expo SDK | `58` |

## Audit Baseline

| Audit | Low | High | Total |
| --- | ---: | ---: | ---: |
| npm audit --omit=dev | 11 | 3 | 14 |
| npm audit | 13 | 3 | 16 |

These findings include propagation through dependency relationships and do not represent independently confirmed exploitable vulnerabilities in the application.

## Dependency Assessment

### node-forge

- Installed version: 1.4.2.
- Introduced through Expo CLI and certificate-related tooling.
- The original advisory identifies affected versions through 1.4.0.
- The installed version is outside that reported range.
- The current npm audit does not flag node-forge.
- No independent cryptographic verification was performed.

### zod

- Installed version: 3.25.76.
- Introduced through Expo CLI and ESLint tooling.
- Advisory: GHSA-mrhx-c7xc-m3w5.
- Patched upstream version: 4.6.6.
- Expo CLI 58.1.16 requires zod ^3.25.76.
- A forced override to Zod 4 is not approved without demonstrated compatibility.

### deepmerge

- Installed version: 4.3.1.
- Introduced through @expo/config and jest-config.
- Advisory: GHSA-gcqx-w48m-w2h4.
- The latest npm registry version observed is 4.3.1.
- No compatible patched release has been identified.

## Exposure Assessment

- No direct imports of zod, deepmerge, or node-forge were found in src or __tests__.
- The identified packages belong to upstream tooling dependency chains.
- Absence of direct imports does not prove runtime unreachability.
- Native application bundle inclusion and affected code-path reachability have not been conclusively established.
- The application uses synthetic data and does not process real banking credentials or customer records.

## iOS Bundle Source Map Inspection

**Inspection date:** 2026-10-27

A production-mode iOS export was generated with Expo SDK 58.

The normal export produced a Hermes bytecode bundle (`.hbc`).
A separate debugging export was generated with JavaScript and source maps for dependency inspection.

The source map used an indexed structure with 1,175 sections and 1,175 source entries.

Source path inspection results:

| Dependency | Matching source entries |
| --- | ---: |
| zod | 0 |
| deepmerge | 0 |
| node-forge | 0 |

No source paths for these three dependencies were identified in the inspected iOS export.

One Expo CLI-related module (`@expo/cli/build/metro-require/require.js`) was present, so the results must not be interpreted as complete exclusion of Expo CLI.

### Interpretation and Limitations

- The results apply only to the inspected iOS export.
- Source path inspection is not a complete binary or vulnerability analysis.
- Absence of matching paths does not conclusively prove absence of vulnerable logic.
- Development tooling, build-time execution, and other platforms were not independently assessed.
- No direct exploitability or complete unreachability determination has been established.
- The existing npm audit findings remain unresolved.

The analysis supports a narrower assessment of potential runtime exposure without claiming vulnerability remediation.

## Remediation Decision

- Do not run npm audit fix --force.
- Do not downgrade Expo SDK 58.
- Do not force incompatible transitive dependency versions.
- Monitor compatible upstream fixes.
- Reassess advisories after relevant Expo, Jest, or dependency releases.
- Preserve normal quality checks and document remaining findings.

## Residual Risk

The dependency audit findings remain open.

No exploitation has been demonstrated in SMBL. No claim is made that the vulnerable code paths are unreachable, that the application is free of dependency vulnerabilities, or that the project satisfies OWASP MASVS certification requirements.

## Verification

The baseline Issue #14 implementation passed 120 Jest tests across 15 suites, lint, TypeScript, Expo compatibility checks, and iOS simulator verification.

Those tests do not independently mitigate or eliminate the dependency advisories.
