# Manual acceptance (round 2: three-scene adventures)

Round 1 (a human check of the first MVP) found it clear, simple, and pleasant, and
the flow worked. It did not test real interpretation and made no Groq calls. This
round tests the new three-scene adventures. Automated checks passed; no human has
used this version yet.

## Start

```bash
npm install
npm run build
npm start          # http://127.0.0.1:3000, provider-free
```

To exercise the helper path with the deterministic fake (no network):

```bash
ALLOW_FAKE_INTERPRETER=1 INTERPRETER_MODE=fake npm start
```

Stop the server with Ctrl+C (or stop only the process id you started).

## Checklist

1. **One full adventure.** Pick "Across the river". Draw a bridge shape, press
   "I'm done drawing", pick "Join two places" and "Hold weight", then "That's what it
   does". Watch Mossy cross and read what stays in the story. Press "Next scene":
   the problem changes (wind, a faster river), the story mentions your first idea,
   and your drawing is still on the scene. Finish scene 2 and scene 3 and read the
   "Your adventure trail" page: it should make sense with your eyes closed (it is
   fully written).
2. **A different route.** Start over, pick "Carry someone" in scene 1. Scene 2
   should read differently and your idea should travel with Mossy as a small
   picture instead of staying put.
3. **Other adventures.** Play "The windy hill" and "Lights in the fog" once each.
4. **An unexpected idea.** Draw something odd (a giraffe, a rocket with floats). Say
   what it does with one or two choices. The story should accept it.
5. **Unknown.** Choose "Something else". The story should continue respectfully.
6. **Correct yourself.** Pick two capabilities, then unpick one and pick another.
   Try to pick a third: it should explain that two is the limit.
7. **No drawing.** In each scene use "Choose without drawing". All three scenes
   must work, and the summary says "Chosen without drawing."
8. **Canvas tools.** Try colors, sizes, Erase (it removes whole lines, only in the
   current scene), Undo, Redo, and Clear (asks first). Draw with a finger or stylus
   if you have one; the page must not scroll while drawing. With a keyboard: Tab to
   the drawing area, Space (pen down), arrows (Shift for bigger steps), Space again.
   The line "Now using" always says which tool is active.
9. **Resume.** Reload in the middle of any scene: you land where you were and the
   app says "Welcome back". In browser storage there is one key,
   `drawaway:session:v2`.
10. **Two tabs.** Open the app in two tabs, draw in one, then change something in
    the other. The first tab should ask which version to keep and never mix lines.
11. **Replay.** At the end press "Play this adventure again": it warns that
    drawings will be cleared. "Not yet" keeps everything.
12. **Start over.** "Start over" asks, then erases; the storage key is gone.
13. **Helper (fake mode).** After drawing, "Ask the helper to look" proposes
    capabilities ("I think your ... can ... Is that what you meant?"). Try "Yes,
    that's it" and "No, let me change it". In default mode there is no helper button
    and nothing is sent (network tab: only requests to 127.0.0.1).
14. **Zoom and size.** 200% and 400% zoom, a 320 px wide window, a phone in
    landscape: no sideways scrolling and the main action stays reachable.
15. **Reduced motion.** With "reduce motion" on, consequences appear without movement.
16. **Screen reader** (if available): scene changes are announced and focus moves
    to each new heading; the capability choices read as checkboxes.

## Report

Anything confusing for a child, copy that sounds wrong, ideas that the story
handled badly, or anything that asked for personal information (it should not).
