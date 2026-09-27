/// <reference types="vite/client" />

interface ImportMetaEnv {
    // Base URL of the graph API, e.g. "/api" (behind CloudFront or the Vite dev proxy).
    // When unset, graphs are built in the browser instead.
    readonly VITE_API_URL?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
