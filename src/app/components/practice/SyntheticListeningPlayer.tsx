'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Play, Stop, WarningCircle } from '@phosphor-icons/react';

function getVoiceAvailability() {
  if (typeof window === 'undefined' || !('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) return 'unsupported';
  return window.speechSynthesis.getVoices().some((voice) => /^en(?:[-_]|$)/i.test(voice.lang))
    ? 'available' : 'no-english';
}

function subscribeVoices(onChange: () => void) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return () => {};
  const synthesis = window.speechSynthesis;
  synthesis.addEventListener('voiceschanged', onChange);
  return () => synthesis.removeEventListener('voiceschanged', onChange);
}

const getServerSnapshot = () => 'loading';

type Playback = { transcript: string; state: 'starting' | 'playing' | 'error' | 'idle'; message: string };

export default function SyntheticListeningPlayer({ transcript }: { transcript: string }) {
  return <ListeningPlayback key={transcript} transcript={transcript} />;
}

function ListeningPlayback({ transcript }: { transcript: string }) {
  const availability = useSyncExternalStore(subscribeVoices, getVoiceAvailability, getServerSnapshot);
  const [playback, setPlayback] = useState<Playback>({ transcript, state: 'idle', message: '' });
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const startTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentPlayback = playback.transcript === transcript ? playback : null;
  const busy = currentPlayback?.state === 'starting' || currentPlayback?.state === 'playing';

  const stopSpeech = () => {
    if (startTimeoutRef.current !== null) {
      clearTimeout(startTimeoutRef.current);
      startTimeoutRef.current = null;
    }
    const utterance = utteranceRef.current;
    utteranceRef.current = null;
    if (utterance) {
      utterance.onstart = null;
      utterance.onend = null;
      utterance.onerror = null;
      window.speechSynthesis.cancel();
    }
  };

  useEffect(() => () => {
    if (startTimeoutRef.current !== null) {
      clearTimeout(startTimeoutRef.current);
      startTimeoutRef.current = null;
    }
    const utterance = utteranceRef.current;
    utteranceRef.current = null;
    if (utterance) {
      utterance.onstart = null;
      utterance.onend = null;
      utterance.onerror = null;
      window.speechSynthesis.cancel();
    }
  }, [transcript]);

  const handlePlay = () => {
    stopSpeech();
    if (!transcript.trim() || getVoiceAvailability() !== 'available') {
      setPlayback({ transcript, state: 'error', message: '没有可播放的内容或可用英语语音，请使用明确标注的文字练习模式。' });
      return;
    }
    const synthesis = window.speechSynthesis;
    const englishVoices = synthesis.getVoices().filter((voice) => /^en(?:[-_]|$)/i.test(voice.lang));
    const voice = englishVoices.find((item) => item.localService) ?? englishVoices[0];
    if (!voice) return;

    const utterance = new SpeechSynthesisUtterance(transcript);
    utterance.voice = voice;
    utterance.lang = voice.lang;
    utterance.rate = 0.9;
    utteranceRef.current = utterance;
    setPlayback({ transcript, state: 'starting', message: `正在启动英语合成语音：${voice.name}。` });

    const fail = (message: string) => {
      if (utteranceRef.current !== utterance) return;
      stopSpeech();
      setPlayback({ transcript, state: 'error', message });
    };
    utterance.onstart = () => {
      if (utteranceRef.current !== utterance) return;
      if (startTimeoutRef.current !== null) clearTimeout(startTimeoutRef.current);
      startTimeoutRef.current = null;
      setPlayback({ transcript, state: 'playing', message: '正在播放合成语音；如果没有声音，请检查设备音量和浏览器声音权限。' });
    };
    utterance.onend = () => {
      if (utteranceRef.current !== utterance) return;
      utteranceRef.current = null;
      if (startTimeoutRef.current !== null) clearTimeout(startTimeoutRef.current);
      startTimeoutRef.current = null;
      setPlayback({ transcript, state: 'idle', message: '合成语音播放结束，可重新播放。' });
    };
    utterance.onerror = () => fail('浏览器语音播放失败。请检查语音包、网络和声音权限，或切换文字练习模式。');
    startTimeoutRef.current = setTimeout(() => fail('浏览器未能启动语音播放。请重试或切换文字练习模式。'), 10000);
    try {
      synthesis.speak(utterance);
    } catch {
      fail('当前浏览器无法执行语音合成，请切换文字练习模式。');
    }
  };

  return (
    <section className="rounded-2xl border border-line bg-surface p-4" aria-label="合成语音练习">
      <p className="text-sm font-semibold text-ink">合成语音练习 · 非官方录音</p>
      <p className="mt-2 text-xs leading-relaxed text-ink-subtle">
        使用浏览器提供的英语语音朗读原创材料，不模拟真实考试的多说话人录音。
        优先使用本机语音；其他语音可能依赖浏览器厂商的在线服务。
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={handlePlay} disabled={availability !== 'available' || !transcript.trim() || busy}
          className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60">
          <Play size={16} weight="fill" />{busy ? '播放中' : '播放合成语音'}
        </button>
        <button type="button" onClick={() => {
          stopSpeech();
          setPlayback({ transcript, state: 'idle', message: '已停止播放。再次播放将从头开始。' });
        }} disabled={!busy}
          className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-sm font-semibold text-ink transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60">
          <Stop size={16} weight="fill" />停止
        </button>
      </div>
      <div className="mt-3 text-xs leading-relaxed text-ink-subtle" role="status" aria-live="polite">
        {availability === 'loading' ? '正在检查浏览器英语语音…'
          : availability === 'unsupported' ? '当前浏览器不支持语音合成。可以使用文字练习模式，但不能视为已完成听力训练。'
            : availability === 'no-english' ? '尚未发现可用英语语音。请检查系统语音包；语音就绪后播放按钮会自动启用。也可以使用文字练习模式。'
              : currentPlayback?.message || '点击播放后才会发声；材料文本不会自动展开。'}
        {currentPlayback?.state === 'error' && <WarningCircle size={15} className="ml-1 inline" aria-hidden="true" />}
      </div>
    </section>
  );
}
