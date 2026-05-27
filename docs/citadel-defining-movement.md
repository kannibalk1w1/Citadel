# Citadel Defining Movement

Citadel is not primarily a worldbuilding application.

Citadel is an atmospheric archive for memory, research, reference, introspection, and nonlinear thought. It should be able to support worldbuilding, campaign planning, game design, visual development, academic research, personal memory work, and creative investigation, but none of those should become the single governing metaphor.

The core promise is simple:

> Citadel is a dark archival canvas for collecting files, memories, research, fragments, and thoughts, then marking, arranging, and binding them into visible patterns.

## Product Identity

Citadel should feel like:

- an old archive
- a scholar's desk
- a living index
- a ritual research tool
- a chambered memory palace
- a place where files become relics and relationships become visible

It should not become:

- a generic productivity canvas
- a generic mind map
- a worldbuilding-only tool
- a campaign manager with a dark skin
- a dashboard-first knowledge base

The app must remain useful before the theme is noticed. The atmosphere should deepen the act of collecting, searching, annotating, comparing, and connecting. It should not slow those actions down or make ordinary work feel theatrical.

## Core Language

Use broad archival language before niche worldbuilding language.

Preferred vocabulary:

- **Relic**: an imported file, reference, image, note, PDF, audio clip, video, model, capture, or memory fragment.
- **Inscription**: an annotation, note, comment, or written mark attached to a relic, thread, or chamber.
- **Thread**: a visual and logical relationship between relics or thoughts.
- **Sigil**: a searchable tag, marker, category, mood, or conceptual mark.
- **Chamber**: a board or archive space.
- **Index**: the searchable catalogue of relics, inscriptions, threads, sigils, and chambers.
- **Binding**: the act of creating a meaningful thread.
- **Rite**: a repeatable workflow such as gather, bind, compare, reveal, archive, or export.

Avoid making first-class defaults like Character, Place, Clue, Event, or Faction. Those can exist as user-created sigils or templates, but the default product should serve broader research and introspection workflows.

## Experience Pillars

### Archive First

Citadel should accept almost any useful file, preserve source context, generate previews, track missing assets, and make archives portable. The user should trust Citadel with messy, evolving collections.

### Thought Made Visible

The canvas is not just spatial storage. It is a way to see thought. Threads, sigils, annotations, search marks, and chamber layouts should help users discover relationships they did not consciously plan.

### Ritual Without Friction

Interactions can feel ritualistic when they mark an important cognitive act: binding two relics, sealing a save, revealing search results, restoring an archive, or entering a focused chamber. Basic manipulation must remain fast and precise.

### Living Index

Search should feel like the archive waking up. Matching relics should be marked on the canvas with subtle sigil flashes, related threads should glow, and results should be navigable across chambers. The Index should eventually search filenames, tags, annotations, thread labels, metadata, PDF text, OCR text, and asset health.

### Atmospheric Chambers

Boards should evolve into chambers with mood, texture, lighting, ambience, and visual memory. A chamber can be a research wall, a grief archive, a game reference board, a design desk, or a private library shelf.

## Visual Direction

Citadel's atmosphere should draw from dark archival fantasy: stone, vellum, aged gold, soot, candlelight, iron, ash, pale magical marks, and quiet depth.

A useful tonal reference is the feeling of an immense magical library: old, quiet, precise, slightly dangerous, and deeply alive with stored knowledge. Mark systems should feel functional rather than decorative. Sigils and thread marks should behave like a visual language written into the interface.

Do not copy any existing fictional mark system. Build Citadel's own modular mark language.

## Signature Systems

### The Living Index

The Living Index is Citadel's searchable magical catalogue. It should reveal files, memories, notes, tags, and relationships through both a result panel and canvas marks.

Near-term behavior:

- search query matches visibly mark items on the current chamber
- selected results receive a stronger temporary highlight
- tags and item metadata are searchable

Long-term behavior:

- search across all chambers
- follow result trails spatially
- show related sigils and threads
- search annotations, PDF text, OCR text, filenames, metadata, and missing assets
- reveal matching marks with slow appearing and fading sigil effects

### Thread Binding

Thread Binding is Citadel's visual and logical connection system. A thread should mean more than a line. It should capture why two things are connected.

Suggested thread meanings:

- reference
- memory
- source
- echo
- contradiction
- question
- proof
- inspiration
- warning
- sequence

The thread can still be fast to create, but the app should offer lightweight ways to name or classify the bond after it is drawn.

## Performance Doctrine

Citadel must let a user build a large, emotionally dense archive without the archive becoming slow, fragile, or visually noisy.

Performance priorities:

- render only what is near or relevant to the viewport
- use thumbnails before full media
- pause offscreen GIFs, videos, audio visualization, and 3D scenes
- build asset indexing and preview generation in background workers
- use spatial chunking for rendering, hit testing, search marks, minimap, snapping, and export planning
- progressively reveal detail as the user zooms closer
- keep export and archive operations resilient for huge projects

The ideal zoom experience is progressive revelation: distant chambers show silhouettes, sigils, and thread structures; closer views reveal thumbnails and annotations; intimate views wake full media and detailed inscriptions.

## Medium-Term Roadmap

1. Archive engine: ingestion, file health, thumbnails, metadata, portable archives, relinking, recovery.
2. Living Index: searchable sigils, annotations, filenames, thread labels, and canvas reveal marks.
3. Thread logic: typed thread meanings, relationship metadata, and visual binding feedback.
4. Atmospheric chambers: board moods, texture, lighting, optional ambience, and chamber-specific identity.
5. Performance foundation: viewport virtualization, media pausing, thumbnail-first rendering, and worker pipelines.

Worldbuilding templates may be added later, but they should be templates on top of the archive engine, not the foundation.
