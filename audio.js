// Browser-only sound: calm generated ambient music + alert buzzer tone. No audio files, nothing is downloaded.
// Browsers block sound until a user presses a button, so everything starts OFF. This never controls or confirms the ESP32 buzzer.
const S = { music: false, alarm: false, wanted: false, vol: .5 };
try { const v = parseFloat(localStorage.getItem("mp-vol")); if (v >= 0 && v <= 1) S.vol = v; } catch (e) { /* storage unavailable */ }
const CH = [[130.81,164.81,196,246.94],[110,130.81,164.81,196],[87.31,130.81,164.81,220],[98,146.83,196,246.94]]; // Cmaj7, Am7, Fmaj7, G6
let ctx, master, musicG, alarmG, voices = [], ci = 0, musicTimer = null, alarmTimer = null;
const AC = () => window.AudioContext || window.webkitAudioContext;
function init() {
  if (ctx) return ctx; if (!AC()) return null;
  ctx = new (AC())(); master = ctx.createGain(); master.gain.value = S.vol; master.connect(ctx.destination);
  const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 900;
  musicG = ctx.createGain(); musicG.gain.value = 0; musicG.connect(lp); lp.connect(master);
  alarmG = ctx.createGain(); alarmG.connect(master);
  CH[0].forEach((f, i) => [-5, 5].forEach(d => { const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "triangle"; o.frequency.value = f; o.detune.value = d; g.gain.value = .05; o.connect(g); g.connect(musicG); o.start(); voices.push({ o, i }); }));
  const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = .06; lg.gain.value = 250; lfo.connect(lg); lg.connect(lp.frequency); lfo.start();
  return ctx;
}
const nextChord = () => { ci = (ci + 1) % CH.length; voices.forEach(v => v.o.frequency.setTargetAtTime(CH[ci][v.i], ctx.currentTime, 2.5)); };
const duck = on => { if (musicG && S.music) musicG.gain.setTargetAtTime(on ? .25 : 1, ctx.currentTime, .4); };
function tone(f, at, len, type, vol, dest) {
  const t = ctx.currentTime + at, o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.value = f; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .02);
  g.gain.setValueAtTime(vol, t + len - .04); g.gain.linearRampToValueAtTime(0, t + len); o.connect(g); g.connect(dest); o.start(t); o.stop(t + len);
}
const cycle = () => { tone(880, 0, .22, "square", .16, alarmG); tone(660, .28, .22, "square", .16, alarmG); }; // two-tone buzzer
const chime = () => { tone(523, 0, .5, "sine", .12, alarmG); tone(659, .25, .6, "sine", .12, alarmG); };
function apply() {
  const run = S.alarm && S.wanted;
  if (run && !alarmTimer) { init(); ctx.resume(); cycle(); alarmTimer = setInterval(cycle, 1000); duck(true); }
  else if (!run && alarmTimer) { clearInterval(alarmTimer); alarmTimer = null; duck(false); }
}
export const audio = {
  state: S,
  supported: () => !!AC(),
  setMusic(on) {
    S.music = !!on;
    if (on) { if (!init()) { S.music = false; return; } ctx.resume(); musicG.gain.setTargetAtTime(alarmTimer ? .25 : 1, ctx.currentTime, 1.5); if (!musicTimer) musicTimer = setInterval(nextChord, 14000); }
    else { if (musicG) musicG.gain.setTargetAtTime(0, ctx.currentTime, .6); clearInterval(musicTimer); musicTimer = null; }
  },
  setVolume(v) { S.vol = Math.min(1, Math.max(0, v)); if (master) master.gain.setTargetAtTime(S.vol, ctx.currentTime, .1); try { localStorage.setItem("mp-vol", S.vol); } catch (e) { /* ignore */ } },
  setAlarmEnabled(on) { S.alarm = !!on; if (on && !init()) S.alarm = false; apply(); },
  setAlarmActive(on) { const was = S.wanted; S.wanted = !!on; apply(); if (was && !on && S.alarm && ctx) chime(); },
  test() { if (!init()) return; ctx.resume(); cycle(); setTimeout(cycle, 1000); }
};
