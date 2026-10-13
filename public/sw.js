/* Service worker del Command Center: notificaciones push. No cachea la app (siempre se carga fresca). */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
    let data = {};
    try { data = event.data ? event.data.json() : {}; } catch { data = { title: 'Command Center', body: event.data?.text() }; }
    event.waitUntil(self.registration.showNotification(data.title || 'Command Center', {
        body: data.body || '',
        icon: '/icon-192.png',
        badge: '/favicon.png',
        tag: data.tag,
        data: { url: data.url || '/' },
    }));
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const url = new URL(event.notification.data?.url || '/', self.location.origin).href;
    event.waitUntil((async () => {
        const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        const existing = windows.find(w => w.url.startsWith(self.location.origin));
        if (existing) {
            await existing.focus();
            return existing.navigate(url);
        }
        return self.clients.openWindow(url);
    })());
});
