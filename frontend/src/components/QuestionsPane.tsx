import React, { useState } from 'react';
import { Question } from '../types/vault';
import { VaultAPI } from '../services/vaultBridge';
import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

interface QuestionsPaneProps {
  bookPath: string;
  questions: Question[];
  onRefresh: () => void;
}

export const QuestionsPane: React.FC<QuestionsPaneProps> = ({ bookPath, questions, onRefresh }) => {
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({});

  const toggleOpen = (id: string) => {
    setOpenIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleAddQuestion = async () => {
    const title = prompt('Question prompt:');
    if (!title) return;
    const answer = prompt('Answer:') || '';
    const updated = [
      ...questions,
      {
        id: `q-${Date.now()}`,
        title,
        answer,
        position: questions.length,
      },
    ];
    await VaultAPI.saveQuestions(bookPath, JSON.stringify(updated, null, 2));
    onRefresh();
  };

  const handleDelete = async (id: string) => {
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

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {questions.length === 0 ? (
          <div className="mt-8 text-center text-xs text-slate-500">
            No questions created. Click + to add flashcards or review prompts.
          </div>
        ) : (
          questions.map((q) => (
            <div key={q.id} className="rounded-lg border border-slate-800 bg-slate-900/50 p-2.5 text-xs">
              <div
                className="flex items-center justify-between font-semibold text-slate-200 cursor-pointer"
                onClick={() => toggleOpen(q.id)}
              >
                <span>{q.title}</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(q.id);
                    }}
                    className="p-1 text-slate-500 hover:text-rose-400"
                  >
                    <Trash2 size={12} />
                  </button>
                  {openIds[q.id] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </div>
              </div>
              {openIds[q.id] && (
                <div className="mt-2 border-t border-slate-800/80 pt-2 text-slate-400 leading-relaxed font-mono">
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