'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

export default function ProtectedAccountBoundary({
  userId,
  children,
}: {
  userId: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const boundaryRef = useRef<HTMLDivElement>(null);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    let alive = true;
    let invalidated = false;
    let generation = 0;
    let subscription: { unsubscribe: () => void } | undefined;

    const failClosed = () => {
      if (!alive || invalidated) return;
      invalidated = true;
      generation += 1;

      // Conceal an already mounted page before React commits the unmount.
      const boundary = boundaryRef.current;
      if (boundary) {
        boundary.hidden = true;
        boundary.setAttribute('inert', '');
      }
      setVerified(false);
      router.replace('/login');
      router.refresh();
    };

    const verify = (auth: ReturnType<typeof createSupabaseBrowserClient>['auth']) => {
      const requestGeneration = ++generation;
      try {
        void auth.getUser().then(({ data, error }) => {
          if (!alive || invalidated || requestGeneration !== generation) return;
          if (error || data.user?.id !== userId) {
            failClosed();
          } else {
            setVerified(true);
          }
        }).catch(() => {
          if (alive && requestGeneration === generation) failClosed();
        });
      } catch {
        failClosed();
      }
    };

    try {
      const auth = createSupabaseBrowserClient().auth;
      subscription = auth.onAuthStateChange((event, session) => {
        if (!alive || invalidated) return;
        if (event === 'SIGNED_OUT' || session?.user.id !== userId) {
          failClosed();
          return;
        }
        // Supabase invokes this callback while its auth lock is held. Defer the
        // authoritative getUser call until the callback has returned.
        queueMicrotask(() => {
          if (alive && !invalidated) verify(auth);
        });
      }).data.subscription;
      if (!invalidated) verify(auth);
    } catch {
      failClosed();
    }

    return () => {
      alive = false;
      generation += 1;
      subscription?.unsubscribe();
    };
  }, [router, userId]);

  useEffect(() => {
    if (verified) return;
    const boundary = boundaryRef.current;
    if (boundary) {
      boundary.hidden = false;
      boundary.removeAttribute('inert');
    }
  }, [verified]);

  return (
    <div ref={boundaryRef} data-protected-account-boundary>
      {verified ? children : <p role="status">正在验证登录状态。</p>}
    </div>
  );
}
