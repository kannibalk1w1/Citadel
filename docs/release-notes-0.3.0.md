# Citadel 0.3.0

The customisation release. Citadel stops deciding how it looks and hands that
over: your own stylesheets, your own fonts, your own mascot, and a palette taken
from a terminal rather than a manuscript.

It also learns to listen. Voice notes become text on the board without anything
leaving your machine.

0.2.0 was written but never released, so everything in
[its notes](./release-notes-0.2.0.md) ships here too. That was the repair
release: connections for code cards and YouTube embeds, a click-through Stop
that works, marquee select, bigger resize handles, and the rest.

---

## Transcription

**Drop in a voice note, right-click, Transcribe.** The words land on the board
as an ordinary text item, connected back to the recording they came from. It is
a normal text item, so it is searchable, editable, exportable, and undoable like
anything else you type.

**It runs on this machine.** The audio is never uploaded. Transcription uses
whisper.cpp, which ships with Citadel, and a language model you choose in
Settings. Downloading that model is the only time Citadel touches the network,
and only when you press the button.

**Three models, so you can trade speed against accuracy.** Fast is roughly
30 MB and quick. Balanced is the sensible default and still faster than real
time on most machines. Careful is the one for noisy rooms and accents, and it
handles languages other than English. Each is checked against a published
checksum on the way in, and anything that does not match is thrown away rather
than installed.

**Already keep whisper models?** Point Citadel at the `.bin` you have and it
downloads nothing at all.

A long note shows a progress card in the corner with a Cancel button, and the
board stays usable while it runs. Timestamps are kept with the transcript, so a
future version can click a sentence back to the moment it was said.

---

## Making it yours

**Your own CSS.** Every colour, size and edge in Citadel is a CSS variable, and
now you can move them. Drop `.css` files into the snippets folder, switch them
on in Settings, and they are applied after the theme in the order you enabled
them. This is the Obsidian arrangement, and it means a snippet of ten lines can
restyle the whole app without a plugin API.

**Your own fonts.** Drop font files into the fonts folder and assign them to
headings, interface text or monospace, or just type the name of anything already
installed on this machine. Blank means the font Citadel ships with.

**A Terminal theme.** Green phosphor on near-black, with the code card finally
agreeing with the interface instead of being the one blue surface in a green
room. Citadel, Graphite and Parchment light are all still there.

**The mascot is a choice again.** It was removed in the last clean-up pass,
which turned out to be a decision made on everyone's behalf. There is now a
drawn tower, a drawn rook, any image you like, or nothing at all. Each one shows
what the board is doing: lit on a save, red while a recording runs. The artwork
is original and drawn in the repo, so nothing in Citadel now depends on an image
whose origin nobody could account for.

---

## Settings

**The panel is called Settings.** It was called Keybindings, and had not been
only keybindings for a long time: it holds the theme, exports, transcription,
maintenance, customisation and shortcuts.

**Edit → Settings.** It used to live behind the toolbar's overflow menu and
nowhere else, which was a long reach for the panel that holds everything.

---

## Fixes

**Right-click works on video, audio, YouTube and 3D items.** These sit above the
canvas, so a right-click never reached the menu underneath. The context menu was
simply unreachable for four of the eleven item types.

**A PDF that will not open says so.** A dropped PDF that failed used to vanish
without a word. It now names the file and, where there is one, the step that
fixes it: an unprotected copy for a password-protected file, and a plain answer
for a damaged one.

**Holding a key no longer makes the canvas flash.** With the typing flourish
switched on, holding a key, and space most of all, restarted the screen shake
about thirty times a second. On Linux that also opened a few pixels of bare
desktop at the edge of the window on every shake. A held key is now one
keystroke, and nothing shows through the app.

**Choosing the Citadel theme paints the Citadel theme.** Its swatch still held
the old gold accent the palette moved off months ago, so picking the preset
named after the default theme repainted the app in a colour it no longer uses.

**Your theme survives a restart.** Any theme added after the first three was
silently forgotten when the app reopened.

**Nothing is fetched without you asking.** Two places would have read a source
straight from a project file, and a `.citadel` file is made to be handed around.
Both now check the source is a local file before opening it, and a test fails if
a third one ever appears.
