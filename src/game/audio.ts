type Sound = 'start' | 'catch' | 'bonus' | 'miss' | 'gameover';
const MELODIES: Record<Sound, readonly number[]> = {
  start: [330, 440, 660],
  catch: [740, 988],
  bonus: [523, 659, 784, 1047],
  miss: [220, 165],
  gameover: [330, 262, 196, 131],
};

export function createAudio() {
  let context: AudioContext | null = null;
  let master: GainNode | null = null;
  let enabled = true;
  let pending: Sound | null = null;

  const schedule = (audio: AudioContext, destination: GainNode, sound: Sound) => {
    MELODIES[sound].forEach((frequency, index) => {
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      const at = audio.currentTime + index * 0.085;
      oscillator.type = 'square';
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0, at);
      gain.gain.linearRampToValueAtTime(0.025, at + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.001, at + 0.075);
      oscillator.connect(gain);
      gain.connect(destination);
      oscillator.start(at);
      oscillator.stop(at + 0.08);
      oscillator.onended = () => {
        oscillator.disconnect();
        gain.disconnect();
      };
    });
  };

  const resume = (audio: AudioContext) => {
    void audio
      .resume()
      .then(() => {
        if (context !== audio || !enabled || !pending || !master || audio.state !== 'running') return;
        const sound = pending;
        pending = null;
        schedule(audio, master, sound);
      })
      .catch(() => {
        pending = null;
      });
  };

  return {
    setEnabled(value: boolean) {
      enabled = value;
      if (master) master.gain.value = value ? 1 : 0;
      if (!value) pending = null;
    },
    unlock() {
      if (!enabled) return;
      try {
        if (!context || context.state === 'closed') {
          context = new AudioContext();
          master = context.createGain();
          master.connect(context.destination);
        }
        if (context.state !== 'running') resume(context);
      } catch {
        /* A browser without Web Audio still gets the complete game. */
      }
    },
    play(sound: Sound) {
      if (!enabled || !context || !master || context.state === 'closed') return;
      if (context.state !== 'running') {
        pending = sound;
        resume(context);
        return;
      }
      schedule(context, master, sound);
    },
    dispose() {
      pending = null;
      master?.disconnect();
      master = null;
      if (context && context.state !== 'closed') void context.close().catch(() => undefined);
      context = null;
    },
  };
}
