
const CACHE_NAME = 'zenith-v1';
// All files that make up the "app shell"
const APP_SHELL_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/index.tsx',
  '/App.tsx',
  '/types.ts',
  '/services/db.ts',
  '/services/timerService.ts',
  '/utils/date.ts',
  '/components/icons.tsx',
  '/components/Sidebar.tsx',
  '/screens/TodayScreen.tsx',
  '/screens/WeekScreen.tsx',
  '/screens/MonthScreen.tsx',
  '/screens/HabitsScreen.tsx',
  '/screens/OverviewScreen.tsx',
  '/components/TaskItem.tsx',
  '/components/HabitItem.tsx',
  '/components/FAB.tsx',
  '/components/modals/TaskModal.tsx',
  '/components/modals/HabitModal.tsx',
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/@babel/standalone/babel.min.js',
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('Caching app shell');
      return cache.addAll(APP_SHELL_URLS);
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(cacheName => cacheName !== CACHE_NAME)
          .map(cacheName => caches.delete(cacheName))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  // We only want to cache GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  const { request } = event;
  const url = new URL(request.url);

  // Strategy: Cache-first for local files (app shell) because they are versioned by the service worker.
  if (APP_SHELL_URLS.includes(url.pathname) || url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then(response => {
        return response || fetch(request).then(fetchResponse => {
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, fetchResponse.clone());
          });
          return fetchResponse;
        });
      })
    );
    return;
  }

  // Strategy: Stale-While-Revalidate for external assets (fonts, esm.sh scripts)
  event.respondWith(
    caches.open(CACHE_NAME).then(cache => {
      return cache.match(request).then(cachedResponse => {
        const fetchPromise = fetch(request).then(networkResponse => {
          if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        }).catch(err => {
            console.error('Fetch failed for external resource:', request.url, err);
        });

        // Return cached response immediately if available, and fetch in background
        return cachedResponse || fetchPromise;
      });
    })
  );
});
