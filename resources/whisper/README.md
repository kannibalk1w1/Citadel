# Transcription engine

Citadel transcribes voice notes with [whisper.cpp](https://github.com/ggml-org/whisper.cpp),
run as a child process. Everything in this folder except this file is fetched,
not committed:

```bash
npm run engine          # fetches for the current platform
npm run package         # runs it first, then builds the installer
```

`scripts/fetchWhisperEngine.mjs` downloads a pinned upstream release, checks it
against a pinned SHA-256, and unpacks only the engine and its ggml libraries
here. A second run costs nothing; `--force` re-fetches, and `--platform win32`
fetches for a platform you are not on.

The binaries are not in source control for three reasons. They are platform
specific. They come as a set of shared libraries rather than one file. And a
locally built copy is compiled for the machine that built it, since whisper.cpp
defaults `GGML_NATIVE` on, so it would fail with an illegal instruction on an
older CPU rather than with a message. Upstream's release builds carry every ggml
CPU variant and choose one at runtime, which is the portability a hand-built
binary lacks.

`src/main/transcription.ts` looks for `whisper-cli.exe` on Windows and
`whisper-cli` elsewhere, in `resources/whisper/` inside a packaged app and in
this folder during development.

Without the engine Citadel still builds and runs: transcription refuses with a
named reason, and Settings offers a "Choose binary" button for anyone who builds
whisper.cpp themselves.

Models are a separate matter and none are bundled at all. Settings downloads one
on request and verifies it against a pinned SHA-256, or points at a `.bin` the
person already has. The catalogue is in `src/types/transcription.ts`.
