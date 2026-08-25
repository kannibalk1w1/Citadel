# Citadel 0.3

Two big additions this time, plus a stack of fixes that had been sitting in a
release I never actually put out.

## Voice notes turn into text

Drop an audio file onto a board, right click it, hit Transcribe. The words come
back as a normal text item, wired back to the recording it came from. It is a
normal text item, which is the point: you can edit it, search it, export it and
undo it exactly like anything else you typed.

It all happens on your machine. Nothing is uploaded, ever. Citadel uses
whisper.cpp, which ships inside the app, plus a language model you pick in
Settings. Downloading that model is the only time Citadel touches the internet,
and only when you press the button.

There are three models to choose between, trading speed against accuracy. The
fast one is about 30 MB and does a good job on clear speech. The careful one is
bigger, handles noisy recordings and accents, and speaks languages other than
English. If you already keep whisper models around, point Citadel at the file
you have and it downloads nothing at all.

## You can restyle the whole thing now

Every colour, size and edge in Citadel is a CSS variable, so I have opened that
up properly. Drop a .css file into the snippets folder, tick it in Settings, and
it loads on top of the theme. Ten lines is enough to change the entire look, and
you do not need a plugin API or a rebuild.

Fonts work the same way. Drop a .woff2, .ttf or .otf into the fonts folder, or
just type the name of something already installed on your machine, and assign it
to headings, interface text or monospace.

There is also a new Terminal theme: green phosphor on near black. It is what my
own notes look like, and it turns out a canvas full of reference images sits
very happily inside it.

## The tower is back

I removed the mascot a while ago because of the machinery behind it, which was a
mess, and I took the tower out along with it. That was a decision I made on
everyone's behalf and I made it badly. It is back, and it is a choice now: the
tower, a drawn rook, any image you like, or nothing at all. It also got redrawn
from scratch so the artwork is properly ours.

## Everything else

Settings is called Settings. It was called Keybindings, which stopped being true
a long time ago, and it now sits in the Edit menu instead of hiding behind a
toolbar overflow.

Right clicking works on video, audio, YouTube and 3D items. Those four sit above
the canvas, so the menu underneath never heard the click. Four of eleven item
types had no context menu at all and I had not noticed.

A PDF that will not open now says why instead of vanishing quietly.

Holding a key no longer makes the canvas flash. If you had the typing effects
turned on, holding space, which is also the pan shortcut, restarted the screen
shake about thirty times a second. On Linux it also opened a few pixels of bare
desktop at the edge of the window each time.

Picking a theme now sticks after a restart. Any theme past the first three was
being thrown away on load, so the app quietly went back to default however many
times you chose otherwise.

Everything from the 0.2 notes ships here too, since 0.2 never made it out the
door. That was the repair release: connections for code cards and YouTube
embeds, marquee select by dragging empty canvas, a click through Stop button
that works, bigger resize handles, and a lot more.

## One heads up

The Windows builds are not signed yet, so Windows will tell you the publisher is
unknown and ask if you are sure. That is a certificate I am still sorting out.
The source is on GitHub if you would rather read it or build it yourself.
