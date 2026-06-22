import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, BookOpen } from 'lucide-react';
import toast from 'react-hot-toast';
import { useFlashcardReminders } from '../../hooks/useFlashcardReminders.js';
import {
  getFlashcardCards,
  getFlashcardDocumentId,
  getFlashcardDocumentTitle,
} from '../../utils/flashcardHelpers.js';
import { requestNotificationPermission } from '../../utils/notificationHelpers.js';

const NotificationBell = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);
  const { reminders, pendingCount, permission, setPermission, refreshReminders } = useFlashcardReminders({
    notify: true,
  });

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleEnableNotifications = async () => {
    const result = await requestNotificationPermission();
    setPermission(result);

    if (result === 'granted') {
      toast.success('Desktop notifications enabled');
      await refreshReminders();
      return;
    }

    if (result === 'denied') {
      toast.error('Notifications blocked. Enable them in your browser settings.');
      return;
    }

    toast('You can still see reminders in this panel.');
  };

  const handleBellClick = async () => {
    if (permission === 'default') {
      await handleEnableNotifications();
    }
    setOpen((prev) => !prev);
    refreshReminders({ silent: true });
  };

  const handleStudy = (set) => {
    const documentId = getFlashcardDocumentId(set);
    if (!documentId) {
      toast.error('This flashcard set is missing its source document');
      return;
    }

    const params = new URLSearchParams({ setId: set._id });
    navigate(`/documents/${documentId}/flashcards?${params.toString()}`);
    setOpen(false);
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={handleBellClick}
        className="relative p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        aria-label="Study reminders"
      >
        <Bell className="h-5 w-5 text-slate-600 dark:text-slate-300" />
        {pendingCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-500 px-1 text-[10px] font-bold text-white">
            {pendingCount > 9 ? '9+' : pendingCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
          <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-700">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Study reminders</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Flashcard sets not reviewed within 24 hours
            </p>
          </div>

          {permission !== 'granted' && (
            <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-700">
              <button
                type="button"
                onClick={handleEnableNotifications}
                className="w-full rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Enable desktop notifications
              </button>
            </div>
          )}

          <div className="max-h-72 overflow-y-auto">
            {reminders.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
                No reminders right now. You are up to date.
              </p>
            ) : (
              reminders.map((set) => {
                const title = getFlashcardDocumentTitle(set);
                const cardCount = getFlashcardCards(set).length;

                return (
                  <button
                    key={set._id}
                    type="button"
                    onClick={() => handleStudy(set)}
                    className="flex w-full items-start gap-3 border-b border-slate-100 px-4 py-3 text-left hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/80"
                  >
                    <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                      <BookOpen className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {cardCount} card{cardCount === 1 ? '' : 's'} waiting for review
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
