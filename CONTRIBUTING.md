# Contributing to FloatCam

Thank you for considering a contribution to FloatCam. This guide explains how to prepare a focused, reproducible change.

## Development setup

### Requirements

- Git
- Node.js 18 or later
- npm

### Clone and install

```bash
git clone https://github.com/ydvkundan2005/FloatCam.git
cd FloatCam
npm ci
```

Start the desktop application:

```bash
npm start
```

Run the repository's automated tests:

```bash
npm test
```

The current test suite covers selected modules. A passing unit-test run does not by itself prove that camera permissions, WebRTC sessions, Electron windows, installers, or every phone/browser combination work end to end.

## Before opening an issue

For a reproducible bug report, include:

- FloatCam version and installation method.
- Desktop operating system and version.
- Phone model and mobile browser, when relevant.
- The smallest set of steps that reproduces the behavior.
- Expected behavior and what happened instead.
- Relevant error messages or redacted logs.

Remove personal information, private network details, tokens, certificates, and other secrets before sharing logs. Do not attach private camera footage.

## Preparing a pull request

1. Create a focused branch from `main`.
2. Keep the change limited to one problem or improvement.
3. Add or update tests when behavior changes.
4. Run `npm test` and report the result accurately.
5. Update the relevant documentation when setup, behavior, or limitations change.
6. Describe the motivation, implementation, and manual verification performed.

For platform-dependent changes, state which operating systems and devices you actually tested. Do not describe an untested platform as verified.

## Security and privacy

- Never commit credentials, private keys, certificates containing private key material, or personal camera data.
- Do not ask users to publish secrets or sensitive logs in issues.
- Treat local-network access as a deployment context, not as proof that traffic is confidential.
- For a suspected security vulnerability, follow the reporting guidance in [the security documentation](docs/SECURITY.md) rather than posting exploit details publicly.

Thank you for helping make FloatCam easier to use, review, and maintain.
