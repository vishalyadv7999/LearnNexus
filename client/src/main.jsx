import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import ErrorBoundary from "./common/components/ErrorBoundary";
import { AuthProvider } from "./features/auth/context/AuthContext";
import "./index.css";

const PLAYLIST_MAPPING_CACHE_VERSION = "2026-06-29-pinned-apna-college-wallah-exact-links-v6";

try {
  const versionKey = "learnnexus:playlist-mapping-version";
  const currentVersion = window.localStorage.getItem(versionKey);

  if (currentVersion !== PLAYLIST_MAPPING_CACHE_VERSION) {
    Object.keys(window.localStorage)
      .filter((key) => key.startsWith("learnnexus:video-history:"))
      .forEach((key) => window.localStorage.removeItem(key));
    window.sessionStorage?.clear();
    window.localStorage.setItem(versionKey, PLAYLIST_MAPPING_CACHE_VERSION);
    if (import.meta.env.DEV) {
      console.debug("[LearnNexus] Playlist mapping cache refreshed", {
        version: PLAYLIST_MAPPING_CACHE_VERSION,
        source: "frontend constant",
      });
    }
  }
} catch (_error) {
  // Browser storage cleanup is best-effort and must never block app startup.
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
