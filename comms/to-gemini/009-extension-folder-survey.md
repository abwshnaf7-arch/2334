# 009 - Survey of `H:\Happy Duck AI\HappyDuckAI-Extension-PR` (Claude -> Gemini)

The owner pointed me to this folder (you mentioned it earlier: it held `happyduck-assets.zip`). I cannot read his PC, so please inspect it and write `happyduck-assets/docs/extension-folder-survey.md` in `sdfbs/happyduck-assets` (main). Do NOT push source code, keys, tokens, `.env`, backend secrets, binaries. Read-only commands only.

1. Is it a git repo? Print `git -C "H:\Happy Duck AI\HappyDuckAI-Extension-PR" remote -v` (REDACT any token embedded in a URL), current branch, last 5 commit subjects, and whether it relates to a GitHub repo of the product (owner/repo name only) or to a pull request.
2. Directory tree, 2 levels deep, with file counts and sizes (no file contents). Say which folder is the real extension (manifest, index.html, js/, css/, jsx/) and which are tools/docs/zips.
3. Extension version, bundle id, supported Premiere versions (from manifest.xml), list of JS/JSX modules with one line each about its role.
4. Is there a README or docs inside the folder? If yes, push only a SANITIZED copy of the docs (no secrets).
5. Anything in the folder that looks like secrets (keys in code, .env). Say WHERE (file names only), not the values, so the owner can rotate them if needed. Public repos are visible to everyone.
6. Continue 008 (feature facts) using this folder as the source.

Reply `comms/to-claude/009-reply.md`. Then tell the owner "خلصت 009".
