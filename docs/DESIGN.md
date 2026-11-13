# Design notes

**Palette (Sheldon College, dark mode only)**

| Token | Hex | Use |
|---|---|---|
| navy-800 (primary) | `#00295c` | Brand surfaces, sidebar active state, header |
| sky (secondary) | `#a3c1e7` | Section labels, icons, links, focus rings |
| gold (accent) | `#fbd708` | Sparingly: today marker, unread dots, overdue/now emphasis, demo banner |
| navy-950 | `#04122a` | Page background |
| navy-900 | `#071d3f` | Cards |

Text is white/slate on navy for contrast. Fonts: Inter/system sans for body,
JetBrains Mono/system mono for times, codes and tokens.

**Logo slot.** `LogoSlot` renders `/public/sheldon-logo.svg` if present, else a
monogram placeholder, in the login header, desktop sidebar and mobile top bar.

**Layout.** Desktop: 260 px sidebar + fluid content (max 72 rem). Mobile: top bar
with search/notifications/profile, bottom tab bar (Today, Timetable, Due work,
News, More). All pages are single-column under `lg`.

**Information priority (Today page).** Now/next class → due soon → today's
classes → latest news → coming up → quick links. The goal is that a student on a
phone between periods gets the answer without scrolling.

**Accessibility.** Skip link, semantic headings, `aria-pressed` on filter chips,
keyboard-driven command palette (↑ ↓ ⏎ Esc), visible focus rings, colour never
the only signal (icons/labels accompany it).
