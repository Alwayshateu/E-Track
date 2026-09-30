'use client';

import Link from 'next/link';
import { useMemo, useRef, useState } from 'react';
import type { PracticeStorageResult } from '@/lib/practice-storage';
import { practiceStorageFailure } from '@/lib/practice-storage';
import SessionSaveNotice from './SessionSaveNotice';
import { motion } from 'motion/react';
import { ArrowLeft, BookOpenText, Headphones, ListChecks, Microphone, PenNib } from '@phosphor-icons/react';
import type { PracticeUnit } from '@/lib/types';
import { getExamLibraryHref, resolveExam } from '@/lib/exam-config';
import { practiceAttemptDetailHref } from '@/lib/practice-session-links';
import { getWritingFeedbackQuestions } from '@/lib/practice-writing-guidance';
import { riseChild, staggerParent } from '../ui/motion-presets';
import AnswerSheet from './AnswerSheet';
import CetAnswerSheet from './CetAnswerSheet';
import MaterialPane from './MaterialPane';
import QuestionNavigator from './QuestionNavigator';
import SessionControlBar from './SessionControlBar';
import ResultInspector from './ResultInspector';
import RevisionGoalPanel from './RevisionGoalPanel';
import { usePracticeAnnotationSync } from './usePracticeAnnotationSync';
import { usePracticeSessionState } from './usePracticeSessionState';

function getSessionMeta(unit: PracticeUnit) {
  if (unit.skill === 'listening') {
    return {
      Icon: Headphones,
      label: 'Listening Session',
      title: '一段音频，一组关联题。',
      description: '左侧播放听力材料，右侧完成关联题组。提交后检查答案、记录错因，再回到材料复盘。',
    };
  }

  if (unit.skill === 'translation') {
    return {
      Icon: PenNib,
      label: 'Translation Practice',
      title: '一段中文，一份英文表达。',
      description: '阅读左侧中文材料，在右侧完成汉译英。提交后对照参考译文与复核清单自评，不生成官方分数。',
    };
  }

  if (unit.skill === 'writing') {
    return {
      Icon: PenNib,
      label: 'Writing Practice',
      title: '一道写作题，一份完整回应。',
      description: '阅读左侧写作要求，在右侧组织观点并完成草稿。提交后使用参考内容与自评工具复盘。',
    };
  }

  if (unit.skill === 'speaking') {
    return {
      Icon: Microphone,
      label: 'Speaking Session',
      title: '一张 cue card，一次限时表达。',
      description: '阅读 cue card，使用准备计时与录音练习表达，再记录回答要点和复盘笔记。',
    };
  }

  return {
    Icon: BookOpenText,
    label: 'Reading Session',
    title: '一篇材料，多道关联题。',
    description: '左侧阅读与标注材料，右侧完成关联题组。提交后检查答案，并记录定位依据和错因。',
  };
}

export default function PracticeSessionView({ unit, userId }: { unit: PracticeUnit; userId: string }) {
  // Keep all session state (including child timers/media and annotation sync) owned
  // by one account and unit, even when a parent replaces its props without route navigation.
  return <PracticeSessionContent key={`${userId}:${unit.id}`} unit={unit} userId={userId} />;
}

