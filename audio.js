
/*
 * MicroPlanting — Calm Cinematic Violin Audio Engine
 * Browser-generated music. No audio files required.
 *
 * Features:
 * - Soft, sustained violin-like synthesized strings
 * - Slow, peaceful chord progressions
 * - Gentle vibrato and expressive volume swells
 * - Independent two-tone emergency buzzer
 * - Music ducks when an alarm activates
 * - Master volume is saved locally
 *
 * Browser audio starts only after user interaction.
 * This does NOT control the physical ESP32 buzzer.
 */

const S = {
  music: false,
  alarm: false,
  wanted: false,
  vol: 0.35
};

try {
  const saved = parseFloat(localStorage.getItem("mp-vol"));
  if (Number.isFinite(saved) && saved >= 0 && saved <= 1) {
    S.vol = saved;
  }
} catch (_) {}

const AC = () => window.AudioContext || window.webkitAudioContext;

let ctx = null;
let master = null;
let musicBus = null;
let alarmBus = null;
let musicFilter = null;

let voices = [];
let musicTimer = null;
let chordTimer = null;
let alarmTimer = null;
let chordIndex = 0;

// Warm, gentle major/minor seventh harmonies.
// Frequencies are selected for a soft orchestral atmosphere.
const CHORDS = [
  [261.63, 329.63, 392.00, 493.88], // Cmaj7
  [220.00, 261.63, 329.63, 392.00], // Am7
  [174.61, 220.00, 261.63, 329.63], // Fmaj7
  [196.00, 246.94, 293.66, 392.00], // G6
  [146.83, 196.00, 246.94, 293.66], // Dm7
  [164.81, 196.00, 246.94, 329.63]  // Em7
];

function init() {
  if (ctx) return ctx;
  if (!AC()) return null;

  ctx = new AC();

  master = ctx.createGain();
  master.gain.value = S.vol;
  master.connect(ctx.destination);

  // Smooth out harsh high frequencies.
  musicFilter = ctx.createBiquadFilter();
  musicFilter.type = "lowpass";
  musicFilter.frequency.value = 2400;
  musicFilter.Q.value = 0.45;
  musicFilter.connect(master);

  musicBus = ctx.createGain();
  musicBus.gain.value = 0;
  musicBus.connect(musicFilter);

  alarmBus = ctx.createGain();
  alarmBus.gain.value = 0.65;
  alarmBus.connect(master);

  // Four string-like voices, each with a fundamental
  // and a quiet upper harmonic.
  const initialChord = CHORDS[0];

  initialChord.forEach((frequency, index) => {
    const voice = createViolinVoice(frequency, index);
    voices.push(voice);
  });

  return ctx;
}

function createViolinVoice(frequency, index) {
  const input = ctx.createGain();
  input.gain.value = 0.0001;
  input.connect(musicBus);

  // Multiple oscillators create a richer bowed-string sound.
  const main = ctx.createOscillator();
  main.type = "sawtooth";
  main.frequency.value = frequency;

  const mainGain = ctx.createGain();
  mainGain.gain.value = 0.20;
  main.connect(mainGain);
  mainGain.connect(input);

  const warmth = ctx.createOscillator();
  warmth.type = "triangle";
  warmth.frequency.value = frequency;
  warmth.detune.value = -5;

  const warmthGain = ctx.createGain();
  warmthGain.gain.value = 0.65;
  warmth.connect(warmthGain);
  warmthGain.connect(input);

  // A very quiet octave adds a cinematic string shimmer.
  const octave = ctx.createOscillator();
  octave.type = "sine";
  octave.frequency.value = frequency * 2;

  const octaveGain = ctx.createGain();
  octaveGain.gain.value = 0.09;
  octave.connect(octaveGain);
  octaveGain.connect(input);

  // Slow vibrato, like a violinist sustaining a note.
  const vibrato = ctx.createOscillator();
  vibrato.type = "sine";
  vibrato.frequency.value = 4.4 + index * 0.12;

  const vibratoDepth = ctx.createGain();
  vibratoDepth.gain.value = 1.7;

  vibrato.connect(vibratoDepth);
  vibratoDepth.connect(main.detune);
  vibratoDepth.connect(warmth.detune);
  vibratoDepth.connect(octave.detune);

  // Slight independent motion prevents a mechanical sound.
  const swell = ctx.createOscillator();
  swell.type = "sine";
  swell.frequency.value = 0.07 + index * 0.009;

  const swellDepth = ctx.createGain();
  swellDepth.gain.value = 0.025;

  swell.connect(swellDepth);
  swellDepth.connect(input.gain);

  main.start();
  warmth.start();
  octave.start();
  vibrato.start();
  swell.start();

  // Fade into the first note smoothly.
  input.gain.setValueAtTime(0.0001, ctx.currentTime);
  input.gain.linearRampToValueAtTime(
    0.16,
    ctx.currentTime + 3 + index * 0.7
  );

  return {
    main,
    warmth,
    octave,
    input,
    index
  };
}

