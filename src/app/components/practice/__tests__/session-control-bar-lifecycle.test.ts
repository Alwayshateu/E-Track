import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ComponentProps } from 'react';
import type { PracticeUnit } from '@/lib/types';

// Node-only passive-effect harness, following practice-session-lifecycle.test.ts.
// Execute the real control bar with controlled props and fake timers, not a DOM.
// StrictMode's effect setup -> cleanup -> setup replay is simulated explicitly.
const hooks = vi.hoisted(() => {
  type Effect = {
    deps?: readonly unknown[];
    create: () => void | (() => void);
    cleanup?: () => void;
  };
  let effects: Effect[] = [];
  let pending: (() => void)[] = [];
  let index = 0;
  return {
    begin() { index = 0; },
    flush() { const work = pending; pending = []; work.forEach((run) => run()); },
    replayEffects() {
      effects.forEach((effect) => effect.cleanup?.());
      effects.forEach((effect) => { effect.cleanup = effect.create() || undefined; });
    },
    unmount() {
      effects.forEach((effect) => effect.cleanup?.());
      effects = []; pending = [];
    },
    useMemo<T>(factory: () => T) { index += 1; return factory(); },
    useEffect(create: Effect['create'], deps?: readonly unknown[]) {
      const slot = index++;
      const old = effects[slot];
      if (old && deps && old.deps && deps.length === old.deps.length && deps.every((dep, i) => Object.is(dep, old.deps![i]))) return;
      const effect: Effect = { deps, create };
      effects[slot] = effect;
      pending.push(() => { old?.cleanup?.(); effect.cleanup = create() || undefined; });
    },
  };
});

vi.mock('react', async (importOriginal) => ({ ...await importOriginal<typeof import('react')>(), ...hooks }));
vi.mock('motion/react', () => ({ motion: { div: 'div', section: 'section' } }));
vi.mock('@phosphor-icons/react', () => ({
  ArrowCounterClockwise: 'svg', CheckCircle: 'svg', Clock: 'svg', Eye: 'svg', Flag: 'svg',
  ListChecks: 'svg', PauseCircle: 'svg', Timer: 'svg', WarningCircle: 'svg', XCircle: 'svg',
}));

import SessionControlBar from '../SessionControlBar';

type Props = ComponentProps<typeof SessionControlBar>;

function unit(id = 'unit-a', limit: number | null = 3): PracticeUnit {
  return {
    id, slug: id, skill: 'reading', mode: 'basic', title: id,
    description: null, difficulty: 'medium', material_type: 'passage',
    passage_text: 'Sample passage', audio_url: null, transcript: null,
    asset_url: null, time_limit_seconds: limit, questions: [],
  };
}

function mount(overrides: Partial<Props> = {}) {
  let dirty = false;
  const onElapsedChange = vi.fn<Props['onElapsedChange']>((next) => {
    props.elapsedSeconds = typeof next === 'function' ? next(props.elapsedSeconds) : next;
    dirty = true;
  });
  let props: Props = {
    unit: unit(), score: { answered: 0, correct: 0, total: 1, accuracy: 0 },
    showResults: false, elapsedSeconds: 0, unansweredCount: 1, flaggedCount: 0,
    examMode: false, examDurationSeconds: 3, autoSubmitted: false,
    onElapsedChange, onReveal: vi.fn(), onReviewUnanswered: vi.fn(), onReset: vi.fn(),
    onStartExam: vi.fn(), onExitExam: vi.fn(), onExamExpire: vi.fn(), ...overrides,
  };
  function render() {
    dirty = false;
    hooks.begin();
    SessionControlBar(props);
    hooks.flush();
  }
  render();
  return {
    get props() { return props; },
    update(patch: Partial<Props>) { props = { ...props, ...patch }; render(); },
    advance(milliseconds: number) {
      // Flush timer-driven prop changes before the next tick, like a parent render.
      for (let remaining = milliseconds; remaining > 0;) {
        const step = Math.min(100, remaining);
        vi.advanceTimersByTime(step);
        if (dirty) render();
        remaining -= step;
      }
    },
    unmount: hooks.unmount,
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('window', {
    setInterval: vi.fn(setInterval), clearInterval: vi.fn(clearInterval),
  });
});

