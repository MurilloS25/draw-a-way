# Manual acceptance

Automated checks passed, but no human has used this yet. Use a desktop browser
and, if possible, a phone or tablet on the same machine's loopback via browser
device emulation (the server only listens on 127.0.0.1).

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

1. **Immediate start.** The first screen is a mission with a clear "Start
   drawing" button. No sign-in, form, or question appears.
2. **Mission 1, river.** Draw a bridge shape across the water. Press "I'm done
   drawing". Read the confirm text: it says the app cannot see the drawing and
   asks you to choose. Pick "A bridge", press "That's my idea". See the snail
   cross. Press "Try a change", add a line, choose "Add a rail to hold",
   and finish at "Your story trail". Check both pictures and the ending text.
3. **Mission 2, windy hill** and **Mission 3, fog.** Choose them from the
   buttons on the first screen (or "Try another mission" at the end). Complete
   each with a different idea than before and confirm the consequence text is
   different.
4. **No drawing.** Start a mission, press "Choose an idea without drawing" and
   complete both rounds without touching the canvas. Repeat with only the
   keyboard (Tab, Enter, Space, arrow keys).
5. **Keyboard drawing.** Tab to the drawing area. Press Space (pen down), use
   arrows (Shift for bigger steps), Space again (pen up). Undo with the button
   or Ctrl+Z.
6. **Undo, Redo, Clear.** Clear, then Redo to bring lines back.
7. **Touch and pen** if available: draw with a finger or stylus; the page must
   not scroll while drawing.
8. **Resume.** Draw a line, reload the page: the line is still there. Open the
   browser's storage view and confirm a single key, `drawaway:session:v1`.
9. **Start over.** Press "Start over", then "Yes, erase and start over". The
   mission restarts and the storage key is gone.
10. **Fallback.** With the fake mode, press "Ask the helper to look"
    on the confirm step: a suggestion appears; try both "Yes, that's it" and
    "No, I'll choose". With default mode, no helper button exists and nothing
    is sent (check the network tab: only requests to 127.0.0.1).
11. **Zoom and size.** Zoom to 200% and 400%, and resize to 320 px wide: no
    sideways scrolling, controls reachable.
12. **Reduced motion.** Turn on "reduce motion" in your OS: the consequence
    appears without movement.
13. **Screen reader** (if available): stage changes are announced and focus
    moves to each new heading.

## Report

Note anything confusing for a child, copy that sounds wrong, or anything that
asked for personal information (it should not).
