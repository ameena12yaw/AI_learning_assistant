const NOTIFIED_SETS_KEY = 'flashcard_reminder_notified_ids';
const NOTIFICATIONS_ENABLED_KEY = 'flashcard_notifications_enabled';

export function getNotifiedSetIds() {
  try {
    const stored = localStorage.getItem(NOTIFIED_SETS_KEY);
    const parsed = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function markSetNotified(setId) {
  const ids = getNotifiedSetIds();
  if (!ids.includes(setId)) {
    localStorage.setItem(NOTIFIED_SETS_KEY, JSON.stringify([...ids, setId]));
  }
}

export function pruneNotifiedSetIds(activeSetIds) {
  const active = new Set(activeSetIds);
  const pruned = getNotifiedSetIds().filter((id) => active.has(id));
  localStorage.setItem(NOTIFIED_SETS_KEY, JSON.stringify(pruned));
}

export function areNotificationsEnabled() {
  return localStorage.getItem(NOTIFICATIONS_ENABLED_KEY) === 'true';
}

export function setNotificationsEnabled(enabled) {
  localStorage.setItem(NOTIFICATIONS_ENABLED_KEY, enabled ? 'true' : 'false');
}

export function canUseBrowserNotifications() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermission() {
  if (!canUseBrowserNotifications()) return 'unsupported';
  return Notification.permission;
}

export async function requestNotificationPermission() {
  if (!canUseBrowserNotifications()) return 'unsupported';
  if (Notification.permission === 'granted') {
    setNotificationsEnabled(true);
    return 'granted';
  }
  if (Notification.permission === 'denied') return 'denied';

  const result = await Notification.requestPermission();
  if (result === 'granted') {
    setNotificationsEnabled(true);
  }
  return result;
}

export function showFlashcardReminderNotification({ setId, documentId, title, cardCount }) {
  if (!canUseBrowserNotifications() || Notification.permission !== 'granted') {
    return false;
  }

  const body = `You created ${cardCount} card${cardCount === 1 ? '' : 's'} over 24 hours ago. Tap to start reviewing.`;
  const icon = `${window.location.origin}/favicon.svg`;

  try {
    const notification = new Notification('Flashcard review reminder', {
      body: title ? `${title}: ${body}` : body,
      icon,
      tag: `flashcard-reminder-${setId}`,
    });

    notification.onclick = () => {
      window.focus();
      const params = new URLSearchParams({ setId });
      window.location.assign(`/documents/${documentId}/flashcards?${params.toString()}`);
      notification.close();
    };

    return true;
  } catch (error) {
    console.error('Browser notification failed:', error);
    return false;
  }
}
