# Design source

Imported from Claude Design project `639ccb88-d5ab-4fb9-915e-808ba8916c23`
("Tokenized Stock Strategy App v3 Dark") via the `DesignSync` MCP.

| File | Role |
| --- | --- |
| `src/v3-dark.html` | The design document. 17 screens across 7 turns. Inline styles + a `{{ }}` template runtime. Reference only — not shipped. |
| `src/integration-notes.md` | Screen → SDK call mapping for Privy and SnapTrade. The closest thing to a written spec for those surfaces. |
| `src/dither-field.js` | Original WebGL/GLSL ordered-dither shader. Ported to SkSL in `src/components/dither-field.tsx`. |

Two files from the project are deliberately **not** vendored:

- `ios-frame.jsx` — a web device frame (status bar, dynamic island, home indicator).
  On a real device `expo-status-bar` + `react-native-safe-area-context` provide all of it.
- `support.js` — the Claude Design canvas template runtime (`// GENERATED from dc-runtime`).
  Harness, not product.

## Screen inventory

Turn 7 supersedes turn 4's home screen; turn 6 is nav-bar exploration resolved by 7a-1.

| ID | Screen |
| --- | --- |
| `7a-1` | Portfolio home — two destinations plus the verb (**final home**) |
| `4a-2` | Consolidated exposure |
| `4a-3` | Concentrated builder (live sliders) |
| `4a-4` | Review — hold to sign |
| `4a-5` | Corporate action — 10-for-1 split |
| `4a-6` | Active position + activity |
| `5a-1` | Privy login — whitelabel OTP + wallet creation |
| `5a-2` | Wallet & security — recovery, MFA, export |
| `5a-3` | SnapTrade Connection Portal — sandbox handoff |
| `5a-4` | Connections — sync status & data freshness |
| `5a-5` | Delegated session |
| `5a-6` | Add funds — handoff to Privy's funding sheet |

## Working on one screen

`design/src/v3-dark.html` holds all 17 screens in one ~120KB file. To split it
into `design/screens/<id>.html`:

```bash
python3 design/split-screens.py
```

The output is gitignored — it is derived from the source and committing it
would duplicate the whole document a second time.
