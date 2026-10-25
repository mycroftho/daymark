Daymark 1.2.1 brings a clearer personal calendar, completed-task search, and a gentle reminder sound.

## Downloads

- **Windows x64:** `Daymark-Setup-1.2.1.exe`
- **Mac (Apple silicon and Intel):** `Daymark-1.2.1-mac-universal.dmg`
- `SHA256SUMS.txt` contains download checksums.

## What's included

- One-click completion, Undo, and completion history with a dedicated keyword search field and date filters.
- Day, week and month calendars with duration, location, category, notes, and a full event-details panel.
- Native notifications, snooze, a gentle beep with independent mute/volume controls, and background reminders while the app remains in the tray/menu bar.
- Five appearance themes, adjustable fonts and text size, and JSON backup/import.

Windows installation keeps application data beside the install folder in `DaymarkData`, preserving earlier D-drive installations. macOS stores data under the current user's Application Support directory. Closing the window keeps reminders running; Quit stops them.

## Signing and notifications

These builds have no commercial signing certificate. The macOS build is ad-hoc signed, **not Apple Developer ID signed or notarized**, and macOS may block opening it. No Apple signing/notarization success is claimed. Follow the operating system's normal application approval guidance or build from source; do not disable system protections globally.

Enable notifications inside Daymark and test them, then check Daymark's permission in system settings. Sleep, Focus / Do Not Disturb and quitting the app can affect reminders. Packaged-app launch and persistence are checked by CI; a CI build is not a substitute for physical notification testing on your own Mac.
