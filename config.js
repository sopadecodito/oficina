// ============================================================
//  CONFIGURACIÓN DE LA OFICINA  — edita solo este archivo
// ============================================================

export const CONFIG = {
  // Nombres que aparecen sobre cada personaje
  names: {
    yo: "José",
    ella: "Diana",
  },

  // Pega aquí la config de tu proyecto de Firebase (ver README.md).
  // Mientras sea null, la página corre en MODO DEMO: funciona entre
  // dos pestañas del mismo navegador, ideal para probar.
  firebase: {
    apiKey: "AIzaSyAIOkt_G0AwmzGg6ujOn55swUI1i_HcI9o",
    authDomain: "office-b65ac.firebaseapp.com",
    databaseURL: "https://office-b65ac-default-rtdb.firebaseio.com",
    projectId: "office-b65ac",
    storageBucket: "office-b65ac.firebasestorage.app",
    messagingSenderId: "527054041265",
    appId: "1:527054041265:web:574a3cd10ecb243fb8b290",
  },
  /* Ejemplo:
  firebase: {
    apiKey: "AIza...",
    authDomain: "nuestra-oficina.firebaseapp.com",
    databaseURL: "https://nuestra-oficina-default-rtdb.firebaseio.com",
    projectId: "nuestra-oficina",
    appId: "1:123:web:abc",
  },
  */

  // Spotify (opcional): pon aquí el Client ID de tu app de Spotify para que
  // la canción se detecte sola. Sin esto, cada quien puede escribirla a mano.
  spotifyClientId: "",

  // Quién tiene silla giratoria (puede rodar con ella y dar vueltas)
  swivel: { yo: true, ella: false },

  // Servidores para la voz. Los STUN gratis bastan en casi todas las redes;
  // si en tu oficina la voz se queda en "Conectando…", agrega un TURN (ver README).
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],

  // Estatus de cada quien. "silence: true" pausa la voz de proximidad
  // automáticamente mientras estás en ese estatus (para no colarte en una llamada).
  statuses: {
    yo: [
      { id: "esperando", label: "Esperando llamada", emoji: "📞", sprite: "phone", color: "#5cc46a" },
      { id: "llamada",   label: "En llamada",        emoji: "🎧", color: "#ff5c6c", silence: true },
      { id: "junta",     label: "En junta",          emoji: "👥", color: "#ffb340", silence: true },
      { id: "comida",    label: "Comida",            emoji: "🍔", color: "#ff8f3f" },
      { id: "descanso",  label: "Descanso",          emoji: "☕", color: "#5cb8ff" },
    ],
    ella: [
      { id: "comida",      label: "Comida",      emoji: "🍔", color: "#ff8f3f" },
      { id: "junta",       label: "Junta",       emoji: "👥", color: "#ffb340", silence: true },
      { id: "concentrada", label: "Concentrada", emoji: "🎯", color: "#b77cff" },
    ],
  },

  // Objetos que se pueden llevar al escritorio del otro
  gifts: [
    { id: "flores",    emoji: "💐", name: "Ramo de flores" },
    { id: "rosa",      emoji: "🌹", name: "Rosa" },
    { id: "girasol",   emoji: "🌻", name: "Girasol" },
    { id: "tulipan",   emoji: "🌷", name: "Tulipán" },
    { id: "regalo",    emoji: "🎁", name: "Regalo" },
    { id: "carta",     emoji: "💌", name: "Cartita" },
    { id: "osito",     emoji: "🧸", name: "Osito" },
    { id: "cheetos",   sprite: "cheetos", emoji: "🔥", name: "Cheetos Flamin' Hot" },
    { id: "cafe",      emoji: "☕", name: "Cafecito" },
    { id: "galleta",   emoji: "🍪", name: "Galleta" },
    { id: "dona",      emoji: "🍩", name: "Dona" },
    { id: "chocolate", emoji: "🍫", name: "Chocolate" },
    { id: "pastel",    emoji: "🍰", name: "Pastelito" },
    { id: "cactus",    emoji: "🌵", name: "Cactus" },
    { id: "globo",     emoji: "🎈", name: "Globo" },
    { id: "estrella",  emoji: "⭐", name: "Estrellita" },
    { id: "corazon",   emoji: "💖", name: "Corazón" },
  ],
};
