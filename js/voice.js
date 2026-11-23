// Voz de proximidad con WebRTC (1 a 1). La señalización viaja por la base de datos.
// "yo" siempre inicia la llamada; "ella" contesta. El volumen lo controla el juego según la distancia.

export class Voice {
  constructor({ me, iceServers, send, onState }) {
    this.me = me;
    this.ice = iceServers;
    this.send = send;
    this.onState = onState;
    this.stream = null;
    this.pc = null;
    this.sid = null;
    this.pendingIce = [];
    this.remoteToken = 0;
    this.nextTry = 0;
    this.state = "off";
    this.q = Promise.resolve();
    this.audio = document.createElement("audio");
    this.audio.autoplay = true;
    this.audio.setAttribute("playsinline", "");
    this.audio.volume = 0;
    document.body.appendChild(this.audio);
  }

  get enabled() { return !!this.stream; }
  get isCaller() { return this.me === "yo"; }

  _set(s) { if (s !== this.state) { this.state = s; this.onState?.(s); } }

  async enable() {
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
    this.setMic(false);
    this._set("waiting");
  }

  disable() {
    this.hangup(true);
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.remoteToken = 0;
    this._set("off");
  }

  setMic(on) { this.stream?.getAudioTracks().forEach((t) => (t.enabled = on)); }
  setVolume(v) { this.audio.volume = Math.max(0, Math.min(1, v)); }

  // Se llama seguido con la presencia del otro (online + token de voz).
  sync(otherOnline, otherToken) {
    if (!this.enabled) return;
    if (!otherOnline || !otherToken) {
      if (this.pc) this.hangup();
      this.remoteToken = 0;
      this._set("waiting");
      return;
    }
    if (!this.isCaller) return;
    if (otherToken !== this.remoteToken) {
      this.remoteToken = otherToken;
      this.nextTry = 0;
      this.hangup();
      this.call();
    } else if (!this.pc) {
      this.call();
    } else if (this.pc.connectionState === "disconnected") {
      this._disc ??= Date.now();
      if (Date.now() - this._disc > 8000) { this.hangup(); this.nextTry = Date.now() + 2000; }
    } else this._disc = null;
  }

  async call() {
    if (Date.now() < this.nextTry) return;
    this.sid = Math.random().toString(36).slice(2);
    this._makePC();
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    this.send({ type: "offer", sid: this.sid, sdp: offer.sdp });
  }

  handle(s) { this.q = this.q.then(() => this._handle(s)).catch((e) => console.warn("voz:", e)); }

  async _handle(s) {
    if (s.type === "offer") {
      if (!this.enabled) { this.send({ type: "bye", sid: s.sid }); return; }
      this.hangup();
      this.sid = s.sid;
      this._makePC();
      await this.pc.setRemoteDescription({ type: "offer", sdp: s.sdp });
      await this._flushIce();
      const answer = await this.pc.createAnswer();
      await this.pc.setLocalDescription(answer);
      this.send({ type: "answer", sid: this.sid, sdp: answer.sdp });
      return;
    }
    if (!this.pc || s.sid !== this.sid) return;
    if (s.type === "answer") {
      await this.pc.setRemoteDescription({ type: "answer", sdp: s.sdp });
      await this._flushIce();
    } else if (s.type === "ice") {
      if (this.pc.remoteDescription) await this.pc.addIceCandidate(s.c).catch(() => {});
      else this.pendingIce.push(s.c);
    } else if (s.type === "bye") {
      this.hangup();
      this.nextTry = Date.now() + 3000;
    }
  }

  async _flushIce() {
    const list = this.pendingIce; this.pendingIce = [];
    for (const c of list) await this.pc?.addIceCandidate(c).catch(() => {});
  }

  _makePC() {
    const pc = new RTCPeerConnection({ iceServers: this.ice });
    this.pc = pc;
    this.stream.getTracks().forEach((t) => pc.addTrack(t, this.stream));
    pc.onicecandidate = (e) => {
      if (e.candidate && this.pc === pc) this.send({ type: "ice", sid: this.sid, c: e.candidate.toJSON() });
    };
    pc.ontrack = (e) => {
      this.audio.srcObject = e.streams[0];
      this.audio.play().catch(() => {});
    };
    pc.onconnectionstatechange = () => {
      if (this.pc !== pc) return;
      const st = pc.connectionState;
      if (st === "connected") this._set("connected");
      else if (st === "failed") { this.hangup(); this.nextTry = Date.now() + 5000; this._set("failed"); }
      else if (st === "new" || st === "connecting") this._set("connecting");
    };
    this._set("connecting");
  }

  hangup(sendBye = false) {
    if (!this.pc) return;
    if (sendBye) this.send({ type: "bye", sid: this.sid });
    try { this.pc.close(); } catch {}
    this.pc = null;
    this.sid = null;
    this.pendingIce = [];
    this.audio.srcObject = null;
    if (this.enabled && this.state !== "failed") this._set("waiting");
  }
}
