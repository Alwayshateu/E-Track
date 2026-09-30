'use client';

import Link from 'next/link';

export default function PracticeError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto min-h-[70dvh] max-w-3xl px-6 py-20">
      <p className="text-sm font-semibold text-accent">E-Track · 练习内容</p>
      <h1 className="mt-3 text-3xl font-semibold text-ink">暂时无法载入练习</h1>
      <p className="mt-4 leading-relaxed text-ink-subtle">
        请检查网络和登录状态后重试。系统不会把读取失败伪装成空题库，也不会自动切换内容来源。
      </p>
      <p className="mt-3 text-sm leading-relaxed text-ink-subtle">
        如果刚升级远程题库，请管理员确认已依次应用 practice 表迁移、0004_multi_exam.sql 和
        0005_seed_cet_samples.sql，并确认当前账号有读取权限。部署说明见项目 docs/e-track-deployment.md。
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <button type="button" onClick={reset} className="rounded-xl bg-ink px-5 py-3 font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent">
          重新载入
        </button>
        <Link href="/dashboard" className="rounded-xl border border-line px-5 py-3 font-semibold text-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent">
          返回 Dashboard
        </Link>
      </div>
    </main>
  );
}
