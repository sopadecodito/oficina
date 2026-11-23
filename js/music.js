// "¿Qué estoy escuchando?": Spotify automático (opcional) o manual.
const KEY = "vo:spotify";
const SCOPES = "user-read-currently-playing user-read-playback-state";
const redirectUri = () => location.origin + location.pathname;

const b64url = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; } };
const save = (v) => (v ? localStorage.setItem(KEY, JSON.stringify(v)) : localStorage.removeItem(KEY));

export function spotifyConnected() { return !!load()?.refresh; }

export async function spotifyLogin(clientId) {
  const verifier = b64url(crypto.getRandomValues(new Uint8Array(48)));
  const challenge = b64url(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier)));
  sessionStorage.setItem("vo:pkce", verifier);
  const q = new URLSearchParams({
    response_type: "code", client_id: clientId, scope: SCOPES,
    code_challenge_method: "S256", code_challenge: challenge, redirect_uri: redirectUri(),
  });
  location.href = "https://accounts.spotify.com/authorize?" + q;
}

// Llamar al cargar la página: si venimos de Spotify con ?code=..., cambia el código por tokens.
export async function spotifyHandleRedirect(clientId) {
  const q = new URLSearchParams(location.search);
  const code = q.get("code");
  if (!code && !q.get("error")) return false;
  history.replaceState(null, "", location.pathname + location.hash);
  const verifier = sessionStorage.getItem("vo:pkce");
  if (!code || !verifier || !clientId) return false;
  const r = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: redirectUri(), client_id: clientId, code_verifier: verifier }),
  });
  if (!r.ok) return false;
  const j = await r.json();
  save({ access: j.access_token, refresh: j.refresh_token, exp: Date.now() + j.expires_in * 1000 - 60000 });
  return true;
}

export function spotifyLogout() { save(null); }

async function token(clientId) {
  const s = load();
  if (!s) return null;
  if (Date.now() < s.exp) return s.access;
  const r = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: s.refresh, client_id: clientId }),
  });
  if (!r.ok) { if (r.status === 400) save(null); return null; }
  const j = await r.json();
  save({ access: j.access_token, refresh: j.refresh_token || s.refresh, exp: Date.now() + j.expires_in * 1000 - 60000 });
  return j.access_token;
}

// Devuelve {title, artist, url} o null si no suena nada
export async function spotifyNowPlaying(clientId) {
  const tk = await token(clientId);
  if (!tk) return undefined;
  const r = await fetch("https://api.spotify.com/v1/me/player/currently-playing", { headers: { Authorization: "Bearer " + tk } });
  if (r.status === 204) return null;
  if (!r.ok) return undefined;
  const j = await r.json();
  if (!j?.is_playing || !j.item) return null;
  return {
    title: j.item.name,
    artist: (j.item.artists || j.item.show && [j.item.show] || []).map((a) => a.name).join(", "),
    url: j.item.external_urls?.spotify || "",
  };
}
