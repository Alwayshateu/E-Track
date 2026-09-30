import { afterEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

// Node-only regression: real SSR markup plus the snapshots React uses during
// hydration and after mounting. This does not simulate hydrateRoot or a DOM.
const phase = vi.hoisted(() => ({ current: 'server' as 'server' | 'hydrating' | 'mounted' }));
vi.mock('react', async (importOriginal) => {
  const react = await importOriginal<typeof import('react')>();
  return {
    ...react,
    useSyncExternalStore: (
      subscribe: (onStoreChange: () => void) => () => void,
      getSnapshot: () => unknown,
      getServerSnapshot?: () => unknown,
    ) => {
      if (phase.current === 'server') {
        return react.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
      }
      return phase.current === 'hydrating' ? getServerSnapshot?.() : getSnapshot();
    },
  };
});

import { SpeakingRecorder } from '../material-pane/SpeakingRecorder';

function render() {
  return renderToStaticMarkup(createElement(SpeakingRecorder));
}

function mockBrowser(mediaDevices: unknown, MediaRecorder: unknown) {
  vi.stubGlobal('navigator', { mediaDevices });
  vi.stubGlobal('window', { MediaRecorder });
}

afterEach(() => {
  phase.current = 'server';
  vi.unstubAllGlobals();
});

describe('SpeakingRecorder hydration snapshots', () => {
  it('keeps server and initial hydration markup identical, then exposes recording on a supported browser', () => {
    vi.stubGlobal('navigator', undefined);
    vi.stubGlobal('window', undefined);
    const serverMarkup = render();
    expect(serverMarkup).toContain('当前浏览器不支持 MediaRecorder');
    expect(serverMarkup).not.toContain('开始录音');

    const getUserMedia = vi.fn();
    const MediaRecorder = vi.fn();
    mockBrowser({ getUserMedia }, MediaRecorder);
    phase.current = 'hydrating';
    expect(render()).toBe(serverMarkup);

    phase.current = 'mounted';
    const mountedMarkup = render();
    expect(mountedMarkup).toContain('开始录音');
    expect(mountedMarkup).not.toContain('当前浏览器不支持 MediaRecorder');
    // Checking support must never request permission or start a recording.
    expect(getUserMedia).not.toHaveBeenCalled();
    expect(MediaRecorder).not.toHaveBeenCalled();
  });

  it('uses the server snapshot even when browser APIs are present during SSR', () => {
    mockBrowser({ getUserMedia: vi.fn() }, vi.fn());
    expect(render()).toContain('当前浏览器不支持 MediaRecorder');
    expect(render()).not.toContain('开始录音');
  });

  it.each([
    { name: 'missing mediaDevices', mediaDevices: undefined, recorder: true },
    { name: 'missing getUserMedia', mediaDevices: {}, recorder: true },
    { name: 'non-callable getUserMedia', mediaDevices: { getUserMedia: true }, recorder: true },
    { name: 'missing MediaRecorder', mediaDevices: { getUserMedia: vi.fn() }, recorder: false },
  ])('retains the fallback and self-rating after mounting with $name', ({ mediaDevices, recorder }) => {
    mockBrowser(mediaDevices, recorder ? vi.fn() : undefined);
    phase.current = 'hydrating';
    const hydrationMarkup = render();
    phase.current = 'mounted';
    const mountedMarkup = render();
    expect(mountedMarkup).toBe(hydrationMarkup);
    expect(mountedMarkup).toContain('当前浏览器不支持 MediaRecorder');
    expect(mountedMarkup).not.toContain('开始录音');
    expect(mountedMarkup).toContain('结合录音自评（本地）');
    for (const criterion of ['Fluency', 'Lexical', 'Grammar', 'Pronunciation']) {
      expect(mountedMarkup).toContain(criterion);
    }
  });
});