function changeChord() {
  if (!ctx || !voices.length) return;

  chordIndex = (chordIndex + 1) % CHORDS.length;
  const chord = CHORDS[chordIndex];
  const now = ctx.currentTime;

  // Slow, smooth pitch transitions.
  voices.forEach((voice, index) => {
    const frequency = chord[index];

    [voice.main, voice.warmth].forEach(oscillator => {
      oscillator.frequency.cancelScheduledValues(now);
      oscillator.frequency.setTargetAtTime(
        frequency,
        now,
        1.8
      );
    });

    voice.octave.frequency.setTargetAtTime(
      frequency * 2,
      now,
      1.8
    );
  });
}

function violinPhrase() {
  if (!ctx || !S.music) return;

  // A soft upper-register melody, played one note at a time.
  // These are sine/triangle tones blended for a gentle,
  // violin-like quality rather than a sharp electronic beep.
  const notes = [
    659.25, 587.33, 523.25, 587.33,
    659.25, 783.99, 659.25, 587.33,
    523.25, 493.88, 523.25, 587.33
  ];

  const note = notes[Math.floor(Math.random() * notes.length)];
  const now = ctx.currentTime;

  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();
  const vibrato = ctx.createOscillator();
  const vibratoGain = ctx.createGain();

  osc1.type = "triangle";
  osc2.type = "sine";

  osc1.frequency.value = note;
  osc2.frequency.value = note * 1.003;

  vibrato.type = "sine";
  vibrato.frequency.value = 4.8;
  vibratoGain.gain.value = 1.1;

  vibrato.connect(vibratoGain);
  vibratoGain.connect(osc1.detune);
  vibratoGain.connect(osc2.detune);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(0.045, now + 0.7);
  gain.gain.setValueAtTime(0.045, now + 2.0);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 3.5);

  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(musicBus);

  osc1.start(now);
  osc2.start(now);
  vibrato.start(now);

  osc1.stop(now + 3.6);
  osc2.stop(now + 3.6);
  vibrato.stop(now + 3.6);
}

function tone(frequency, start, duration, type, volume, destination) {
  if (!ctx) return;

  const now = ctx.currentTime + start;
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, now);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(volume, now + 0.015);
  gain.gain.setValueAtTime(volume, now + duration - 0.035);
  gain.gain.linearRampToValueAtTime(0.0001, now + duration);

  oscillator.connect(gain);
  gain.connect(destination);

  oscillator.start(now);
  oscillator.stop(now + duration);
}

function alarmCycle() {
  if (!ctx) return;

  // Retain the original two-tone emergency alarm.
  tone(880, 0, 0.22, "square", 0.16, alarmBus);
  tone(660, 0.28, 0.22, "square", 0.16, alarmBus);
}

function confirmationChime() {
  if (!ctx) return;

  tone(523.25, 0, 0.45, "sine", 0.10, alarmBus);
  tone(659.25, 0.22, 0.55, "sine", 0.10, alarmBus);
}

function applyAlarm() {
  if (!ctx) return;

  const shouldRun = S.alarm && S.wanted;

  if (shouldRun && !alarmTimer) {
    ctx.resume();

    alarmCycle();
    alarmTimer = setInterval(alarmCycle, 1000);

    // Quieten the soundtrack without stopping it.
    if (S.music) {
      musicBus.gain.setTargetAtTime(
        0.20,
        ctx.currentTime,
        0.25
      );
    }
  } else if (!shouldRun && alarmTimer) {
    clearInterval(alarmTimer);
    alarmTimer = null;

    if (S.music) {
      musicBus.gain.setTargetAtTime(
        1,
        ctx.currentTime,
        0.8
      );
    }
  }
}

export const audio = {
  state: S,

  supported() {
    return !!AC();
  },

  setMusic(on) {
    S.music = !!on;

    if (on) {
      if (!init()) {
        S.music = false;
        return;
      }

      ctx.resume();

      musicBus.gain.setTargetAtTime(
        alarmTimer ? 0.20 : 1,
        ctx.currentTime,
        2.5
      );

      if (!chordTimer) {
        chordTimer = setInterval(changeChord, 16000);
      }

      if (!musicTimer) {
        // Let the strings settle before the melody enters.
        violinPhrase();
        musicTimer = setInterval(violinPhrase, 4200);
      }
    } else {
      if (musicBus) {
        musicBus.gain.setTargetAtTime(
          0,
          ctx.currentTime,
          1.8
        );
      }

      clearInterval(musicTimer);
      clearInterval(chordTimer);

      musicTimer = null;
      chordTimer = null;
    }
  },

  setVolume(value) {
    const v = Number(value);
    if (!Number.isFinite(v)) return;

    S.vol = Math.max(0, Math.min(1, v));

    if (master && ctx) {
      master.gain.setTargetAtTime(
        S.vol,
        ctx.currentTime,
        0.12
      );
    }

    try {
      localStorage.setItem("mp-vol", String(S.vol));
    } catch (_) {}
  },

  setAlarmEnabled(on) {
    S.alarm = !!on;

    if (S.alarm && !init()) {
      S.alarm = false;
      return;
    }

    applyAlarm();
  },

  setAlarmActive(on) {
    const wasActive = S.wanted;
    S.wanted = !!on;

    if (S.wanted && !init()) return;

    applyAlarm();

    if (wasActive && !S.wanted && S.alarm && ctx) {
      confirmationChime();
    }
  },

  test() {
    if (!init()) return;

    ctx.resume();
    alarmCycle();

    setTimeout(() => {
      if (ctx) alarmCycle();
    }, 1000);
  }
};
