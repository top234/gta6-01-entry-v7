// Topaz Bay radio: three stations synthesized live with WebAudio — no audio
// files, no network. Bay FM drifts on soft chords, Turbo 101 drives a bass
// line, Harbour Jazz swings a walking bass under a muted lead.
export const RADIO_STATIONS = [
  { name: 'BAY FM 88.5', genre: 'COASTAL CHILL', songs: ['Golden Hour Drive', 'Salt Air Serenade', 'Palm Shade Slowdown'], bpm: 76, wave: 'sine' },
  { name: 'TURBO 101', genre: 'STREET BASS', songs: ['Redline Runner', 'Night Shift Nitro', 'Full Send Avenue'], bpm: 128, wave: 'sawtooth' },
  { name: 'HARBOUR JAZZ 95', genre: 'LATE JAZZ', songs: ['Dockside Blue', 'The Longshoreman Waltz', 'Fog Over Pier 9'], bpm: 96, wave: 'triangle' },
];

const CHORDS = [
  [261.63, 329.63, 392.0], [220.0, 261.63, 329.63],
  [174.61, 220.0, 261.63], [196.0, 246.94, 293.66],
];

export class RadioStations {
  constructor(state) {
    this.state = state;
    this.ctx = null;
    this.master = null;
    this.timer = null;
    this.beat = 0;
    this.songIndex = 0;
    this.songStartedAt = 0;
  }

  get current() { return RADIO_STATIONS[this.state.radioStation]; }
  get currentSong() { return this.current.songs[this.songIndex % this.current.songs.length]; }

  // AudioContext only starts after a user gesture (the title screen click).
  ensureAudio() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.14;
      this.master.connect(this.ctx.destination);
      this._scheduleLoop();
    } catch {
      this.ctx = null;
    }
  }

  _scheduleLoop() {
    if (this.timer) clearInterval(this.timer);
    const stepMs = 60000 / this.current.bpm / 2;
    this.timer = setInterval(() => this._playStep(), stepMs);
  }

  _playStep() {
    if (!this.ctx || !this.state.radioOn) return;
    if (this.beat % 64 === 0 && this.beat > 0) this.songIndex += 1;
    const station = this.current;
    const chord = CHORDS[Math.floor(this.beat / 8) % CHORDS.length];
    const t = this.ctx.currentTime;
    const step = this.beat % 8;
    // Bass note on the beat, chord pad on the bar, hats on the off-beat.
    if (step % 2 === 0) this._tone(chord[0] / 2, t, 0.22, station.wave, 0.5);
    if (step === 0) for (const f of chord) this._tone(f, t, 0.9, 'sine', 0.12);
    if (step % 2 === 1) this._tone(6000 + Math.random() * 2000, t, 0.03, 'square', 0.03);
    if (station.name.startsWith('TURBO') && step === 4) this._tone(chord[2] * 2, t, 0.15, 'sawtooth', 0.2);
    if (station.name.startsWith('HARBOUR') && step === 6) this._tone(chord[1] * 2, t, 0.3, 'triangle', 0.16);
    this.beat += 1;
  }

  _tone(freq, when, dur, wave, vol) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = wave;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, when);
    gain.gain.exponentialRampToValueAtTime(0.001, when + dur);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(when);
    osc.stop(when + dur + 0.02);
  }

  nextStation() {
    this.state.radioStation = (this.state.radioStation + 1) % RADIO_STATIONS.length;
    this.songIndex = 0;
    this.beat = 0;
    this._scheduleLoop();
    return this.current;
  }

  togglePower() {
    this.state.radioOn = !this.state.radioOn;
    return this.state.radioOn;
  }

  // Short synthesized blips for UI and game events (no audio files needed).
  blip(freq = 880, dur = 0.12) {
    if (!this.ctx) return;
    this._tone(freq, this.ctx.currentTime, dur, 'sine', 0.25);
  }
}
