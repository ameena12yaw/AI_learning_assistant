import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import flashcardService from '../services/flashcardService.js';
import { getFlashcardCards, getFlashcardDocumentId, getFlashcardDocumentTitle } from '../utils/flashcardHelpers.js';
import {
  getNotifiedSetIds,
  getNotificationPermission,
  markSetNotified,
  pruneNotifiedSetIds,
  showFlashcardReminderNotification,
} from '../utils/notificationHelpers.js';

const CHECK_INTERVAL_MS = 5 * 60 * 1000;

function getPendingReminders(reminders) {
  pruneNotifiedSetIds(reminders.map((set) => set._id));
  const notifiedIds = new Set(getNotifiedSetIds());
  return reminders.filter((set) => !notifiedIds.has(set._id));
}

export function useFlashcardReminders({ notify = true } = {}) {
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [permission, setPermission] = useState(getNotificationPermission);
  const checkingRef = useRef(false);

  const deliverReminders = useCallback((pending) => {
    if (!notify || pending.length === 0) return;

    for (const set of pending) {
      const documentId = getFlashcardDocumentId(set);
      const title = getFlashcardDocumentTitle(set);
      const cardCount = getFlashcardCards(set).length;

      if (!documentId || cardCount === 0) continue;

      const shown = showFlashcardReminderNotification({
        setId: set._id,
        documentId,
        title,
        cardCount,
      });

      if (!shown) {
        toast(`Review reminder: "${title}" has ${cardCount} unreviewed cards`, {
          icon: '📚',
          duration: 6000,
        });
      }

      markSetNotified(set._id);
    }
  }, [notify]);

  const refreshReminders = useCallback(async ({ silent = false } = {}) => {
    if (checkingRef.current) return [];
    checkingRef.current = true;

    try {
      const res = await flashcardService.getReviewReminders();
      const items = Array.isArray(res?.data) ? res.data : [];
      setReminders(items);
      setPermission(getNotificationPermission());

      const pending = getPendingReminders(items);
      if (!silent) {
        deliverReminders(pending);
      }

      return items;
    } catch (error) {
      console.error('Flashcard reminder check failed:', error);
      if (!silent) {
        toast.error('Could not load study reminders');
      }
      return [];
    } finally {
      setLoading(false);
      checkingRef.current = false;
    }
  }, [deliverReminders]);

  useEffect(() => {
    refreshReminders();

    const intervalId = window.setInterval(() => refreshReminders(), CHECK_INTERVAL_MS);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        refreshReminders();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [refreshReminders]);

  const pendingCount = getPendingReminders(reminders).length;

  return {
    reminders,
    pendingCount,
    loading,
    permission,
    setPermission,
    refreshReminders,
  };
}