function PracticeSessionContent({ unit, userId }: { unit: PracticeUnit; userId: string }) {
  const {
    answers,
    activeIndex,
    activeQuestionId,
    annotations,
    annotationsLoaded,
    autoSubmitted,
    elapsedSeconds,
    examDurationSeconds,
    examMode,
    flaggedCount,
    flaggedQuestionIds,
    mistakeReasonsByQuestionId,
    reviewNotesByQuestionId,
    rubricRatingsByQuestionId,
    score,
    showResults,
    unansweredQuestions,
    setElapsedSeconds,
    setShowResults,
    handleAddAnnotation,
    handleAnswer,
    handleClearAnnotations,
    handleClearLocalData,
    handleExamExpire,
    handleExitExam,
    handleRemoveAnnotation,
    handleResetPreview,
    handleRestoreAnnotations,
    handleReviewNote,
    handleRubricRating,
    handleReviewUnanswered,
    handleSelectQuestion,
    handleStartExam,
    handleToggleFlag,
    handleToggleMistakeReason,
    handleUpdateAnnotation,
    attemptId,
    parentAttemptId,
    revisionGoal,
    snapshotSaveStatus,
    draftReadStatus,
    draftSaveStatus,
    annotationsReadStatus,
    annotationsSaveStatus,
    storageError,
    improvementGoal,
    reflection,
    setImprovementGoal,
    setReflection,
    handleRetrySave,
    handleStartRevision,
  } = usePracticeSessionState(unit, userId);
  const annotationSync = usePracticeAnnotationSync({
    unitId: unit.id,
    storageUserId: userId,
    unitSlug: unit.slug,
    annotations,
    annotationsLoaded,
    localSaveReady: annotationsLoaded && annotationsSaveStatus.status === 'saved',
    onRestore: handleRestoreAnnotations,
  });
  const sessionMeta = getSessionMeta(unit);
  const SessionIcon = sessionMeta.Icon;
  const exam = resolveExam(unit.exam);
  const SessionAnswerSheet = exam === 'ielts' ? AnswerSheet : CetAnswerSheet;
  const feedbackQuestions = useMemo(() => getWritingFeedbackQuestions(unit), [unit]);
  const actionRef = useRef(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const runAction = async (
    action: () => Promise<PracticeStorageResult<void>>,
    confirmation?: string,
    successMessage?: string,
  ): Promise<PracticeStorageResult<void>> => {
    if (actionRef.current) return practiceStorageFailure('conflict', '另一项操作正在进行，请稍候。');
    if (confirmation && !window.confirm(confirmation)) return practiceStorageFailure('conflict', '操作已取消，原有内容保留。');
    actionRef.current = true;
    setActionBusy(true);
    setActionMessage(null);
    try {
      const result = await action();
      setActionMessage(result.ok ? successMessage ?? null : result.error);
      return result;
    } catch {
      const error = '操作未完成，请保留当前输入并重试。';
      setActionMessage(error);
      return practiceStorageFailure('unavailable', error);
    } finally {
      actionRef.current = false;
      setActionBusy(false);
    }
  };
  const resetSession = () => void runAction(
    () => handleResetPreview({ discardUnsaved: true }),
    '开始一次空白练习？当前未提交的答案、复盘文字和未保存修改会被放弃；已成功保存的历史和材料标注会保留。',
    '已开始新练习，已保存的历史记录未改动。',
  );
  const startExam = () => void runAction(
    () => handleStartExam({ discardUnsaved: true }),
    '开始新的限时练习？当前未提交的答案和未保存复盘会被放弃；已保存的历史会保留。',
  );
  const clearLocalData = () => void runAction(
    handleClearLocalData,
    '仅清理这个单元在本浏览器中的草稿与标注？未保存的输入会丢失。标注云同步将先暂停；已保存的历史、收藏、错题和云端备份不会被删除，已发送的网络请求无法撤回。',
    '本单元草稿与标注已清理，标注云同步已暂停。历史记录未清理。',
  );
  const startRevision = () => runAction(
    handleStartRevision,
    unit.skill === 'writing' || unit.skill === 'translation'
      ? '开始下一稿？先保留本次已保存的记录，再复制当前文本作为修改起点，并关联当前改进目标。'
      : '开始下一轮？本次已保存记录会保留，新一轮清空答题文字，并关联当前改进目标。口语录音不会保存到历史。',
    '已开始带目标的新一轮，提交后可在详情中对照两次记录。',
  );

  return (
    <main className="mx-auto min-h-[100dvh] max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <motion.div variants={staggerParent(0.06)} initial="hidden" animate="show">
        <motion.header variants={riseChild} className="mb-6 grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <Link
                href={getExamLibraryHref(exam)}
                className="inline-flex items-center gap-2 rounded-full border border-line bg-white/80 px-3 py-1.5 text-sm font-medium text-ink-muted transition-all hover:-translate-y-0.5 hover:border-accent/25 hover:text-ink active:scale-[0.98]"
              >
                <ArrowLeft size={17} weight="bold" />
                返回 Session Library
              </Link>
              <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink-subtle">
                <SessionIcon size={14} weight="regular" />
                {sessionMeta.label}
              </span>
            </div>
            <h1 className="text-display max-w-3xl text-3xl font-semibold text-ink sm:text-4xl">
              {sessionMeta.title}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-subtle">
              {sessionMeta.description}
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-white/70 bg-[#2d1b33] p-5 text-white shadow-[0_24px_70px_-48px_rgba(45,27,51,0.95)]">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-white">
                <ListChecks size={20} weight="regular" />
              </span>
              <div>
                <p className="text-xs font-semibold tracking-[0.12em] text-white/55">CURRENT TASK</p>
                <p className="mt-1 text-sm font-semibold text-white">Question {activeIndex + 1} / {unit.questions.length}</p>
              </div>
            </div>
          </div>
        </motion.header>

        {parentAttemptId && <section className="mb-5 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900" aria-label="本轮改进目标">
          <h2 className="font-semibold">本轮只改这一点</h2>
          <p className="mt-2 whitespace-pre-wrap break-words">{revisionGoal?.trim() || '这轮尚未设定具体目标。可以在复盘时补充说明。'}</p>
          <Link href={practiceAttemptDetailHref(parentAttemptId)} className="mt-2 inline-block text-xs font-semibold underline underline-offset-4">查看关联的上一次记录</Link>
          <p className="mt-2 text-xs leading-relaxed">提交后写下一句修改说明，再对照两次文字。目标是否达成由你或教师判断。</p>
        </section>}
        <SessionSaveNotice
          draftReadStatus={draftReadStatus}
          annotationsReadStatus={annotationsReadStatus}
          draftSaveStatus={draftSaveStatus}
          annotationsSaveStatus={annotationsSaveStatus}
          snapshotSaveStatus={snapshotSaveStatus}
          storageError={storageError}
          attemptId={attemptId}
          showResults={showResults}
          busy={actionBusy}
          actionMessage={actionMessage}
          onRetry={() => void runAction(handleRetrySave, undefined, '已完成本机读取 / 保存重试，请查看各项状态。')}
        />
        {draftReadStatus === 'ready' && <fieldset disabled={actionBusy} className="min-w-0">
        <SessionControlBar
          unit={unit}
          attemptId={attemptId}
          score={score}
          showResults={showResults}
          elapsedSeconds={elapsedSeconds}
          unansweredCount={unansweredQuestions.length}
          flaggedCount={flaggedCount}
          examMode={examMode}
          examDurationSeconds={examDurationSeconds}
          autoSubmitted={autoSubmitted}
          onElapsedChange={setElapsedSeconds}
          onReveal={() => setShowResults(true)}
          onReviewUnanswered={handleReviewUnanswered}
          onReset={resetSession}
          onStartExam={startExam}
          onExitExam={handleExitExam}
          onExamExpire={handleExamExpire}
        />
        </fieldset>}

        <motion.div variants={riseChild} className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <MaterialPane
            unit={unit}
            annotations={annotations}
            onAddAnnotation={handleAddAnnotation}
            onUpdateAnnotation={handleUpdateAnnotation}
            onRemoveAnnotation={handleRemoveAnnotation}
            onClearAnnotations={handleClearAnnotations}
            annotationSync={annotationSync}
            annotationsReadStatus={annotationsReadStatus}
            annotationsSaveStatus={annotationsSaveStatus}
            examMode={examMode && !showResults}
          />

          <section className="space-y-5 lg:col-span-7">
            <fieldset disabled={draftReadStatus !== 'ready' || actionBusy} className="min-w-0 space-y-5">
            <QuestionNavigator
              questions={unit.questions}
              answers={answers}
              activeQuestionId={activeQuestionId}
              showResults={showResults}
              flaggedQuestionIds={flaggedQuestionIds}
              reviewNotesByQuestionId={reviewNotesByQuestionId}
              onSelect={handleSelectQuestion}
            />
            <SessionAnswerSheet
              questions={feedbackQuestions}
              answers={answers}
              activeQuestionId={activeQuestionId}
              showResults={showResults}
              flaggedQuestionIds={flaggedQuestionIds}
              reviewNotesByQuestionId={reviewNotesByQuestionId}
              mistakeReasonsByQuestionId={mistakeReasonsByQuestionId}
              rubricRatingsByQuestionId={rubricRatingsByQuestionId}
              onAnswer={handleAnswer}
              onToggleFlag={handleToggleFlag}
              onReviewNote={handleReviewNote}
              onToggleMistakeReason={handleToggleMistakeReason}
              onRubricRating={handleRubricRating}
            />
            <ResultInspector
              exam={exam}
              questions={unit.questions}
              answers={answers}
              showResults={showResults}
              flaggedQuestionIds={flaggedQuestionIds}
              reviewNotesByQuestionId={reviewNotesByQuestionId}
              rubricRatingsByQuestionId={rubricRatingsByQuestionId}
              annotationCount={annotations.length}
              elapsedSeconds={elapsedSeconds}
              onReveal={() => setShowResults(true)}
              onEditAnswers={() => setShowResults(false)}
              onReset={resetSession}
              onClearLocalData={clearLocalData}
              onSelectQuestion={handleSelectQuestion}
            />
            <RevisionGoalPanel
              attemptId={attemptId}
              showResults={showResults}
              snapshotSaveStatus={snapshotSaveStatus}
              draftReadStatus={draftReadStatus}
              improvementGoal={improvementGoal}
              reflection={reflection}
              onImprovementGoalChange={setImprovementGoal}
              onReflectionChange={setReflection}
              onRetrySave={() => runAction(handleRetrySave)}
              onStartRevision={startRevision}
            />
            </fieldset>
          </section>
        </motion.div>
      </motion.div>
    </main>
  );
}
