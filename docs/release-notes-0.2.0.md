# Citadel 0.2.0

Mostly a repair release. Almost everything here came from people actually using
the thing and running into walls I hadn't, which is the only way some of these
would ever have turned up.

---

## Connections

**Code cards can be connected now.** They couldn't be, at all. Every other kind
of item on the board answered the Connect tool; code was the one that didn't, so
a connection could neither start from a snippet nor land on one. Clicking just
selected the card and the connection quietly vanished. If you'd been trying to
wire a snippet into a board and assumed you were holding it wrong, you weren't.

**YouTube embeds can be connected too.** Same symptom, different cause. A
YouTube item is a live embedded page, and clicks inside it never reached
Citadel. Now the whole card is one target while you're drawing a connection, so
you don't have to hunt for its border. As a bonus, video and audio items no
longer start playing when you only meant to connect them.

**Click an empty part of the board to let go of a connection.** Selecting a
connection used to trap you: the only way out was to close its panel. Clicking
empty space does it now, the same as it does for items.

**Two panels stop fighting over the same corner.** Select an item, then a
connection, and both inspectors appeared in exactly the same place, stacked on
top of each other. Now selecting one dismisses the other.

---

## Link and Tag

**Both tools work on every kind of item.** They worked on three of the eleven.
On the other eight (video, audio, YouTube, 3D, GIFs, text, comparisons and code)
clicking with the Link or Tag tool did nothing whatsoever. No message, no
refusal, just nothing. Every item has always carried a link and tags; the tools
simply never asked most of them.

**The Link tool says when there's nothing to open**, rather than doing nothing
and leaving you guessing whether the tool was broken.

---

## Keyboard shortcuts

**The toolbar was lying about two of them.**

The Record button offered `R`. Recording was on `Ctrl+R`, and nothing at all was
bound to plain `R`, so the one key it advertised did nothing. The Comparison
tool offered `P`, which was worse: no key was bound to it at all.

Both work now, and every shortcut the interface shows is read from your actual
keybindings, so if you rebind something the tooltip follows. They were typed out
by hand before, which is why they'd drifted.

**`Ctrl+R` and Reload were also fighting.** Both sat on the same key in the View
menu, so one of them was always dead. Reload has moved to `Ctrl+Shift+R`.

---

## Working on the board

**Resize handles are bigger**, and their grab area is bigger still, a little
wider than the square you can see, so you stop sliding off the corner.

**Drag on empty space to select a group of items.** A rubber band, the way you'd
expect. A plain click still clears the selection.

**Click an item and you can just drag it.** If you were on the Pan tool, or had
left a placement tool active, clicking an item used to do nothing and the item
refused to move until you noticed the toolbar. Now it hands you back the Select
tool and moves. Connect, Link and Tag are left alone, since a click means
something specific in those.

**Notes open for typing straight away.** Place one and the cursor is already in
it, the same as a text item, with no double-click. The tool steps back to Select
afterwards, because you almost never want to place six notes in a row.

**Pan is a hand.** It was a four-way arrow, which is the icon for moving a
*thing*, not the view. The cursor was always a hand; now the button agrees.

---

## Click-through, on Linux

If you've used overlay mode on Linux, the Stop panel never worked. Not since a
recent build, but never. It's worth explaining, because the fix changes how it
behaves everywhere.

Making a window click-through is all or nothing: the whole window ignores the
mouse. Keeping one small panel clickable meant watching where your cursor was
and briefly handing the mouse back as it arrived. On Wayland an application
isn't allowed to see the pointer while its window is ignoring the mouse, so that
reading froze at wherever your cursor happened to be when you turned the mode
on, and the panel could never notice you approaching it. It sat there looking
like a button and did nothing.

Stop is now a small window of its own that simply never ignores the mouse.
Nothing has to be watched or guessed, and it behaves the same on Windows, macOS
and Linux. `Ctrl+Alt+C` still gets you out from anywhere, and Citadel still
refuses to turn click-through on at all if it can't register that shortcut
first.

---

## Try it in a browser

There's now a **browser demo**: Citadel as a static web page, so anyone can open
a board and push things around without installing anything. It's built to be
hosted on a page like itch.io.

It's the real application, not a mock-up or a video. The same canvas, the same
items, the same connections and panels, running the same code the desktop build
runs. It opens straight into the example project so there's something to poke at
immediately.

What it can't do is anything that needs your computer. The desktop app talks to
the filesystem and the window through a single bridge, and the browser build
swaps in a stand-in for that bridge: it serves the bundled example, remembers
your display preferences in the browser, and politely returns nothing for opening
files, saving, exporting and the window modes. So there's no opening your own
images, no saving, and changes reset when you reload the tab. A small notice in
the corner says so, and Open project becomes Reset demo.

Keeping it to one bridge was the point. The demo isn't a fork or a rewrite, it's
the same renderer with a different back end behind it, so it can't drift away
from the real thing as the app moves on.

---

## Under the hood

Building Citadel locally was producing a 1.18 GB package, because old release
artifacts in the working folder were being swept into the app. It's back to
around 154 MB. Official builds were never affected, since they build from a
clean checkout, but anyone building from source was getting a very silly file.

---

*Thanks to everyone who reported these. The shortcut that lies to you and the
button that does nothing are both much easier to spot from the outside.*
