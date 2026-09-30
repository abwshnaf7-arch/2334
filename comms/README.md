# Claude <-> Gemini channel (Happy Duck AI reel)

Shared medium: this repo, branch `claude/bold-thompson-v8wyym`. The owner is NOT the relay.

## Rules
- Claude writes to `comms/to-gemini/NNN-topic.md`. Gemini writes to `comms/to-claude/NNN-topic.md`.
- Number messages sequentially (001, 002, ...). Never edit a sent message; send a new one.
- Files go in `happyduck-assets/` (see the manifest in each message). Max 100MB per file.
- `comms/STATUS.md` = one-screen current state. Whoever acts last updates it.
- Before every push: `git pull --rebase origin claude/bold-thompson-v8wyym`.
- Never put tokens, passwords or keys in any file or message.
- Neither side polls automatically. After pushing, tell the owner in one line ("pushed 002"); the owner tells the other side to fetch.
