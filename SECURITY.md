# Security Policy

## Supported Versions

Only the latest release of buildpipe receives security fixes.

## Reporting a Vulnerability

**Do not open a public issue for security vulnerabilities.**

Report vulnerabilities by emailing: raiyanyahyadeveloper@gmail.com

Include:
- A description of the vulnerability
- Steps to reproduce
- Potential impact
- Any suggested fix (optional)

You can expect an acknowledgement within 48 hours. If the issue is confirmed, a fix will be prioritised and released as soon as possible. You will be credited in the release notes unless you prefer otherwise.

## Scope

- Arbitrary code execution via pipeline configuration
- API key or credential exposure
- Unsafe IPC or `contextBridge` exposure
- Path traversal in file read/write operations

## Out of Scope

- Issues in unmaintained forks
- Theoretical vulnerabilities with no practical exploit path
- Electron version advisories already tracked upstream
