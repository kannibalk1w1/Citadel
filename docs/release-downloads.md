# Separate desktop downloads

The public 0.3 upload combines both platforms in a 505 MB ZIP. Offer the four
desktop artifacts separately, so users download only what they need. Keep the
HTML demo as its own playable upload.

Use verified release artifacts from the release workflow, without rebuilding
or changing their contents. For the existing 0.3 release, an authenticated
maintainer can download the draft's individual artifacts:

```bash
gh release download v0.3.0 --repo kannibalk1w1/Citadel --pattern '*.exe' --pattern '*.AppImage' --pattern '*.tar.gz' --dir dist/itch-source-0.3.0
npm run release:itch -- --source dist/itch-source-0.3.0 --version 0.3.0
```

The preparation command verifies that all four expected files exist, copies
them into a new `dist/itch-0.3.0` directory, and generates `SHA256SUMS.txt` plus
an upload manifest with readable labels and platforms. It refuses to overwrite
an existing output directory. Use `--output <new-directory>` to prepare another
copy. It does not upload or publish anything.

In itch's editor, upload each file from that directory. Set Windows on the two
`.exe` files and Linux on the AppImage and tar.gz. Name the rows **Windows
installer**, **Windows portable**, **Linux AppImage**, and **Linux tar.gz**.
Include the checksums as an additional download. Once the separate uploads are
available, retire the combined ZIP. Preserve the HTML demo row and its playable
settings.

Page copy is maintained in [itch-listing.md](./itch-listing.md). It describes
the public release, not unreleased changes on development branches. The
[research walkthrough](./research-workflow.md) gives new users a concrete
starting point. Publish its link only after that document is available on the
repository's default branch.
