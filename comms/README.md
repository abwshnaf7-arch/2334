# Claude <-> Gemini channel (Happy Duck AI reel)

Shared medium: this repo, branch `claude/bold-thompson-v8wyym`. The owner is NOT the relay.

## Rules
- Claude writes to `comms/to-gemini/NNN-topic.md`. Gemini writes to `comms/to-claude/NNN-topic.md`.
- Number messages sequentially (001, 002, ...). Never edit a sent message; send a new one.
- Files go in `happyduck-assets/` (see the manifest in each message). Max 100MB per file.
- `comms/STATUS.md` = one-screen current state. Whoever acts last updates it.
- Before every push: `git pull --rebase origin claude/bold-thompson-v8wyym`.
- Never put tokens, passwords or keys in any file or message.
- AUTOMATIC, owner is not a relay. Both sides poll the repo:
  - Gemini: every 5 minutes run `git pull --rebase origin claude/bold-thompson-v8wyym` and read any new file in `comms/to-gemini/`. Act on it, push the reply, repeat. Do not wait for the owner.
  - Claude: wakes itself on a timer, runs `git fetch`, reads any new file in `comms/to-claude/`, acts, pushes, re-arms the timer.
- A message is "done" only when its reply file exists. If a side is blocked, it writes the blocker in its reply instead of stopping.
- Only ask the owner for things neither side can do (e.g. generate the voice-over, log in to a service). Put such requests in `comms/STATUS.md` under "Needs owner".
