## Prompt Saver 2.6.3

The backups window is finished: automatic backups can be switched off and keep
running while the app is open, retention gained a yearly tier, and the page was
rebuilt in two columns. The statistics were trimmed to the numbers that actually
say something, and fourteen tooltips finally describe the setting they sit on.

### Downloads

| File | Use it when |
|---|---|
| `Prompt.Saver_2.6.3_x64-setup.exe` | Installer — choose **all users** or **current user only**; upgrades replace the previous version automatically, your data is kept |
| `prompt-saver.exe` | Portable standalone version — one file, no installation, keeps its data next to itself |

Requires the Microsoft WebView2 runtime (preinstalled on Windows 11 and current Windows 10). If it is missing, the app offers the official Microsoft installer on first start.

### Highlights

- **Automatic backups have an off switch** — and they keep running while the app is open instead of only at launch, so a changed interval takes effect straight away.
- **Yearly retention** — smart retention keeps a number of backups per day, week, month **and** year.
- **Backups window in two columns** — taking a backup, the schedule and the password on the left, retention on the right. The button in the settings is now called **Backup manager** and sits with the other backup buttons.
- **Remove password** is its own button with a confirmation, so Save can never drop the backup password by accident. A stored password shows as dots.
- **Leaner numbers** — backup diagnostics down to the eight figures that matter, usage statistics down to twelve in three rows, with the overview and the per-view breakdown side by side.

### Fixed

- Fourteen tooltips described the wrong thing and were rewritten in all 20 languages.
- "Never used" now means never used, instead of "not used this month".
- Switching smart retention on no longer overwrites the plain keep count.
- The clear button in the backup number fields sat beside the field instead of inside it, and stayed gone once used.
- A backup password you are still typing survives changing another setting on the same page.

The complete list is in the [changelog](../../blob/master/CHANGELOG.md).
