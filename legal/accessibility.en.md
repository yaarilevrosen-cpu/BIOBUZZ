# BIOBUZZ Accessibility Statement

**Last reviewed:** 2026-10-09

We want every student and mentor to be able to use BIOBUZZ. This statement describes what we have done to make the simulator, the app and the website accessible, what is still limited, and how to ask for help.

BIOBUZZ is a free project of FIRST® Tech Challenge team **Apollo #9662**, a volunteer student team from Israel. We don't have a dedicated accessibility staff, but we take every request seriously.

---

## Our target

We aim to follow the Israeli Standard **IS 5568**, which is based on the international Web Content Accessibility Guidelines **WCAG 2.0, level AA**, as far as is possible for a real-time 3D simulator. This is a goal we are working towards; BIOBUZZ does not yet fully meet it (see "Known limitations").

## What is accessible

- **Two languages:** the whole interface is available in Hebrew (right-to-left) and English (left-to-right). The page language and direction change with it, so screen readers read each language correctly.
- **Keyboard:** menus, settings, dialogs and the search box can be used with the keyboard. Tab moves between controls, Esc closes dialogs, focus is visible, and the search works as a list you move through with the arrow keys.
- **Your own controls:** every driving and robot action can be remapped to any key. You can drive with the keyboard, with a gamepad (Xbox, PlayStation and similar), or with a phone as a controller, and each driver keeps their own key bindings.
- **Screen reader support:** buttons and fields have text labels, dialogs are marked as dialogs, toggle buttons announce whether they are on, and status messages are announced as they appear.
- **Contrast:** text colours were reviewed in version 1.13 and low-contrast text was made brighter.
- **Sound and speech:** the field can announce the countdown and match events with sounds and spoken calls, and sounds can be turned on or off in Settings.
- **Less motion:** if your operating system is set to reduce motion, interface animations are switched off.
- **Practice at your own pace:** you can pause, use slow motion, replay matches, and practise single drills without the full match clock.
- **Phones and small screens:** the layout adapts to phone screens and large monitors.
- **Website:** the BIOBUZZ website uses simple pages with headings and text links.

## Known limitations

- **The 3D field and real-time driving** are visual and time-based by nature. A screen reader cannot describe the moving field, and fast reactions are needed to drive in a live match. We can't make this part fully accessible, but slower practice modes, remappable controls, sounds and the statistics screens help.
- **Colour is used to show alliances** (red and blue) and some states. Most places also show text or icons, but not all yet.
- **Charts, field heat-maps and path drawings** don't yet have a full text alternative; the key numbers are shown as text next to them.
- **Hebrew/English text inside the 3D field** (labels on the field) is drawn as graphics and is not read by screen readers.
- **Dark theme only:** there is no separate high-contrast or light theme yet. In the browser version you can use the browser's zoom and your system's high-contrast settings.
- Some older dialogs may still have gaps in keyboard or screen reader support. Please tell us if you find one.

## Need help or found a problem?

Please tell us — describe what you were trying to do, which page or screen, and what device and assistive technology you use (for example screen reader, switch, magnifier).

- Open an issue at [github.com/yaarilevrosen-cpu/BIOBUZZ/issues](https://github.com/yaarilevrosen-cpu/BIOBUZZ/issues) and start the title with "Accessibility:". Don't include personal or medical details in a public issue; if you need to tell us something private, ask us to contact you privately.
- If the app shows an email address for these documents, you can use that too.

We aim to reply within 14 days and to fix problems in the next releases where we can. If we can't fix something, we will try to suggest an alternative way to do what you need.

## About this statement

This statement was prepared on 2026-10-09 and covers BIOBUZZ version 1.14 and the BIOBUZZ website. It was based on a review by the developers (keyboard checks, automated checks and screen-reader spot checks), not an external audit. We will update it when accessibility changes.
