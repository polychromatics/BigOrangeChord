# Big Orange Chord — Project Instructions

Big Orange Chord is a free, open-source musical chord-prompt application for jam sessions.

Concept, design and testing: Natasha Lucas
Development assistance: OpenAI ChatGPT

The project began as a MATLAB GUI and has evolved into a mobile-friendly Progressive Web App (PWA), hosted on GitHub Pages.

Repository: https://github.com/polychromatics/BigOrangeChord

Live application: https://polychromatics.github.io/BigOrangeChord/

## Development principles

- Musical timing and BPM accuracy are the highest priority. Visual updates must never dictate or slow down the beat.

- Keep the interface clean, readable, responsive and suitable for phone screens and projection.

- Preserve the enormous orange current-chord indicator.

- Support Verse, Chorus, Bridge, configurable repeats, count-in, solo rotation and song saving/loading.

- Support optional metronome audio.

- Maintain reliable offline operation and automatic application-cache updates.

- No user accounts, subscriptions, advertising, cloud dependency or mandatory internet connection during performances.

- Keep HTML, CSS and JavaScript properly formatted, commented and understandable. This is a collaborative development project, not a black box.

- Preserve working features unless changes are explicitly requested.

- Provide complete updated source files for testing and deployment.

- Keep the application a musical prompt, not a substitute for musicians listening to and interacting with one another.

- Guiding philosophy: Real playing, real sharing, real human interaction — with an aggressively orange chord available when somebody loses their place.


## Files
- `index.html` — the two app screens and their controls.
- `styles.css` — layout, responsive behaviour and colour/visual design.
- `app.js` — playback engine, setup, songs, BPM/count-in, repeats, solos, saving/loading and UI updates.
- `manifest.webmanifest` — metadata used when the app is installed to a phone/home screen.
- `sw.js` — service worker used to cache the app for offline use.

## Alpha functionality
- Verse / Chorus / Bridge with user-defined order and repeats
- Per-chord beat counts
- BPM entry and tap BPM
- Variable count-in
- Full repeats
- Solo list with user-defined Verse repeats per soloist
- Local song library (browser storage)
- JSON song export/import for backup or sharing
- Fullscreen performance view
- Offline cache once served/installed

## Important alpha note
This is deliberately the first mobile prototype. Test the musical behaviour before treating it as a release build. Browser timer behaviour can vary when the phone locks or the app is backgrounded, so keep the performance screen awake/foregrounded during a jam.

## Source layout

This project is intentionally kept dependency-free and readable:
The CSS and JavaScript are deliberately stored as readable source rather than minified production code so the project does not become a black box.

## Beta 2: timing and updates
This is a significant improvement, but I wouldn't yet call it a guaranteed metronome. Mobile browsers can suspend or throttle processing when the phone locks, the browser goes into the background, or the operating system interrupts audio.
For now, keep the app visible and the screen awake during playing. The next meaningful test is to compare it against a separate metronome for several minutes, especially across chord and section transitions.
The JavaScript files pass syntax validation, but live mobile timing testing is required.
I'd particularly love your feedback on whether the tempo stays consistent through Verse → Chorus → Verse, and whether the metronome ticks sound evenly spaced.

- Clock anchored to `performance.now()`; a late visual callback catches up missed beats.
- Optional Web Audio metronome (off / soft tick / woodblock), tick every N beats and volume.
- Audio events scheduled ahead on the Web Audio clock to reduce timing jitter.
- Service worker uses network-first requests, caches for offline use, and deletes old named caches.
- Publish the **contents** of this directory to the root of the GitHub Pages repository.
- After uploading, allow the Pages workflow to complete and reload the page. Existing open tabs may need one further reload.
- Browser background throttling, OS audio policies, and screen locking still prevent guaranteed uninterrupted timing. Keep the app foregrounded and screen awake. For critical ensemble timing use a dedicated metronome.
