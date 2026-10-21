/// <reference types="svelte" />
/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Indirizzo di Home Assistant, es. http://10.10.50.10:8123 (dal file .env, mai su git). */
  readonly VITE_HA_URL?: string;
}
