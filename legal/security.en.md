# BIOBUZZ Security Policy

**Version:** 2026-10-09

We want BIOBUZZ to be safe for the students and mentors who use it. If you find a security problem, please tell us privately so we can fix it before anyone is harmed.

---

## How to report a vulnerability

- **Report privately on GitHub:** [open a private security advisory](https://github.com/yaarilevrosen-cpu/BIOBUZZ/security/advisories/new). Only you and the project maintainers can see it.
- **Do not** open a public issue, post in a discussion or share details publicly until we have released a fix.
- Please include: what the problem is, which version and platform, steps to reproduce (a short proof of concept is ideal), what an attacker could do, and any idea for a fix.
- You don't need a perfect write-up. A clear description is enough.

## What is in scope

- The BIOBUZZ desktop app (Windows, macOS, Linux), including the installer, auto-update and the built-in network bridge.
- The single-file browser version and the phone controller page.
- The Python phone bridge (padbridge) in this repository.
- Our cloud project: the database rules, functions and permissions defined in this repository (for example row-level security, team join codes, quotas and the bug report endpoint).
- The BIOBUZZ website on GitHub Pages.

## What is out of scope

- The platforms themselves — Supabase, GitHub, Google or Electron/Chromium. Please report those to their owners (we're happy to help coordinate if the problem affects BIOBUZZ users).
- Denial-of-service or load testing, spamming the bug report or sign-up forms, or anything that fills up the shared service.
- Social engineering, phishing or physical attacks against team members or users.
- Problems that need an already-compromised device or administrator access to the user's computer.
- The public "anon" key built into the app: it is meant to be public; security comes from the database rules. (Showing that those rules can be bypassed is in scope.)
- Missing best-practice headers or version banners without a real, demonstrated impact.

## Rules for testing

- Use **only your own accounts and test teams**. Never access, change or delete other people's data. If you accidentally see someone else's data, stop, don't keep a copy, and tell us in your report.
- Keep testing light: do not degrade the service for others.
- Give us reasonable time to fix the problem before you disclose it.

## What happens after you report

We are a volunteer student team, so these are targets we work hard to meet, not guarantees:

- **Acknowledgement:** within 7 days.
- **First assessment** (do we confirm it, and how serious is it): within 14 days.
- **Fix:** serious problems as soon as we can, aiming for within 30 days; others within 90 days.
- **Disclosure:** we will agree a disclosure date with you, normally after the fix is released and at most 90 days after your report. We will credit you in the release notes if you want.
- If the problem exposed personal data, we will also follow the breach steps in our Privacy Policy.

We don't have a paid bug bounty, but we are grateful for every report.

## Safe harbour

If you act in good faith and follow this policy, we will consider your research authorised, we will not take legal action against you or ask anyone else to, and we will work with you to understand and fix the problem. Good faith means: you avoid harming users and their data, avoid disrupting the service, stop as soon as you have shown the problem, don't demand payment, and give us a reasonable chance to fix it before disclosing. This only covers our own systems and code; we cannot give permission on behalf of Supabase, GitHub, Google or others.

## Protections already in place

- Encrypted connections (HTTPS/TLS) to the cloud service and GitHub.
- Row-level security in the database: each account can only change its own data; team members get read-only access to team data; bug reports are insert-only for the public key.
- Passwords handled and hashed by Supabase's sign-in service.
- Sign-in session and AI key stored encrypted with the operating system's secure storage.
- Quotas and rate limits on storage, bug reports and team code guesses; 8-character random team codes that change when a member is removed.
- The local network bridge checks the origin of every connection, needs a secret token for the simulator and a 32-bit room key for guests, limits wrong attempts per address and never reveals the room code on its status page.
- Hardened Electron settings (no Node.js in web pages, context isolation, locked-down fuses) and minimal permissions in the build pipeline.
- No analytics or third-party scripts in the app.

## Known limitations

- Traffic inside your local network during network play is not encrypted. Play only on networks you trust.
- The desktop app is not yet code-signed on every platform, so your system may show a warning. Download BIOBUZZ only from the official [GitHub Releases page](https://github.com/yaarilevrosen-cpu/BIOBUZZ/releases).
- Only the latest release receives security fixes. Please keep your app up to date.
