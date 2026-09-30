# Happy Duck AI - Panel Capture Tool

CLI tool to capture pixel-perfect, 2x high-resolution screenshots from the live Adobe Premiere CEP panel over Chrome DevTools Protocol (CDP port 8889).

## Usage
```bash
# Capture English panel states (saved to root /)
node capture_panel.js --lang en

# Capture Arabic panel states (saved to /ar)
node capture_panel.js --lang ar

# Capture both languages
node capture_panel.js --lang all
```

## Requirements
- Adobe Premiere Pro running with Happy Duck AI extension open.
- CEP debug port 8889 enabled via `.debug` file and `PlayerDebugMode=1`.
