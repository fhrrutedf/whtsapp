/**
 * Pure Web Audio API Sound Synthesizer for high-end subtle notifications.
 * Zero external audio files, zero CORS latency, crystal-clear tones.
 */

export function playNotificationChime(isEscalation = false): void {
  if (typeof window === 'undefined') return;

  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    if (isEscalation) {
      // Urgent but elegant harmonic chime: F5 (698Hz) -> A5 (880Hz) -> C6 (1046Hz)
      const frequencies = [698.46, 880.0, 1046.5];
      frequencies.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.1);

        gain.gain.setValueAtTime(0, now + idx * 0.1);
        gain.gain.linearRampToValueAtTime(0.15, now + idx * 0.1 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.1 + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.1);
        osc.stop(now + idx * 0.1 + 0.4);
      });
    } else {
      // Gentle, subtle crystalline chime: D5 (587Hz) -> A5 (880Hz)
      const frequencies = [587.33, 880.0];
      frequencies.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.09);

        gain.gain.setValueAtTime(0, now + idx * 0.09);
        gain.gain.linearRampToValueAtTime(0.1, now + idx * 0.09 + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.09 + 0.28);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.09);
        osc.stop(now + idx * 0.09 + 0.32);
      });
    }
  } catch (err) {
    // Gracefully handle any browser autoplay restrictions
  }
}
