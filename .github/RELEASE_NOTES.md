Daymark 1.3.0 improves notification defaults, the default window layout, manual file transfer and package size.

## Downloads

- **Windows x64:** `Daymark-Setup-1.3.0.exe`
- **Mac (Apple silicon and Intel):** `Daymark-1.3.0-mac-universal.dmg`
- `SHA256SUMS.txt` contains download checksums.

## What's included

- **Fresh-install notifications fixed:** missing preferences no longer silently disable desktop notifications. An explicit Off preference is preserved. Application and operating-system banner permissions are explained separately. Completed tasks do not trigger reminders.
- **Week fits all seven days:** removed the fixed 870px minimum width; Sunday stays visible without a horizontal scrollbar. Initial window size respects the display work area.
- **Smaller packages:** keep English and Chinese Chromium locale resources and use maximum compression. Audio, graphics, GPU fallback, application features and license notices are retained.
- **Wind chime:** choose a wind chime or short beep, independent from system notification permission.
- **Manual transfer:** export/import CSV or JSON, with stable task IDs and an explicit keep-local/update-from-file merge policy. Chinese text and multiline notes are preserved.
- **Progress at the top:** Open tasks, Little wins and Progress sit beside the page title.

- One-click completion, Undo, and completion history with a dedicated keyword search field and date filters.
- Day, week and month calendars with duration, location, category, notes, and a full event-details panel.
- Native notifications, snooze, a gentle beep with independent mute/volume controls, and background reminders while the app remains in the tray/menu bar.
- Five appearance themes, adjustable fonts and text size, and JSON backup/import.

Windows installation keeps application data beside the install folder in `DaymarkData`, preserving earlier D-drive installations. macOS stores data under the current user's Application Support directory. Closing the window keeps reminders running; Quit stops them.

## Signing and notifications

These builds have no commercial signing certificate. The macOS build is ad-hoc signed, **not Apple Developer ID signed or notarized**, and macOS may block opening it. No Apple signing/notarization success is claimed. Follow the operating system's normal application approval guidance or build from source; do not disable system protections globally.

Enable notifications inside Daymark and test them, then check Daymark's permission in system settings. Sleep, Focus / Do Not Disturb and quitting the app can affect reminders. Packaged-app launch and persistence are checked by CI; a CI build is not a substitute for physical notification testing on your own Mac.
