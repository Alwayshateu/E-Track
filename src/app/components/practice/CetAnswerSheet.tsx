'use client';

import type { ComponentProps } from 'react';
import { Flag, Heart, NotePencil } from '@phosphor-icons/react';
import { getPracticeAcceptedAnswers, getPracticeAnswerState } from '@/lib/practice-answer-check';
import type AnswerSheet from './AnswerSheet';
import { countWords, labelQuestionType } from './answer-sheet-helpers';
import { useFavoriteQuestions } from './useFavoriteQuestions';

export type CetAnswerSheetProps = ComponentProps<typeof AnswerSheet>;

const TASK_LABELS: Record<string, string> = {
  banked_cloze: '选词填空',
  paragraph_matching: '长篇阅读匹配',
  reading_choice: '仔细阅读',
  listening_choice: '听力选择',
  essay: '写作',
  translation: '汉译英',
};

const MISTAKE_REASONS = [
  { id: 'location', label: '定位错误' },
  { id: 'paraphrase', label: '同义替换' },
  { id: 'grammar', label: '语法/词形' },
  { id: 'careless', label: '粗心' },
  { id: 'time', label: '时间不够' },
];

export default function CetAnswerSheet({
  questions,
  answers,
  activeQuestionId,
  showResults,
  flaggedQuestionIds,
  reviewNotesByQuestionId,
  mistakeReasonsByQuestionId,
  onAnswer,
  onToggleFlag,
  onReviewNote,
  onToggleMistakeReason,
}: CetAnswerSheetProps) {
  const favorites = useFavoriteQuestions(questions);

  return (
    <div className="space-y-4">
      {questions.map((question) => {
        const answer = answers[question.id] ?? '';
        const state = getPracticeAnswerState(question, answer, showResults);
        const accepted = showResults ? getPracticeAcceptedAnswers(question) : [];
        const task = typeof question.metadata?.cetTask === 'string' ? question.metadata.cetTask : '';
        const extended = task === 'essay' || task === 'translation' || question.question_type === 'writing_task';
        const sharedOptions = task === 'banked_cloze' || task === 'paragraph_matching';
        const reference = typeof question.metadata?.referenceAnswer === 'string' ? question.metadata.referenceAnswer : '';
        const checklist = Array.isArray(question.metadata?.reviewChecklist)
          ? question.metadata.reviewChecklist.filter((item): item is string => typeof item === 'string')
          : [];
        const wordRange = question.metadata?.wordRange;
        const wordHint = Array.isArray(wordRange) && wordRange.length === 2
          && wordRange.every((value) => typeof value === 'number' && Number.isFinite(value) && value > 0)
          && wordRange[0] <= wordRange[1]
          ? ` · 建议 ${wordRange[0]}–${wordRange[1]} 词`
          : '';
        const flagged = flaggedQuestionIds.includes(question.id);
        const reasons = mistakeReasonsByQuestionId[question.id] ?? [];
        const titleId = `cet-question-title-${question.id}`;
        const border = showResults
          ? state === 'correct' ? 'border-emerald-200'
            : state === 'incorrect' ? 'border-red-200'
              : state === 'skipped' ? 'border-amber-200' : 'border-sky-200'
          : activeQuestionId === question.id ? 'border-accent/35' : 'border-line';

        return (
          <section key={question.id} id={`question-${question.id}`} aria-labelledby={titleId}
            className={`scroll-mt-6 overflow-hidden rounded-[1.5rem] border bg-surface transition-colors ${border}`}>
            <div className="border-b border-line bg-zinc-50/75 px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-accent-tint px-3 py-1 text-xs font-semibold text-accent">
                    第 {question.question_number} 题
                  </span>
                  <button type="button" aria-pressed={flagged} onClick={() => onToggleFlag(question.id)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1 text-xs font-semibold text-ink-subtle transition-colors hover:border-accent active:scale-[0.98]">
                    <Flag size={13} weight={flagged ? 'fill' : 'regular'} />
                    {flagged ? '已标记' : '稍后回看'}
                  </button>
                  {favorites.ready && favorites.canSave(question.id) && (
                    <button type="button" onClick={() => void favorites.toggleFavorite(question.id)}
                      disabled={favorites.pendingId !== null} aria-pressed={favorites.savedIds.has(question.id)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1 text-xs font-semibold text-ink-subtle transition-colors hover:border-accent disabled:opacity-60">
                      <Heart size={13} weight={favorites.savedIds.has(question.id) ? 'fill' : 'regular'} />
                      {favorites.savedIds.has(question.id) ? '已收藏' : '收藏'}
                    </button>
                  )}
                </div>
                <span className="text-xs font-medium text-ink-subtle">{TASK_LABELS[task] ?? labelQuestionType(question.question_type)}</span>
              </div>
              <h2 id={titleId} className="mt-4 whitespace-pre-wrap text-base font-semibold leading-relaxed text-ink">
                {question.question_text}
              </h2>
            </div>

            <div className="space-y-4 p-5">
              {extended ? (
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-ink">{task === 'translation' ? '你的英文译文' : '你的英文作文'}</span>
                  <textarea value={answer} onChange={(event) => onAnswer(question.id, event.target.value)}
                    rows={10} disabled={showResults} lang="en" placeholder="在这里完成作答，提交后对照参考内容复盘。"
                    className="w-full resize-y rounded-2xl border border-line bg-zinc-50 px-4 py-3 text-sm leading-7 text-ink outline-none placeholder:text-ink-subtle focus:border-accent focus:ring-4 focus:ring-accent/10 disabled:text-ink-muted" />
                  <span className="mt-2 block text-xs leading-relaxed text-ink-subtle">
                    {countWords(answer)} 词（按空白分隔估算）{wordHint}。字数提示不代表质量评分。
                  </span>
                </label>
              ) : question.options && question.options.length > 0 ? (
                <fieldset disabled={showResults} className="min-w-0">
                  <legend className="mb-2 text-sm font-semibold text-ink">第 {question.question_number} 题：选择答案</legend>
                  {sharedOptions && (
                    <p className="mb-3 text-xs leading-relaxed text-ink-subtle">
                      选项与同题组其他小题共享；已使用提示不限制再次选择，请遵循材料中的使用规则。
                    </p>
                  )}
                  <div className="overflow-hidden rounded-2xl border border-line">
                    {question.options.map((option, index) => {
                      const selected = answer === option;
                      const usedBy = sharedOptions ? questions.filter((other) => other.id !== question.id
                        && other.unit_id === question.unit_id && other.metadata?.cetTask === task
                        && other.metadata?.groupId === question.metadata?.groupId
                        && answers[other.id] === option).map((other) => other.question_number) : [];
                      return (
                        <label key={`${question.id}-${index}`}
                          className={`flex items-start gap-3 border-b border-line px-4 py-3 text-sm last:border-0 ${selected ? 'bg-accent-tint text-ink' : 'bg-surface text-ink-muted'} ${showResults ? '' : 'cursor-pointer hover:bg-zinc-50'}`}>
                          <input type="radio" name={`cet-answer-${question.id}`} value={option} checked={selected}
                            onChange={() => onAnswer(question.id, option)}
                            className="mt-1 h-4 w-4 shrink-0 accent-[var(--color-accent)]" />
                          <span className="min-w-0 flex-1 whitespace-pre-wrap break-words leading-relaxed">
                            {option}
                            {usedBy.length > 0 && <span className="mt-1 block text-xs text-ink-subtle">第 {usedBy.join('、')} 题已选择</span>}
                            {showResults && accepted.includes(option) && <span className="mt-1 block text-xs font-semibold text-emerald-700">参考答案</span>}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              ) : (
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-ink">你的答案</span>
                  <input value={answer} onChange={(event) => onAnswer(question.id, event.target.value)} disabled={showResults}
                    className="w-full rounded-2xl border border-line bg-zinc-50 px-4 py-3 text-sm text-ink outline-none focus:border-accent focus:ring-4 focus:ring-accent/10" />
                </label>
              )}

              {showResults && (
                <div className="rounded-2xl border border-line bg-zinc-50 p-4 text-sm text-ink">
                  <p className="font-semibold">{state === 'correct' ? '回答正确' : state === 'incorrect' ? '需要复盘' : state === 'skipped' ? '尚未作答' : '待人工复核'}</p>
                  {extended ? (
                    <>
                      <p className="mt-2 text-xs leading-relaxed text-ink-subtle">写作和翻译不按参考文本逐字判分，不提供自动分数。请对照内容要点与语言表达自行复盘。</p>
                      {reference && <div className="mt-3 border-t border-line pt-3">
                        <h3 className="text-xs font-semibold">{task === 'translation' ? '参考译文（并非唯一表达）' : '参考范文（并非唯一答案）'}</h3>
                        <p className="mt-2 whitespace-pre-wrap leading-7" lang="en">{reference}</p>
                      </div>}
                      {checklist.length > 0 && <ul className="mt-3 list-disc space-y-1 pl-5 text-xs leading-relaxed text-ink-subtle">
                        {checklist.map((item, index) => <li key={index}>{item}</li>)}
                      </ul>}
                    </>
                  ) : <p className="mt-2 text-xs leading-relaxed text-ink-subtle">参考答案：{accepted.join(' / ') || '未提供，需人工复核'}</p>}
                  {question.explanation && <p className="mt-3 whitespace-pre-wrap border-t border-line pt-3 text-xs leading-relaxed text-ink-subtle">{question.explanation}</p>}
                </div>
              )}

              <label className="block rounded-2xl border border-line bg-zinc-50/70 p-3">
                <span className="mb-2 flex items-center gap-2 text-xs font-semibold text-ink-subtle"><NotePencil size={14} />本题复盘笔记</span>
                <textarea value={reviewNotesByQuestionId[question.id] ?? ''} onChange={(event) => onReviewNote(question.id, event.target.value)}
                  rows={2} placeholder="记录材料证据、错因，或作文/译文需要改进的表达。"
                  className="w-full resize-y rounded-xl border border-line bg-surface px-3 py-2 text-xs leading-relaxed text-ink outline-none placeholder:text-ink-subtle focus:border-accent focus:ring-4 focus:ring-accent/10" />
              </label>

              {showResults && state !== 'correct' && (
                <div>
                  <p className="mb-2 text-xs font-semibold text-ink-subtle">错因 / 改进方向</p>
                  <div className="flex flex-wrap gap-2">
                    {MISTAKE_REASONS.map((reason) => (
                      <button key={reason.id} type="button" aria-pressed={reasons.includes(reason.id)} onClick={() => onToggleMistakeReason(question.id, reason.id)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${reasons.includes(reason.id) ? 'border-accent bg-accent-tint text-accent' : 'border-line bg-surface text-ink-subtle hover:border-accent'}`}>
                        {reason.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
