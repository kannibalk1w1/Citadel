/**
 * Build-time runtime flag shared by browser-only UI adaptations.
 *
 * Electron leaves this unset. The standalone demo build defines it explicitly
 * so the desktop renderer never has to infer its host from user-agent details.
 */
export const isBrowserDemo = import.meta.env.VITE_CITADEL_DEMO === 'true'
