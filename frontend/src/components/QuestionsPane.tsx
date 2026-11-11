import React, { useState } from 'react';
import { Question } from '../types/vault';
import { VaultAPI } from '../services/vaultBridge';
import { Plus, Trash2, Pencil, ChevronDown, ChevronUp } from 'lucide-react';
import { useDialog } from './ui/CustomUI';

interface QuestionsPaneProps {
  bookPath: string;
  questions: Question[];
  onRefresh: () => void;
}

export const QuestionsPane: React.FC<QuestionsPaneProps> = ({ bookPath, questions, onRefresh }) => {
  const { showPrompt, showConfirm } = useDialog();
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({});

  const toggleOpen = (id: string) => {
    setOpenIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleAddQuestion = async () => {
    const title = await showPrompt({
      title: 'New Review Question',
      message: 'Add a prompt for active recall.',
      placeholder: 'Question prompt...',
      confirmText: 'Next',
    });
    if (!title || !title.trim()) return;

    const answer = await showPrompt({
      title: 'Answer',
      message: `Answer for: “${title}”`,
      placeholder: 'Answer...',
      confirmText: 'Save Question',
    });
    if (answer === null) return;

    const updated = [
      ...questions,
      {
        id: `q-${Date.now()}`,
        title: title.trim(),
        answer: answer.trim(),
        position: questions.length,
      },
    ];
    await VaultAPI.saveQuestions(bookPath, JSON.stringify(updated, null, 2));
    onRefresh();
  };

  const handleEditQuestion = async (q: Question) => {
    const newTitle = await showPrompt({
      title: 'Edit Review Question',
      message: 'Update the prompt for active recall.',
      defaultValue: q.title,
      placeholder: 'Question prompt...',
      confirmText: 'Next',
    });
    if (newTitle === null || !newTitle.trim()) return;

    const newAnswer = await showPrompt({
      title: 'Edit Answer',
      message: `Answer for: “${newTitle}”`,
      defaultValue: q.answer,
      placeholder: 'Answer...',
      confirmText: 'Save Question',
    });
    if (newAnswer === null) return;

    const updated = questions.map((item) =>
      item.id === q.id ? { ...item, title: newTitle.trim(), answer: newAnswer.trim() } : item
    );
    await VaultAPI.saveQuestions(bookPath, JSON.stringify(updated, null, 2));
    onRefresh();
  };

  const handleDelete = async (id: string) => {
    const ok = await showConfirm({
      title: 'Delete Question',
      message: 'Remove this review question?',
      confirmText: 'Delete',
      isDanger: true,
    });
    if (!ok) return;
    const updated = questions.filter((q) => q.id !== id);
    await VaultAPI.saveQuestions(bookPath, JSON.stringify(updated, null, 2));
    onRefresh();
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-slate-800 px-3 py-2">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Review Questions</span>
        <button
          onClick={handleAddQuestion}
          className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
        >
          <Plus size={15} />
        </button>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {questions.length === 0 ? (
          <div className="mt-8 text-center text-xs text-slate-500">
            No questions created. Click + to add flashcards or review prompts.
          </div>
        ) : (
          questions.map((q) => (
            <div key={q.id} className="rounded-lg border border-slate-800 bg-slate-900/50 p-2.5 text-xs">
              <div
                className="flex cursor-pointer items-center justify-between font-semibold text-slate-200"
                onClick={() => toggleOpen(q.id)}
              >
                <span>{q.title}</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditQuestion(q);
                    }}
                    className="p-1 text-slate-500 transition hover:text-indigo-300"
                    title="Edit question"
                  >
                    <Pencil size={12} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(q.id);
                    }}
                    className="p-1 text-slate-500 transition hover:text-rose-400"
                    title="Delete question"
                  >
                    <Trash2 size={12} />
                  </button>
                  {openIds[q.id] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </div>
              </div>
              {openIds[q.id] && (
                <div className="mt-2 whitespace-pre-wrap border-t border-slate-800/80 pt-2 font-mono leading-relaxed text-slate-400">
                  {q.answer || 'No answer supplied.'}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
