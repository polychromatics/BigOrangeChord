# Big Orange Chord — Mobile alpha

A phone-first Progressive Web App prototype based on the MATLAB Big Orange Chord workflow.

## Files
- `index.html` — screen structure
- `styles.css` — phone/projector visual design
- `app.js` — playback engine, setup, songs, solos, BPM/count-in
- `manifest.webmanifest` — installable PWA metadata
- `sw.js` — offline cache

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

- `index.html` — the two app screens and their controls.
- `styles.css` — layout, responsive behaviour and colour/visual design.
- `app.js` — song state, playback timing, repeats, solos, saving/loading and UI updates.
- `manifest.webmanifest` — metadata used when the app is installed to a phone/home screen.
- `sw.js` — service worker used to cache the app for offline use.

The CSS and JavaScript are deliberately stored as readable source rather than minified production code so the project does not become a black box.

## Proposed public-beta route

1. Open the HTTPS URL on iPhone and Android and add/install it from the browser to the home screen.
2. Load the installed app once, switch the phone to airplane mode, and confirm playback, setup and the local song library still work.
3. Test screen-lock/background behaviour separately; Big Orange Chord is intended to remain visible while being used as a musical prompt.
4. Only after the PWA is stable, we can consider packaging the same web code for app stores.
