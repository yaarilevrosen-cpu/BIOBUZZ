# BIOBUZZ Privacy Policy

**Version:** 2026-10-09

This policy explains, in plain language, what information the BIOBUZZ field simulator uses, where it goes, how long we keep it and how you can see, download or delete it. It covers the BIOBUZZ desktop app (Windows, macOS, Linux), the single-file browser version, the phone controller page and the BIOBUZZ website on GitHub Pages.

The short version:

- **Without an account, everything stays on your device.** Nothing about your drivers, matches or settings is sent to us.
- **An account is optional.** It only exists so you can sync between computers and share stats with your team.
- **We do not use analytics, advertising or tracking, and we never sell or rent data.**
- **You can download or delete your cloud data yourself, inside the app, at any time.**

---

## Who we are

BIOBUZZ is a free, non-commercial project made by FIRST® Tech Challenge team **Apollo #9662** from Israel, a volunteer student team. In this policy "we" and "us" means the team. For the purposes of privacy law, we are the party that decides how the data described here is used (the "controller" or "database owner").

**How to contact us:** open an issue at [github.com/yaarilevrosen-cpu/BIOBUZZ/issues](https://github.com/yaarilevrosen-cpu/BIOBUZZ/issues). GitHub issues are public, so **do not write personal details in an issue**. If you need to tell us something private, write only "please contact me privately about a privacy request" and we will arrange a private channel with you. If the app shows an email address for privacy requests next to these documents, you can also use that.

## What data we use, feature by feature

### Using the simulator without an account (local only)

- **What:** drivers (name, emoji, colour), match history and statistics, robot parameters, autonomous paths, key bindings, season progress, records, replays and settings. In the desktop app, match videos you choose to record are saved in your Videos folder (Videos/BIOBUZZ).
- **Where:** only on your device. In the desktop app this is the app data folder (Windows: %APPDATA%\BIOBUZZ\data, macOS: ~/Library/Application Support/BIOBUZZ/data, Linux: ~/.config/BIOBUZZ/data; the portable version uses a BIOBUZZ-data folder next to the program). In the browser version it is the browser's local storage for that file.
- **Backups:** the app keeps automatic local backups so you don't lose work (see "How long we keep data"). They also stay on your device.
- **Who can see it:** only people who use your device. We never receive it.

You can use every simulator feature this way, with no account and no internet connection (except the optional features below).

### Account and cloud sync (optional, desktop app)

If you create an account, the following is stored in our cloud database, which is run for us by **Supabase**:

- **Account details:** your email address and password. The password is handled by Supabase's sign-in service and stored only as a secure hash; we never see it. Supabase sends you account emails (confirm your address, reset your password).
- **Account name:** the display name you choose for the account.
- **Your age group and acceptance record:** when you sign up you confirm your age group and that you accept the Terms of Use and this policy. We store that confirmation with its date and the version of the documents, so we can show what you agreed to. Accounts created before the age question existed are asked for their age group once, together with accepting updated documents. We do not ask for or store your date of birth.
- **Drivers:** name, emoji, colour and when they were created or changed.
- **Driver settings:** the simulator settings of each driver, such as key bindings, robot parameters, autonomous paths and season history.
- **Match archive:** scores, statistics, cycle times and the traces of shots and the ball for each match.
- **Technical records needed to run the service:** sign-in sessions, storage-usage counters (to enforce fair-use limits) and a short-term counter of wrong team-code attempts (to stop guessing).

On your computer, the sign-in session is stored encrypted with your operating system's secure storage. If secure storage is not available, it is kept only in memory and you sign in again next time.

**Is it mandatory?** No. An account is optional. If you want one, an email address and password are required (we need them to identify you and protect your data); everything else is created by you as you use the app.

### Teams (optional)

If you create or join a team with a join code:

- We store the team name, team number, the join code, who owns the team, and each member's label inside the team.
- **What your teammates see:** your drivers' names, emojis and colours, and a summary of each match (type, skill level, win, your score, shots, hits, average cycle, fouls, park, autonomous points, drill, version). The database gives teammates only these fields, through dedicated server functions; they cannot read your driver settings or your full match records.
- The team owner can remove a member, which also changes the join code. You can leave a team at any time. A team with no members left is deleted automatically.

### Bug reports (optional)

When you send a bug report from the app or the browser version, we receive what you choose to send:

- what happened and how to reproduce it (your text);
- an optional way to contact you (only if you fill it in);
- the app version, language and platform;
- if you leave "Attach system info and recent errors" on: screen size, graphics card name, browser/app user-agent, which mode you were in, and the last error messages;
- if you leave "Attach a screenshot" on: a screenshot of the app window, which may show driver names or anything else that was on screen.

The report form shows you a preview of exactly what will be sent before you press Send. If you are signed in, the report is linked to your account. To prevent spam, the server limits how many reports can be sent per hour. For that it stores a one-way scrambled code made from your internet (IP) address with a secret key that exists only on the server (a keyed hash, HMAC-SHA256), not the address itself, and erases that code after 24 hours.

Please don't write personal information in a bug report that isn't needed. If you choose "Open on GitHub" instead, the report is posted publicly on GitHub under your own GitHub account.

### AI features (optional, adults 18+ only)

The AI coach and helper use Google's Gemini service with **your own** Google API key. They are off by default and are meant for adult mentors (18+) only. The key is stored encrypted on your computer and is never sent to us. What you type, and the summaries the AI coach sends, go **directly from your computer to Google**, never through us. Before anything is sent, the app replaces driver and team names it knows with nicknames ("Driver 1", "Team X") and puts the real names back only on your computer. Accounts for ages 13–17 do not see the AI features at all. We do not receive or store your AI questions or answers. Google's terms apply to that data. See the separate **AI Notice** for details.

### Network play, phone controller and spectators

Playing together on a local network, using your phone as a controller, or showing a broadcast view on another screen all work through a small server running **on your own computer**, inside your local network. The phone or other computer connects directly to it using a room code or QR code with a secret key. Nothing passes through our servers. Players in the same room can see each other's driver names and what happens in the match. Traffic inside your local network is not encrypted, so only play on networks you trust (for example your home or team network, not a public café network).

### Updates and downloads

- **Website and downloads:** the BIOBUZZ website and downloads are hosted on **GitHub** (GitHub Pages and GitHub Releases). Like any website, GitHub receives your IP address and browser details when you visit or download, and GitHub logs visitors' IP addresses for security. The download page also asks GitHub which version is newest.
- **Update checks:** the installed desktop app checks GitHub for a newer version shortly after it starts and when you press "check for updates". GitHub sees your IP address and that a BIOBUZZ app asked. No personal data or app content is sent. The single-file browser version does not check for updates.
- **Libraries and fonts:** the app and the single-file browser version include all their libraries, fonts and the field model inside the file, so they make no other requests to outside servers.

### What we do not do

- No analytics, usage tracking, advertising, ad networks, social media pixels or fingerprinting.
- No selling, renting or trading of data, and no use of your data for marketing.
- No automated decisions about you with legal or similarly significant effects.
- The word "telemetry" in the app refers only to your robot's data (range, RPM, voltage) shown in the simulator; it is not information about you.

## Why we use data (purposes and legal bases)

- **To give you an account, sync your data and run team features** — because you asked for these features (performance of our agreement with you, GDPR Art. 6(1)(b)).
- **To fix bugs you report and contact you if you asked us to** — our legitimate interest in keeping the software working (GDPR Art. 6(1)(f)); sending a report is always your choice.
- **To keep the service secure and fair** (hashed IP for rate limits, quotas, failed-code counters) — our legitimate interest in preventing abuse (GDPR Art. 6(1)(f)).
- **To record your age group and acceptance of the terms** — to meet our legal obligations and to show that permission was given (GDPR Art. 6(1)(c) and (f)).
- **AI features** — only if you turn them on and confirm you are 18+ (your consent, GDPR Art. 6(1)(a)); the data goes directly to Google.

We use data only for these purposes. We don't use it to profile you or for anything unrelated to running BIOBUZZ.

## Who receives data

- **Supabase** (Supabase Inc. / Supabase Pte. Ltd.) — hosts our cloud database and sign-in service and sends account emails. Supabase stores the data on cloud servers of its own providers (mainly Amazon Web Services). Supabase acts as our processor under its Data Processing Addendum. [Supabase sub-processors](https://supabase.com/legal/customer-resources/subprocessor-list).
- **GitHub** (GitHub, Inc., a Microsoft company) — hosts the website, downloads, updates and public issues. [GitHub Privacy Statement](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement).
- **Google** — only if you turn on the AI features with your own key. Google receives that data directly from you under Google's own terms, not as our processor. [Gemini API Additional Terms](https://ai.google.dev/gemini-api/terms).
- **Your teammates** — the team data described above, only if you join a team.
- **Authorities** — only if the law requires it, and only what is required.

We do not share data with anyone else.

## International transfers

We are in Israel. Supabase and GitHub are US-based companies and may store or process data in the United States, the European Union or other countries. The European Commission recognises Israel as providing adequate protection for personal data. For transfers to the US and other countries, our providers use safeguards such as the EU Standard Contractual Clauses included in their data processing terms.

## How long we keep data

- **Local data on your device:** until you delete it (see "Your rights"). Uninstalling the app does not delete your data folder, so a reinstall keeps your drivers; delete the folder yourself if you want it gone.
- **Local automatic backups (desktop app):** one backup per day, kept for the last 14 days, plus up to 10 backups made before risky actions (reset, restore, import). Older ones are deleted automatically.
- **Local backups (browser version):** up to 6, stored in the browser; older ones are replaced automatically.
- **Account, drivers, settings, matches and team membership:** for as long as your account exists. They are deleted when you delete your account.
- **Deleted drivers:** when you delete a driver, its name and settings are wiped from the cloud at the next sync and its matches are deleted. A small marker (the driver's random ID and the time of deletion, without the name) is kept until your account is deleted, so your other computers know the driver was deleted and don't bring it back.
- **Teams:** until the last member leaves; then the team is deleted automatically.
- **Counters for fair use and security:** wrong-code counters reset after one hour and are deleted after a day; storage counters are kept until the account is deleted.
- **Bug reports (including the screenshot):** deleted 12 months after we receive them, or earlier when they are no longer needed. The scrambled IP code is erased 24 hours after the report.
- **Automatic deletion:** these deletions run automatically on our server; nobody has to remember to do them.
- **Provider backups:** after deletion, copies may remain in our cloud provider's routine backups for a short time (normally up to 14 days) until they are overwritten. We do not restore deleted data from them except to recover from a technical failure.
- **AI data:** we store none. Your API key stays encrypted on your computer until you remove it. Google keeps data according to its own terms.

## Your rights and how to use them

Under the Israeli Privacy Protection Law and, where it applies to you, the GDPR, you have the right to know what data we hold about you, get a copy, correct it, delete it, object to some uses, withdraw consent and, in some cases, receive your data in a portable format. Most of this you can do yourself, right away, in the app:

- **See and correct:** all your drivers, matches and settings are visible and editable in the app. Change your account name in the account panel.
- **Download a copy (access and portability):** account panel → **"Download my cloud data"**. You get a file (JSON) with everything stored in the cloud for your account: account details (email, name, creation date, age group and acceptance record), drivers with their settings, matches, team membership and the bug reports linked to your account. For local data, use Settings → Backup, restore and reset → **"Export to file"**.
- **Delete your account and cloud data:** account panel → **"Delete my account and cloud data"**. This deletes your account, drivers, settings, matches, team membership and the bug reports linked to your account from our database. If you own a team, ownership passes to the longest-standing member, or the team is deleted if you were the last one. It cannot be undone, so download a copy first if you want one. Your local data on the device stays until you delete it too.
- **Delete local data:** Settings → Backup, restore and reset → **"Reset all"**. Normally the app keeps one safety backup when you reset. Tick **"Including backups"** to delete the backups too: in the browser version all backups stored in the browser; in the desktop app also the whole backups folder (for every driver on that computer) and the bin of deleted drivers. In the desktop app, Reset all clears the current driver; delete other drivers from the drivers list. You can also delete the app data folder listed above, or clear the browser's site data for the browser version.
- **Delete a single bug report or ask a question:** contact us as described in "Who we are". We will answer within 30 days. We may need to confirm that the request really comes from the account owner (for example by asking you to send it while signed in).
- **Withdraw consent for AI:** turn the AI features off and remove your key in Settings at any time.
- **Object:** you can object to our use of data based on legitimate interest; the easiest way is to stop sending bug reports, or ask us to delete ones you sent.

A parent or guardian can exercise these rights for their child.

## Children and age

FIRST Tech Challenge is for students, so we expect many users to be under 18. We designed BIOBUZZ so that young users can use everything without giving us any personal data.

- **Under 13:** you can use the whole simulator **locally**, with no account. Accounts are not available under 13, and nothing about you leaves your device (unless a bug report is sent — please ask a parent or mentor first).
- **13 to 17:** you may create an account **only with the permission of a parent or legal guardian**. This also covers EU countries where the age of digital consent is 14, 15 or 16.
- **AI features:** for adults **18 and over only**. If you are under 18, do not turn them on. This is required by Google's terms. In an account for ages 13–17 the AI features are hidden completely.
- **If we learn that a child under 13 has an account,** we will delete the account and its cloud data. If you are a parent and think this has happened, contact us and we will act quickly.

## How we protect data

- All connections to our cloud and to GitHub are encrypted (HTTPS/TLS).
- **Row-level security** in the database: each account can only change its own rows; teammates can only read driver names, emojis, colours and match summaries, through dedicated server functions; bug reports can be added but not read back through the app's public key.
- Passwords are handled and hashed by Supabase's sign-in service; we never see them.
- On your computer, the sign-in session and the AI key are stored encrypted using the operating system's secure storage.
- Network play and the phone controller require a room key or secret token, accept connections only from the expected pages, and limit wrong attempts.
- Limits and quotas on storage, bug reports and team-code guesses to stop abuse.
- We collect as little as possible and keep it only as long as needed.
- No analytics, ads or third-party trackers.

No system is perfectly secure. If you find a security problem, please report it as described in our **Security Policy**.

## If something goes wrong (data breach)

If we learn of a security incident that affects personal data, we will act to stop it, assess the risk, and keep a record of it. Where the law requires, we will notify the Israeli Privacy Protection Authority and any other competent authority, and we will inform affected users (by email to the account address, an in-app notice and a notice on GitHub) without undue delay, explaining what happened and what you can do.

## Changes to this policy

The version date at the top shows when this policy last changed. When we publish a new version, the app shows a notice. If you have an account, cloud sync pauses until you accept the new version in the account panel; the app keeps working on your device in the meantime, and you can still download or delete your data. Older versions are kept in the project's history on GitHub.

## Complaints

If you are not happy with how we handle your data, please contact us first and we will try to fix it. You also have the right to complain to:

- **Israel:** the Privacy Protection Authority (Rashut LeHaganat HaPratiyut) — [gov.il public inquiries](https://www.gov.il/he/Departments/General/public_inquiries_ilita).
- **European Union / EEA:** the data protection supervisory authority in the country where you live — [list of EU authorities](https://www.edpb.europa.eu/about-edpb/about-edpb/members_en).
- **Other countries:** your local data protection authority.

## Related documents

- **Terms of Use** — the rules for using BIOBUZZ.
- **AI Notice** — how the optional AI features work.
- **Security Policy** — how to report security problems.
- **Accessibility Statement** and **Third-party notices**.
