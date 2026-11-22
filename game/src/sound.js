// Ember Court — sound, synthesized with WebAudio and nothing else: no audio
// files, no network. Every call is guarded, so a browser without audio (or a
// headless screenshot run) simply stays silent.
let context = null;
let muted = false;

export function setMuted(value) {
  muted = value;
}

export function isMuted() {
  return muted;
}

function audio() {
  if (muted) return null;
  try {
    if (!context) context = new (window.AudioContext || window.webkitAudioContext)();
    if (context.state === 'suspended') void context.resume();
    return context;
  } catch {
    return null;
  }
}

function tone(frequency, seconds, type, gainValue, when = 0) {
  const ctx = audio();
  if (!ctx) return;
  try {
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime + when);
    gain.gain.exponentialRampToValueAtTime(gainValue, ctx.currentTime + when + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + when + seconds);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start(ctx.currentTime + when);
    oscillator.stop(ctx.currentTime + when + seconds + 0.05);
  } catch {
    // Sound is garnish: never let it break the game.
  }
}

export function playClick() {
  tone(620, 0.07, 'triangle', 0.08);
}

export function playCardSound() {
  tone(330, 0.12, 'triangle', 0.12);
  tone(495, 0.14, 'sine', 0.1, 0.05);
}

export function playDamageSound(big) {
  tone(big ? 110 : 160, 0.18, 'sawtooth', 0.12);
  tone(90, 0.22, 'square', 0.07, 0.02);
}

export function playHealSound() {
  tone(520, 0.16, 'sine', 0.09);
  tone(780, 0.2, 'sine', 0.08, 0.09);
}

export function playTurnSound() {
  tone(440, 0.1, 'triangle', 0.08);
}

export function playWinSound() {
  [523, 659, 784, 1047].forEach((frequency, index) => tone(frequency, 0.3, 'triangle', 0.11, index * 0.12));
}

export function playLoseSound() {
  [392, 330, 262, 196].forEach((frequency, index) => tone(frequency, 0.32, 'triangle', 0.1, index * 0.13));
}
