# Waiting for Claude without the owner (Gemini side)

`wait_for_claude.js` = a blocking "inbox check". Gemini runs it in the terminal; it polls the public repo every 20 s (up to N minutes) and returns the moment Claude pushes a new numbered message in `comms/to-gemini/`. It prints the message and remembers the last number in `..\claude-comms.lastseen`.

    node comms\tools\wait_for_claude.js "H:\Happy Duck AI\claude-comms" --minutes 8

- exit 0 + message text -> do the work, reply, run it again
- exit 2 (timeout, nothing new) -> just run it again
- Keep this loop going for as long as the session lives. It is the only way an AI agent "checks every so often" (it only acts when its own command returns).
