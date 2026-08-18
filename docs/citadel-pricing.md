# Pricing

Settled 2026-08-18. Revisit once there is a month of real data.

---

## The decision

| | Minimum | Suggested | When |
|---|---|---|---|
| **Launch** | `$0` | **`$5`** | 0.1.x early access, unsigned, no track record |
| **Established** | `$0` | **`$15`** | Once the Windows and Linux builds have been through a few releases and bugs are being closed on the stated cadence |

Name-your-price with a **$0 minimum**, not a hard floor, on both.

---

## Why $0 minimum

A floor would be theatre. The source is MIT and building it takes two commands,
which the author is explicitly happy about — so a minimum price cannot gate
access to anything, it only gates the download button. What it *would* do is
turn away the people most likely to tell others about the app.

itch's own figure: **30% of all money spent on the platform is paid above the
minimum.** Pay-what-you-want does better than intuition suggests, and the
category leader agrees — PureRef has run this exact model for years.

The one thing a $0 minimum costs is itch's ownership distinction: people who pay
get a download key and count as owners, people who take the free download do
not. That only matters if Citadel ever moves to a hard price, at which point the
free downloaders would have no claim. Worth knowing; not worth pricing for.

---

## Why $5, then $15

**The anchors, as of 2026-08-18:**

| Tool | Model | Price |
|---|---|---|
| **PureRef** | Pay-what-you-want, free tier | **$15** personal suggested · $49 small business (3 seats) · $8–10/seat/mo business |
| **Ref Flow** | Free V1.0 + paid Pro | **$29 lifetime**, free updates |
| Eagle | One-time | ~$30 |

PureRef is the closest comparison by some distance: same category, same
audience, same pay-what-you-want model, and it is the tool people already have
open. Its **$15 personal** figure is what a working artist thinks a reference
board is worth.

`docs/citadel-vs-refflow.md` already concluded that Ref Flow's $29 "sets a
ceiling… Citadel's answer has to be either a clearly lower price or a clearly
better tool." Both anchors point the same way.

**$5 at launch** because the thing being priced is a 0.1.0 from one person, with
unsigned builds and a SmartScreen warning on first run, and no history of
shipping fixes. $5 is an easy yes that asks nobody to take a risk, and it sits
where itch buyers already expect small tools to sit. It is deliberately *not*
$0-suggested: a suggested price of nothing tells people the author does not
think it is worth anything.

**$15 once established** puts Citadel at parity with the category leader's
personal licence and at roughly half of Ref Flow, which is defensible in both
directions — cheaper than the direct competitor, level with the tool everyone
respects. Raising a suggested price on itch costs nothing and breaks nothing;
existing owners keep their key.

---

## Revenue share

itch uses **open revenue sharing**: the creator chooses what percentage of sales
goes to the platform. There is no enforced cut. Pick a number deliberately
rather than leaving whatever the form defaults to.

Payment processing fees are separate and are not documented on the Creator FAQ —
check the payments documentation before doing any maths on net income.

Refunds are handled by itch on the creator's behalf in **both** payment modes,
whether money goes direct to a Stripe/PayPal account or is collected by itch.

---

## What would change this

- **A month of data.** If nobody pays above $5, the suggested figure is not the
  problem and the listing is. If most pay above, raise it sooner.
- **Signing.** A signed build removes the SmartScreen warning, which is the main
  thing making Citadel feel like a risk at launch. That is the moment $15 stops
  needing an argument.
- **Ref Flow moving.** The $29 ceiling is theirs to change.
