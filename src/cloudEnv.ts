// Drapeau cloud isolé (importable sans tirer de composant React).
// Convex est actif dès que `npx convex dev` a écrit VITE_CONVEX_URL.
export const CONVEX_URL = import.meta.env.VITE_CONVEX_URL as string | undefined
export const CLOUD_ENABLED = Boolean(CONVEX_URL)
