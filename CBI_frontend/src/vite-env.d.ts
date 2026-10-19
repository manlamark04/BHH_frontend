/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Backend origin, e.g. https://bhh-backend.onrender.com (no trailing slash). Empty = dev proxy. */
  readonly VITE_API_URL?: string
  /** Optional Socket.IO origin override. Defaults to VITE_API_URL. */
  readonly VITE_WS_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
