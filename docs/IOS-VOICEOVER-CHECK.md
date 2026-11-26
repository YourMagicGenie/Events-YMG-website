# iPhone Safari and VoiceOver inquiry check (#136)

Automated checks run Chromium only. This walkthrough covers what needs a real iPhone: Safari's own form, zoom and download behavior, and VoiceOver. Run it on the live site after each release that changes the menu, carousel or inquiry form.

## Already fixed from the code review

- **Fields zoomed on tap (fixed in #136).** Every inquiry field used 15px text. iOS Safari zooms the page when you tap a field under 16px, which pushes the labels and status message off screen. Fields now use 16px text at the same 48px height. `test/browser-smoke.mjs` fails if any field drops below 16px again.

## Setup

- iPhone with current iOS, Safari, no content blockers. Write down the model and iOS version.
- VoiceOver: Settings → Accessibility → VoiceOver. Turn it on with a triple-click of the side button (Settings → Accessibility → Accessibility Shortcut).
- Gestures: swipe right/left for next/previous item, double-tap to activate, rotor (twist two fingers) to move by **Headings** or **Form controls**.
- Pages: https://events.ymgconsultingservices.com/ and https://events.ymgconsultingservices.com/it/
- Do not press **Send** unless a controlled test send has been agreed. Everything below stops before sending.

## Without VoiceOver (both languages)

1. **Menu.** Tap the menu button, then tap a section link. The menu should close and the page should land on that section with its heading visible below the sticky header.
2. **Carousel.** Swipe the event-format cards sideways, then use the arrow buttons. The arrows should stop at the first and last card.
3. **Card to form.** Tap a card's button (for example "Explore a rooftop evening"). The page should scroll to the form, the format field should show that card's format, and a "Selected event format" line with a **Clear format selection** button should appear.
4. **No zoom.** Tap each field (name, email, timing, budget, message, each dropdown). The page must **not** zoom in. If it does, note which field.
5. **Changing labels.** Pick each "What are you inquiring about?" option in turn. The business field's label, placeholder and help text should change; for a private celebration it becomes optional.
6. **Errors.** With the spam check done, leave name empty and tap Send. The empty field should be marked and the status line should ask you to check the highlighted fields.
7. **Spam check.** The Cloudflare check should appear and complete, and the status should say you can send. Leave the page for over five minutes and come back: it should say the check expired.
8. **Guide links.** Tap the partnership PDF on each language page: English opens the English guide, Italian opens the Italian guide.
9. **Email fallback.** Turn on Airplane Mode and reload (or note this as not tested). The status should say online inquiries are unavailable and show a tappable email address.

## With VoiceOver on

1. **Skip link.** From the top of the page, the first item should be "Skip to main content"; double-tap should move to the main content.
2. **Menu button.** It should be announced as "Open navigation menu, button, collapsed", and as "Close navigation menu, expanded" when open. On the Italian page it should be in Italian.
3. **Section jump.** After double-tapping a menu link, the next swipe should continue inside that section, not from the top of the page.
4. **Carousel.** It should be announced as a carousel called "Available event formats". After the arrows move it, the "Format N of M" status should be read out.
5. **Card to form.** After double-tapping a card's button, VoiceOver should land on the format field and read the chosen format.
6. **Labels.** Each field should be read with its label and "required" where marked. After changing the inquiry type, move to the business field: the new label and help text should be read.
7. **Status messages.** The spam-check, "ready", error and "expired" messages should be read out without moving focus to them.
8. **Email link.** In a fallback state, the email address inside the status should be reachable with a swipe and open Mail on double-tap.
9. **Hidden field.** VoiceOver should never reach a "Leave this field blank" field.

## Result

Copy this into #136:

```
Device / iOS:
Safari version:
VoiceOver: yes / no
English path: pass / issues (numbers):
Italian path: pass / issues (numbers):
Not tested and why:
Notes:
```
