import { Injectable } from '@angular/core';

type SoundType = 'number-called' | 'kinh' | 'winner' | 'mark' | 'error' | 'join' | 'start' | 'near-win';

@Injectable({ providedIn: 'root' })
export class AudioService {
  private audioContext: AudioContext | null = null;
  private enabled = true;

  private getContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }
    return this.audioContext;
  }

  toggle(): boolean {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  play(sound: SoundType) {
    if (!this.enabled) return;

    try {
      const ctx = this.getContext();
      switch (sound) {
        case 'number-called':
          this.playTone(ctx, 880, 0.1, 'sine');
          break;
        case 'kinh':
          this.playSequence(ctx, [523, 659, 784, 1047], 0.15);
          break;
        case 'winner':
          this.playWinnerFanfare(ctx);
          break;
        case 'mark':
          this.playTone(ctx, 600, 0.05, 'sine');
          break;
        case 'error':
          this.playTone(ctx, 200, 0.2, 'sawtooth');
          break;
        case 'join':
          this.playTone(ctx, 440, 0.1, 'sine');
          break;
        case 'start':
          this.playSequence(ctx, [440, 550, 660], 0.15);
          break;
        case 'near-win':
          this.playNearWinAlert(ctx);
          break;
      }
    } catch {
      // Audio not available
    }
  }

  private playTone(ctx: AudioContext, freq: number, duration: number, type: OscillatorType) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  }

  private playSequence(ctx: AudioContext, freqs: number[], noteDuration: number) {
    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const startTime = ctx.currentTime + i * noteDuration;
      gain.gain.setValueAtTime(0.15, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + noteDuration * 0.9);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + noteDuration);
    });
  }

  /**
   * Suspenseful near-win alert: rapid ascending tones with tremolo
   * to create excitement and tension.
   */
  private playNearWinAlert(ctx: AudioContext) {
    const now = ctx.currentTime;

    // Rising 3-note alert: D5 → F#5 → A5 (tension chord)
    const notes = [
      { freq: 587, start: 0, dur: 0.12 },
      { freq: 740, start: 0.10, dur: 0.12 },
      { freq: 880, start: 0.20, dur: 0.35 },
    ];

    for (const note of notes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = note.freq;
      const t = now + note.start;
      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + note.dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + note.dur + 0.01);
    }

    // Tremolo shimmer on the held note for suspense
    const tremOsc = ctx.createOscillator();
    const tremGain = ctx.createGain();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();

    tremOsc.type = 'sine';
    tremOsc.frequency.value = 880;
    lfo.type = 'sine';
    lfo.frequency.value = 12; // 12Hz tremolo
    lfoGain.gain.value = 0.08;

    lfo.connect(lfoGain);
    lfoGain.connect(tremGain.gain);
    tremGain.gain.setValueAtTime(0.12, now + 0.30);
    tremGain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
    tremOsc.connect(tremGain);
    tremGain.connect(ctx.destination);

    tremOsc.start(now + 0.30);
    lfo.start(now + 0.30);
    tremOsc.stop(now + 0.66);
    lfo.stop(now + 0.66);
  }

  /**
   * Grand celebratory fanfare with layered harmonics, trumpet-style melody,
   * and a shimmering finale.
   */
  private playWinnerFanfare(ctx: AudioContext) {
    const now = ctx.currentTime;

    // --- Layer 1: Triumphant brass-style melody (C major fanfare) ---
    const melody: { freq: number; start: number; dur: number; vol: number }[] = [
      // Opening flourish: C5 E5 G5
      { freq: 523, start: 0, dur: 0.18, vol: 0.18 },
      { freq: 659, start: 0.15, dur: 0.18, vol: 0.18 },
      { freq: 784, start: 0.30, dur: 0.22, vol: 0.20 },
      // Held high C
      { freq: 1047, start: 0.50, dur: 0.45, vol: 0.22 },
      // Descending grace: G5 E5
      { freq: 784, start: 0.90, dur: 0.12, vol: 0.14 },
      { freq: 659, start: 1.00, dur: 0.12, vol: 0.14 },
      // Final triumphant climb: G5 -> C6
      { freq: 784, start: 1.10, dur: 0.20, vol: 0.18 },
      { freq: 988, start: 1.28, dur: 0.20, vol: 0.20 },
      { freq: 1047, start: 1.46, dur: 0.55, vol: 0.24 },
    ];

    for (const note of melody) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = note.freq;
      const t = now + note.start;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(note.vol, t + 0.02);
      gain.gain.setValueAtTime(note.vol, t + note.dur * 0.6);
      gain.gain.exponentialRampToValueAtTime(0.001, t + note.dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + note.dur + 0.01);
    }

    // --- Layer 2: Warm bass foundation (octave below, sine) ---
    const bassNotes = [
      { freq: 262, start: 0, dur: 0.50 },
      { freq: 262, start: 0.50, dur: 0.50 },
      { freq: 330, start: 1.10, dur: 0.30 },
      { freq: 262, start: 1.46, dur: 0.55 },
    ];
    for (const note of bassNotes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = note.freq;
      const t = now + note.start;
      gain.gain.setValueAtTime(0.10, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + note.dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + note.dur + 0.01);
    }

    // --- Layer 3: Shimmering sparkle effect (high-frequency twinkles) ---
    const sparkles = [0.05, 0.25, 0.55, 0.80, 1.15, 1.50, 1.70];
    for (const t of sparkles) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 2400 + Math.random() * 1600;
      const start = now + t;
      gain.gain.setValueAtTime(0.06, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.1);
    }
  }
}
