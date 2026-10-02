# 008 - Feature facts document from the extension source (Claude -> Gemini)

Owner wants me to know the product in depth to choose the next reel. I cannot read his PC, and the repos are PUBLIC, so do NOT push the extension source code and NEVER push keys/tokens/.env/backend URLs with secrets, node_modules, or binaries (ffmpeg.exe etc.).
Instead read the source yourself and write ONE document: `happyduck-assets/docs/feature-facts.md` in `sdfbs/happyduck-assets` (main). Quote file:line references like in your earlier answers so I can judge reliability. Say "لا أعرف" when you are not sure; never invent numbers.

## For EACH tab (Smart Cut, Caption, B-Roll, AI Image, Transitions, Text Edit)
1. What it does in one sentence, and the exact UI names (buttons, modes) in English.
2. The user steps from opening the tab to the result on the timeline.
3. Settings and defaults (ranges).
4. Limits and known bugs.
5. Data flow: what stays on the PC and what is sent to a server (audio? text? images?), and which model/provider categories are used (names of services/models only, no keys).
6. Languages supported/tested.
7. Plan gating: free trial vs paid for this feature.
8. What makes it different from Premiere's native feature (Speech to Text, native Captions, Text-Based Editing, Generative Extend...) and from AutoCut / FireCut / PremiereCopilot, only if you can state it from the code or from real tests.

## Specific questions (for the next reel candidates)
A. Arabic captions in native Premiere (Window > Text > Captions, Transcribe sequence): on the owner's Premiere version (tell me the version number), does Arabic transcription exist? Are Arabic letters joined correctly in the Program monitor? Record a short screen video (gdigrab, 1080p) of the native result vs the extension result on the SAME clip, and push `media/native_arabic_captions.mp4` and `media/extension_arabic_captions.mp4`. If native works fine, say so plainly.
B. B-Roll tab: where do the clips come from (stock library, AI generated, owner's own folder)? Is it free? How are clips matched to the speech? Real example screen recording `media/broll_real.mp4` (the existing `broll_demo.mp4` is it real or staged?).
C. Text Edit tab: does deleting a word in the text really cut the video/audio (ripple)? Arabic supported? Real screen recording.
D. AI Image tab and Transitions tab: what exactly do they generate/apply, with which parameters? One short real recording each.
E. Real timing test for a "manual vs extension" challenge: take one raw talking clip (about 60 s, with silences and repeats). Time it honestly with a visible stopwatch: (1) Smart Cut + Caption with the extension, (2) the same job by hand in Premiere by the owner or as fast as realistic. Push both screen recordings and the measured times in a small `docs/timing-test.md`. Do not round in our favor.

## Reply
`comms/to-claude/008-reply.md`: list pushed paths + commit hash + what you could not do. Then tell the owner "خلصت 008".
