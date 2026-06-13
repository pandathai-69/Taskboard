const CACHE = 'taskboard-v4';
const ASSETS = [
  '/Taskboard/index.html',
  '/Taskboard/manifest.json',
  '/Taskboard/icon-192.png',
  '/Taskboard/icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});

// ── Reminder heartbeat — checks every minute ──────────────────────
function getTasks() {
  try {
    // Read from all clients via postMessage, fallback to nothing
    return JSON.parse(self.__tasks || '[]');
  } catch { return []; }
}

self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SYNC_TASKS') {
    self.__tasks = JSON.stringify(e.data.tasks);
  }
});

setInterval(() => {
  let tasks = [];
  try { tasks = JSON.parse(self.__tasks || '[]'); } catch { return; }

  const now   = new Date();
  const hhmm  = now.getHours() * 60 + now.getMinutes();
  const today  = now.toISOString().slice(0, 10);

  tasks.forEach(task => {
    if (task.done || !task.reminder) return;

    const { dailyTime, beforeDue, beforeDueDays, customTime } = task.reminder;

    // 1) Daily fixed time reminder
    if (dailyTime) {
      const [rh, rm] = dailyTime.split(':').map(Number);
      const rHHMM = rh * 60 + rm;
      if (hhmm === rHHMM) {
        self.registration.showNotification('📋 Taskboard Reminder', {
          body: `Don't forget: ${task.text}`,
          icon: '/Taskboard/icon-192.png',
          badge: '/Taskboard/icon-192.png',
          tag: `daily-${task.id}`,
          data: { taskId: task.id }
        });
      }
    }

    // 2) X days before due date at a custom time
    if (beforeDue && task.due && customTime) {
      const dueDate  = new Date(task.due + 'T00:00:00');
      const fireDate = new Date(dueDate);
      fireDate.setDate(fireDate.getDate() - (beforeDueDays || 1));
      const fireDateStr = fireDate.toISOString().slice(0, 10);
      const [ch, cm]   = customTime.split(':').map(Number);
      const cHHMM      = ch * 60 + cm;
      if (fireDateStr === today && hhmm === cHHMM) {
        self.registration.showNotification('⏰ Task Due Soon', {
          body: `"${task.text}" is due ${beforeDueDays === 0 ? 'today' : `in ${beforeDueDays} day(s)`}!`,
          icon: '/Taskboard/icon-192.png',
          badge: '/Taskboard/icon-192.png',
          tag: `due-${task.id}`,
          data: { taskId: task.id }
        });
      }
    }
  });
}, 60 * 1000); // every 60 seconds

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      const existing = list.find(c => c.url.includes('/Taskboard'));
      if (existing) return existing.focus();
      return clients.openWindow('/Taskboard/index.html');
    })
  );
});
