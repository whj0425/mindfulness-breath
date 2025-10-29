# Mindful Breath UI Direction

## Immediate Priorities (Adopt Now)
- Full-bleed calm canvas with muted gradient or soft still nature image so the experience fills the viewport without side gutters.
- Single primary action: default 5-minute session, one-click start, breathing ring visible immediately to honor “instant calm”.
- Minimalist breathing cue: text-free circular countdown ring with eased inhale/exhale transitions; respect `prefers-reduced-motion`.
- Essential controls grouped near the ring: start/pause, duration preset chips, companion audio toggle with small volume slider; all with 44×44px targets and clear focus states.
- Accessibility baked in: keyboard-first order, visible outlines, WCAG AA contrast, prep light/dark theme variants for daytime vs. night use.
- Ambient audio support: default ambient track that fades in/out on interaction; allow sound change without navigating away.

## Deferred Enhancements (Revisit Later)
- Background mini-player or floating session widget (requires additional interaction patterns).
- Adaptive themes, streaks, or contextual nudges that could add complexity before core flow is polished.
- Rich glassmorphic layers or animated nature scenes—consider only after base layout proves focus-friendly.
- Expanded sound library or mix panel; current fixed track list suffices for MVP.
- Personalization hooks (progressive reminders, saved presets beyond existing defaults).

## Desktop Layout Proposal
- **Backdrop:** Full viewport, low-stimulation gradient with optional subtle noise texture; supports light/dark theme toggle in future.
- **Central Stage:** Large breathing ring centered horizontally, vertically offset slightly above center for visual balance; the ring alone animates, no inner text.
- **Primary Control Bar:** Below the ring, spaced cluster containing:
  - Start/Pause button (icon + terse label) and keyboard shortcut hint outside the ring.
  - Duration preset chips (e.g., 2, 5, 8 min) with selected state.
  - Companion audio toggle button with mini volume slider revealed on hover/focus.
- **Side Panel (Right):** Collapsible column for mindfulness prompts, mode context, and audio picker; hidden by default on smaller widths but available to keep main view uncluttered.
- **Footer Strip:** Discrete row for secondary links (help, settings) and dark-mode toggle; keeps header-free brief.
- **Behavioral Notes:** Preserve focus order from top-left to bottom-right; on load, focus the Start button. All animation obeys easing curves that slow near phase transitions to avoid abrupt size changes.
