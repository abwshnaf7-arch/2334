# Claude <-> Gemini channel: facts and operation (keep this file accurate)

## Who is who
- Claude: cloud sandbox session, repo `abwshnaf7-arch/2334`, branch `claude/bold-thompson-v8wyym`. Builds the video. Cannot see the owner's PC, cannot self-wake (send_later/cron were denied by the permission classifier), cannot download from external hosts (catbox was denied), HuggingFace is blocked (no Whisper).
- Gemini (Antigravity): runs on the owner's Windows PC. Has: terminal without approvals, git, the extension source (`C:\Users\hp 007\AppData\Roaming\Adobe\CEP\extensions\HappyDuckAI\`), reel projects (`F:\reels for happey duck ai\...`), Premiere. No GitHub MCP, no `gh`. Browser is logged in as GitHub user `sdfbs` (NOT `abwshnaf7-arch`; owner cannot log in as it).
- Owner: non-technical, wants to be out of the loop. Only actions: generate the voice-over (TTS), one-time browser login popups, and say "كمل" to Claude / "خلصت" relay when a side finishes.

## Repos and direction (this is what works)
| Direction | Where | Auth |
|---|---|---|
| Claude -> Gemini | public `https://github.com/abwshnaf7-arch/2334`, branch `claude/bold-thompson-v8wyym`, `comms/to-gemini/NNN-*.md`, `comms/README.md`, `comms/STATUS.md`, `comms/SCRIPT.md` | Gemini reads anonymously (git clone/pull). Claude pushes with its session credentials. |
| Gemini -> Claude | public `https://github.com/sdfbs/happyduck-assets`, branch `main`: `happyduck-assets/**` (assets), `comms/to-claude/NNN-reply.md` | Gemini pushes (browser login as `sdfbs`). Claude clones/pulls anonymously: `git clone https://github.com/sdfbs/happyduck-assets.git /home/user/assets-repo` |

Why not one repo: Gemini's login is `sdfbs` which has no write access to `abwshnaf7-arch/2334` (403), and the owner cannot log in as `abwshnaf7-arch`.

## Operating loop
1. Claude writes `comms/to-gemini/NNN-*.md` (see `gemini/asset-request-template.md`), commits, pushes, tells the owner to paste `gemini/onboarding-message.md` (filled) to Gemini ONCE if Gemini seems to have forgotten (otherwise just "اقرا الرسالة NNN").
2. Gemini pulls, does the work, pushes assets + `comms/to-claude/NNN-reply.md`, tells the owner "خلصت".
3. Owner says "كمل". Claude runs `git -C /home/user/assets-repo pull`, reads the reply, LOOKS at every asset (images/frames) to verify, then builds.
4. Repeat with NNN+1. Numbers so far: 001 setup/assets, 002 autonomous mode, 003 VO transcription (words.json still pending), 004 capture-method docs + generalized capture tool + fixed ui_09 + Arabic re-capture.

## Troubleshooting
- Gemini says push is 403 / "denied to sdfbs": he is pushing to the wrong repo. He must push to `sdfbs/happyduck-assets`.
- Gemini cannot push: owner signs in via the browser popup as `sdfbs` once. To reset cached credentials: `"protocol=https`nhost=github.com`n`n" | git credential-manager erase`.
- `sdfbs/happyduck-assets` empty/missing: owner creates it (github.com/new, name `happyduck-assets`, Public, no README) while logged in as `sdfbs`.
- Gemini's files in the wrong place / renamed: ask again with exact paths; Claude never guesses.
- Anything pushed to a public repo is public (owner accepted this).
- Never ask for, accept, or forward tokens.
