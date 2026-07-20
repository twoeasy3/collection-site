import { useCallback, useEffect, useRef, useState } from 'react';

// Background music + selection blip. Owns the <audio> element and the
// WebAudio context so App doesn't have to care about autoplay rules.
export function useAppSounds() {
  const [soundEnabled, setSoundEnabled] = useState(false);
  const bgAudioRef = useRef(null);
  const audioCtxRef = useRef(null);
  const selectBufferRef = useRef(null);

  useEffect(() => {
    if (!bgAudioRef.current) {
      bgAudioRef.current = new Audio('/bg.mp3');
      bgAudioRef.current.loop = true;
      bgAudioRef.current.volume = 0.5;
    }
  }, []);

  useEffect(() => {
    const bg = bgAudioRef.current;
    if (!bg) return;
    if (soundEnabled) {
      if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();
      if (!bg._mediaSourceNode) {
        bg._mediaSourceNode = ctx.createMediaElementSource(bg);
        bg._mediaSourceNode.connect(ctx.destination);
      }
      bg.play().catch(() => {});
      if (!selectBufferRef.current) {
        fetch('/select.wav')
          .then(r => r.arrayBuffer())
          .then(buf => ctx.decodeAudioData(buf))
          .then(decoded => { selectBufferRef.current = decoded; })
          .catch(() => {});
      }
    } else {
      bg.pause();
      bg.currentTime = 0;
    }
  }, [soundEnabled]);

  const playSelectSound = useCallback(async () => {
    if (!soundEnabled || !selectBufferRef.current || !audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') await ctx.resume();
    const src = ctx.createBufferSource();
    src.buffer = selectBufferRef.current;
    src.connect(ctx.destination);
    src.start();
  }, [soundEnabled]);

  return { soundEnabled, setSoundEnabled, playSelectSound };
}
