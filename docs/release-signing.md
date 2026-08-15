# Citadel Code Signing and Release Builds

How a tagged Citadel release is built, signed, and attached to a GitHub Release.
This covers items 2 and 4 of the [Release-Candidate Checklist](./release-candidate-checklist.md);
[Release Readiness Lite](./release-readiness-lite.md) remains the local, by-hand path.

Windows x64 only. Nothing here is written for Linux or macOS.

---

## The workflow

`.github/workflows/release.yml` runs on `windows-latest` and is triggered by
pushing a tag matching `v*`. It can also be run by hand from the Actions tab
(`workflow_dispatch`), which builds and uploads a workflow artifact without
touching any release unless the tag box is ticked.

In order it:

1. Installs dependencies with `npm ci`.
2. Refuses to continue if the tag does not match `package.json`'s `version` —
   `v0.2.0` requires `"version": "0.2.0"`. Bump, commit, then tag.
3. Runs `npm run typecheck` and `npm test -- --run`.
4. Reports whether a signing certificate is configured, in the job summary.
5. Runs `npm run package -- --win --x64 --publish never`, producing
   `Citadel-<version>-setup.exe` and `Citadel-<version>-portable.exe` in `dist/`.
6. Uploads both as a workflow artifact, kept 14 days.
7. On a tag, creates a **draft** GitHub Release with generated notes if one does
   not exist, and uploads the two executables to it.

The release is left as a draft on purpose. Publishing is a deliberate act — it is
the last point at which an unsigned or wrong-versioned installer can be caught
before a buyer can download it.

No `latest.yml` is generated and nothing is pushed to an update feed, because
Citadel has no update feed yet. See item 3 of the release-candidate checklist;
until that is settled, the workflow deliberately does not pretend otherwise.

---

## Configuring the certificate

electron-builder reads two environment variables, and the workflow passes them
through from repository secrets:

| Secret | Environment variable | Contents |
|---|---|---|
| `WINDOWS_CERT_BASE64` | `CSC_LINK` | The `.pfx`/`.p12` certificate, base64-encoded |
| `WINDOWS_CERT_PASSWORD` | `CSC_KEY_PASSWORD` | That certificate's password |

Encode the certificate:

```bash
base64 -w 0 citadel-codesign.pfx > citadel-codesign.pfx.b64   # Linux
```

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("citadel-codesign.pfx")) | Set-Content citadel-codesign.pfx.b64
```

Then add both under **Settings → Secrets and variables → Actions → New repository
secret**. The certificate file itself never enters the repository, and neither
does the base64 copy — delete it once the secret is set.

With neither secret present the build still succeeds and produces unsigned
artifacts. The job summary says so, in a warning block, so an unsigned build
cannot be mistaken for a signed one at a glance.

---

## Which certificate

- **OV (organisation validation)** — a file-based `.pfx`, which is what the two
  secrets above assume. Cheapest path, works in hosted CI unchanged. SmartScreen
  reputation accrues over downloads, so the first buyers may still see a warning
  that fades as the installer is downloaded more.
- **EV (extended validation)** — immediate SmartScreen reputation, but the key
  lives on a hardware token or in an HSM and cannot be handed to a hosted
  runner as a file. Using one means either a self-hosted Windows runner with the
  token attached, or a cloud signing service (Azure Trusted Signing,
  DigiCert KeyLocker, SSL.com eSigner), each of which replaces the `Package`
  step's env block with its own action or signing hook.

Choose before buying: the certificate type decides the shape of the workflow,
and OV → EV later means a second purchase.

Whichever is used, once a certificate is in place set `win.publisherName` in
`package.json` to the exact subject name on the certificate, otherwise
electron-updater will later reject signed builds it should accept.

---

## Verifying a signed build

On the runner, electron-builder fails the build if signing itself fails, so a
green build with the secrets set means both executables are signed. Confirm by
hand on the downloaded artifacts:

```powershell
Get-AuthenticodeSignature .\Citadel-0.1.0-setup.exe | Format-List Status, SignerCertificate, TimeStamperCertificate
```

`Status` must be `Valid` and `TimeStamperCertificate` must not be empty — an
untimestamped signature stops verifying the day the certificate expires.

Then do what the checklist asks and run the installer on a Windows machine that
has never seen a Citadel build, watching what SmartScreen does. That is the only
test that reflects what a buyer sees.

---

## Cutting a release

```bash
# 1. Bump the version and commit it
npm version 0.2.0 --no-git-tag-version
git commit -am "chore: release 0.2.0"

# 2. Tag and push
git tag v0.2.0
git push origin master --tags
```

Then watch the Actions run, download the draft release's artifacts, walk the
manual smoke checklist in the release-candidate checklist on a clean Windows
machine, and only then publish the draft.
