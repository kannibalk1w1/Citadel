// In-memory identity for the currently loaded project. It deliberately never
// enters the .citadel file: it only invalidates renderer work that was started
// before a project was replaced.
let revision = 0

export function projectSessionRevision(): number {
  return revision
}

export function beginProjectSession(): void {
  revision += 1
}