afterEach(() => {
  hooks.unmount();
  vi.restoreAllMocks();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('SessionControlBar timer lifecycle', () => {
  it('starts on entry and keeps ordinary practice accumulating past the suggested limit', () => {
    const session = mount();
    expect(vi.getTimerCount()).toBe(1);
    session.advance(5000);
    expect(session.props.elapsedSeconds).toBe(5);
    expect(session.props.onExamExpire).not.toHaveBeenCalled();
    expect(window.setInterval).toHaveBeenCalledTimes(1);
    expect(window.clearInterval).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(1);
  });

  it('continues an ordinary draft already past its limit', () => {
    const session = mount({ elapsedSeconds: 20 });
    session.advance(2000);
    expect(session.props.elapsedSeconds).toBe(22);
    expect(session.props.onExamExpire).not.toHaveBeenCalled();
  });

  it('accumulates without a unit time limit', () => {
    const session = mount({ unit: unit('unlimited', null) });
    session.advance(5000);
    expect(session.props.elapsedSeconds).toBe(5);
    expect(session.props.onExamExpire).not.toHaveBeenCalled();
    expect(window.setInterval).toHaveBeenCalledTimes(1);
  });

  it('keeps one interval and its tick cadence through countdown and unrelated renders', () => {
    const session = mount({ examMode: true, examDurationSeconds: 20 });
    for (let i = 0; i < 12; i += 1) {
      session.advance(250);
      session.update({ flaggedCount: i });
    }
    expect(session.props.elapsedSeconds).toBe(3);
    expect(window.setInterval).toHaveBeenCalledTimes(1);
    expect(window.clearInterval).not.toHaveBeenCalled();
  });

  it('restarts the timer phase when ordinary practice starts an exam at 900ms', () => {
    const onExamExpire = vi.fn();
    const session = mount({ onExamExpire, examDurationSeconds: 3 });
    session.advance(900);
    expect(session.props.elapsedSeconds).toBe(0);
    session.update({ examMode: true, elapsedSeconds: 0 });
    expect(window.setInterval).toHaveBeenCalledTimes(2);
    expect(window.clearInterval).toHaveBeenCalledTimes(1);
    session.advance(2100);
    expect(session.props.elapsedSeconds).toBe(2);
    expect(onExamExpire).not.toHaveBeenCalled();
    session.advance(899);
    expect(session.props.elapsedSeconds).toBe(2);
    expect(onExamExpire).not.toHaveBeenCalled();
    session.advance(1);
    expect(session.props.elapsedSeconds).toBe(3);
    expect(onExamExpire).toHaveBeenCalledTimes(1);
    expect(window.setInterval).toHaveBeenCalledTimes(2);
    expect(window.clearInterval).toHaveBeenCalledTimes(2);
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each([false, true])('starts a full tick for a new same-mode attempt (examMode=%s)', (examMode) => {
    const session = mount({ examMode, attemptId: 'attempt-a', elapsedSeconds: 1 });
    session.advance(900);
    session.update({ attemptId: 'attempt-b', elapsedSeconds: 0 });
    expect(window.setInterval).toHaveBeenCalledTimes(2);
    expect(window.clearInterval).toHaveBeenCalledTimes(1);
    session.advance(999);
    expect(session.props.elapsedSeconds).toBe(0);
    session.advance(1);
    expect(session.props.elapsedSeconds).toBe(1);
    for (let i = 0; i < 4; i += 1) {
      session.update({ attemptId: 'attempt-b', flaggedCount: i });
      session.advance(250);
    }
    expect(session.props.elapsedSeconds).toBe(2);
    expect(window.setInterval).toHaveBeenCalledTimes(2);
    expect(vi.getTimerCount()).toBe(1);
    expect(session.props.onExamExpire).not.toHaveBeenCalled();
  });

  it.each([false, true])('stops when results appear in examMode=%s and resumes only when hidden', (examMode) => {
    const session = mount({ examMode, examDurationSeconds: 30 });
    session.advance(1000);
    session.update({ showResults: true });
    expect(vi.getTimerCount()).toBe(0);
    session.advance(3000);
    expect(session.props.elapsedSeconds).toBe(1);
    expect(window.clearInterval).toHaveBeenCalledTimes(1);
    session.update({ showResults: false });
    session.advance(1000);
    expect(session.props.elapsedSeconds).toBe(2);
    expect(vi.getTimerCount()).toBe(1);
  });

  it('does not start a timer for restored results', () => {
    const session = mount({ showResults: true, elapsedSeconds: 10 });
    session.advance(3000);
    expect(session.props.elapsedSeconds).toBe(10);
    expect(window.setInterval).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('stops exactly at the exam deadline and calls expiration once before results are shown', () => {
    const session = mount({ examMode: true, examDurationSeconds: 3 });
    session.advance(2000);
    expect(session.props.elapsedSeconds).toBe(2);
    expect(session.props.onExamExpire).not.toHaveBeenCalled();
    session.advance(5000);
    expect(session.props.elapsedSeconds).toBe(3);
    expect(session.props.onExamExpire).toHaveBeenCalledTimes(1);
    expect(window.setInterval).toHaveBeenCalledTimes(1);
    expect(window.clearInterval).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
    session.update({ flaggedCount: 1 });
    session.update({ showResults: true, autoSubmitted: true });
    session.advance(1000);
    expect(session.props.onExamExpire).toHaveBeenCalledTimes(1);
    expect(session.props.elapsedSeconds).toBe(3);
  });

  it('expires an already overdue exam without starting a timer', () => {
    const session = mount({ examMode: true, elapsedSeconds: 10 });
    session.advance(3000);
    expect(session.props.elapsedSeconds).toBe(10);
    expect(session.props.onExamExpire).toHaveBeenCalledTimes(1);
    expect(window.setInterval).not.toHaveBeenCalled();
  });

  it('restarts ordinary timing when leaving an expired exam, but not while viewing results', () => {
    const session = mount({ examMode: true });
    session.advance(3000);
    expect(vi.getTimerCount()).toBe(0);
    session.update({ showResults: true });
    session.update({ examMode: false });
    session.advance(2000);
    expect(session.props.elapsedSeconds).toBe(3);
    expect(vi.getTimerCount()).toBe(0);
    session.update({ showResults: false });
    session.advance(2000);
    expect(session.props.elapsedSeconds).toBe(5);
    expect(session.props.onExamExpire).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(1);
  });

  it('restarts when an expired exam is exited before results arrive', () => {
    const session = mount({ examMode: true, elapsedSeconds: 3 });
    expect(vi.getTimerCount()).toBe(0);
    session.update({ examMode: false });
    session.advance(2000);
    expect(session.props.elapsedSeconds).toBe(5);
    expect(vi.getTimerCount()).toBe(1);
  });

  it('starts a fresh timer when switching away from an expired exam unit', () => {
    const previous = mount({ examMode: true, elapsedSeconds: 3 });
    previous.unmount();
    const next = mount({ unit: unit('unit-b', 1) });
    next.advance(3000);
    expect(next.props.elapsedSeconds).toBe(3);
    expect(previous.props.onElapsedChange).not.toHaveBeenCalled();
    expect(previous.props.onExamExpire).toHaveBeenCalledTimes(1);
    expect(next.props.onExamExpire).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(1);
  });

  it('cleans up on unmount and keeps only one interval through StrictMode effect replay', () => {
    const session = mount();
    hooks.replayEffects();
    expect(window.setInterval).toHaveBeenCalledTimes(2);
    expect(window.clearInterval).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(1);
    session.advance(2000);
    expect(session.props.elapsedSeconds).toBe(2);
    expect(session.props.onElapsedChange).toHaveBeenCalledTimes(2);
    session.unmount();
    expect(window.clearInterval).toHaveBeenCalledTimes(2);
    expect(vi.getTimerCount()).toBe(0);
    session.advance(3000);
    expect(session.props.elapsedSeconds).toBe(2);
    expect(session.props.onElapsedChange).toHaveBeenCalledTimes(2);
  });
});
