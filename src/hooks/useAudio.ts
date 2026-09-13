import { useRef, useCallback, useState } from 'react';

type BeepType = 'hit' | 'newEmitter' | 'highPriority' | 'warning' | 'test';

interface AudioState {
  enabled: boolean;
  context: AudioContext | null;
  lastBeepTime: Record<BeepType, number>;
}

const BEEP_CONFIG: Record<BeepType, { frequency: number; duration: number; type: OscillatorType; volume: number; minInterval: number }> = {
  hit: { frequency: 880, duration: 0.15, type: 'sine', volume: 0.3, minInterval: 200 },
  newEmitter: { frequency: 660, duration: 0.3, type: 'triangle', volume: 0.4, minInterval: 1000 },
  highPriority: { frequency: 1000, duration: 0.2, type: 'square', volume: 0.35, minInterval: 500 },
  warning: { frequency: 440, duration: 0.5, type: 'sawtooth', volume: 0.4, minInterval: 2000 },
  test: { frequency: 800, duration: 0.2, type: 'sine', volume: 0.3, minInterval: 500 },
};

export function useAudio() {
  const audioRef = useRef<AudioState>({
    enabled: true,
    context: null,
    lastBeepTime: {
      hit: 0,
      newEmitter: 0,
      highPriority: 0,
      warning: 0,
      test: 0,
    },
  });

  const [audioError, setAudioError] = useState<string | null>(null);

  // Initialize AudioContext on first user interaction
  const initAudioContext = useCallback(() => {
    const state = audioRef.current;
    if (state.context) return state.context;

    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      state.context = ctx;
      console.log('[Audio] AudioContext created:', ctx.state);
      return ctx;
    } catch (err) {
      const msg = 'Failed to create AudioContext: ' + (err instanceof Error ? err.message : String(err));
      console.error('[Audio]', msg);
      setAudioError(msg);
      return null;
    }
  }, []);

  // Resume AudioContext if suspended (required after user interaction)
  const resumeAudioContext = useCallback(async () => {
    const ctx = audioRef.current.context;
    if (!ctx) return false;

    if (ctx.state === 'suspended') {
      try {
        await ctx.resume();
        console.log('[Audio] AudioContext resumed:', ctx.state);
        return true;
      } catch (err) {
        console.error('[Audio] Failed to resume AudioContext:', err);
        setAudioError('Failed to resume audio: ' + (err instanceof Error ? err.message : String(err)));
        return false;
      }
    }
    return true;
  }, []);

  // Play a beep with throttling
  const beep = useCallback((type: BeepType, force = false) => {
    const state = audioRef.current;
    if (!state.enabled || !state.context) return false;

    const ctx = state.context;
    if (ctx.state === 'suspended') {
      console.warn('[Audio] AudioContext suspended, cannot play');
      return false;
    }

    const config = BEEP_CONFIG[type];
    const now = Date.now();
    const lastTime = state.lastBeepTime[type];

    // Throttle: prevent repeated beeps within minInterval
    if (!force && now - lastTime < config.minInterval) {
      return false;
    }

    state.lastBeepTime[type] = now;

    try {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.type = config.type;
      oscillator.frequency.setValueAtTime(config.frequency, ctx.currentTime);

      // Quick attack, exponential decay
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(config.volume, ctx.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + config.duration);

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + config.duration + 0.05);

      return true;
    } catch (err) {
      console.error('[Audio] Beep failed:', err);
      return false;
    }
  }, []);

  // Toggle sound on/off
  const toggleSound = useCallback(() => {
    audioRef.current.enabled = !audioRef.current.enabled;
    console.log('[Audio] Sound', audioRef.current.enabled ? 'enabled' : 'disabled');
    return audioRef.current.enabled;
  }, []);

  // Test beep
  const testBeep = useCallback(() => {
    return beep('test', true);
  }, [beep]);

  // Specific beep functions for different events
  const beepHit = useCallback(() => beep('hit'), [beep]);
  const beepNewEmitter = useCallback(() => beep('newEmitter'), [beep]);
  const beepHighPriority = useCallback(() => beep('highPriority'), [beep]);
  const beepWarning = useCallback(() => beep('warning'), [beep]);

  // Getters
  const isEnabled = audioRef.current.enabled;
  const hasContext = !!audioRef.current.context;
  const contextState = audioRef.current.context?.state ?? 'none';

  return {
    // State
    isEnabled,
    hasContext,
    contextState,
    audioError,
    // Actions
    initAudioContext,
    resumeAudioContext,
    beep: beepHit,
    beepHit,
    beepNewEmitter,
    beepHighPriority,
    beepWarning,
    testBeep,
    toggleSound,
    // Config
    setEnabled: useCallback((enabled: boolean) => {
      audioRef.current.enabled = enabled;
    }, []),
  };
}

export type { BeepType };