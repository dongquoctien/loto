import { Injectable } from '@angular/core';

type SoundType = 'number-called' | 'kinh' | 'winner' | 'mark' | 'error' | 'join' | 'start';

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
          this.playSequence(ctx, [523, 659, 784, 1047, 784, 1047], 0.2);
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
}
