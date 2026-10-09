# BIOBUZZ AI Notice

**Version:** 2026-10-09

BIOBUZZ has two optional AI features in the desktop app: the **AI coach**, which looks at match statistics and suggests what to practise, and the **AI helper**, which answers questions about using the simulator and explains planner results. They use Google's **Gemini API** with an API key that **you** create in your own Google account.

---

## For adults (18+) only

- The AI features are **off by default**.
- They are meant for **adult mentors, aged 18 or over**. Google's [Gemini API Additional Terms](https://ai.google.dev/gemini-api/terms) say you must be 18 or older to use the API.
- **If you are under 18, do not turn them on** and do not enter an API key. Everything else in BIOBUZZ works without AI.
- To turn them on, an adult must confirm they are 18 or over and that they have read Google's terms and this notice. The app will not save or use a key without that confirmation.

## How it works

- You create a Gemini API key in your own Google account and paste it in Settings. You are Google's customer for that key, and Google's terms apply to everything you send.
- The key is stored **encrypted on your computer** using the operating system's secure storage. It is never put in drivers, sync, backups or bug reports, and **it is never sent to us**. If secure storage is not available, the key is kept only until you close the app.
- Requests go **directly from your computer to Google**. They do not pass through our servers, and we never see your questions or the answers.
- When you press "Save and check" or "Check again", the app asks Google which models your key can use and sends each a tiny test request.

## What is sent to Google

- **AI helper:** the questions you type (up to the last 12 messages of the conversation), plus fixed instructions and a list of the app's features so it can answer about them. When it explains a planner result, it sends only the numbers of that result and asks the model not to mention names.
- **AI coach (one driver):** a summary of that driver's statistics — numbers such as match counts, averages, accuracy and cycle times — together with the **driver's display name**, shortened.
- **AI coach (whole team):** a statistics summary for each teammate's drivers, including their **driver display names** and the **team name**, shortened to a few dozen characters. Only use this if your teammates are OK with it.
- **Never sent by the app:** your email, password, account details, API key (except to Google itself, to authenticate), screenshots or files.

Do not type personal, sensitive or confidential information into the AI helper. Use nicknames for drivers if you plan to use the coach.

## What Google does with it

Google's terms are what count; please read them. In short, as of the date of this notice:

- If your key belongs to a **free (unpaid) Gemini API project**, Google may use what you send and what it answers to improve its products, and **human reviewers may read it**. Google asks you not to submit sensitive, confidential or personal information.
- If you are in the **European Economic Area, Switzerland or the United Kingdom**, Google's terms only allow **paid** Gemini API services to be offered to users there. Use the AI features only with a key from a paid (billing-enabled) project.
- Any cost on your Google account is yours. Google may set usage limits.

## AI answers can be wrong

- AI output is generated automatically and can be **inaccurate, incomplete or made up**, even when it sounds confident.
- It is advice for practice, not a rule. Check it against the official game manual, your own data and your mentors.
- **Never run AI-suggested code, speeds or paths on a real robot without checking them yourself** and following the robot safety rules in the Terms of Use (wheels off the ground first, low speed, adult present).

## How to turn it off or remove your key

- Settings → **AI — Google key** → turn the features off, or press **"Delete key"**. This deletes the key from your computer immediately.
- You can also delete or restrict the key in your Google account at any time ([Google AI Studio](https://aistudio.google.com/)).
- Turning AI off does not affect the rest of BIOBUZZ.

## Questions

See the Privacy Policy for how to contact us. For questions about how Google handles your data, see [Google's Privacy Policy](https://policies.google.com/privacy).
