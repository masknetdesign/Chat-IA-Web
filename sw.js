const CACHE_NAME = 'chat-assistant-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/style.css',
    '/script.js',
    '/manifest.json',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css'
];

// Instalação do Service Worker
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Cache aberto');
                return cache.addAll(urlsToCache);
            })
    );
});

// Ativação do Service Worker
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// Interceptação de requisições
self.addEventListener('fetch', event => {
    // Não interceptar requisições para a API
    if (event.request.url.includes('beta.sree.shop')) {
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Cache hit - retornar resposta
                if (response) {
                    return response;
                }

                // Clonar a requisição
                const fetchRequest = event.request.clone();

                // Fazer requisição à rede
                return fetch(fetchRequest).then(response => {
                    // Verificar se recebemos uma resposta válida
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response;
                    }

                    // Clonar a resposta
                    const responseToCache = response.clone();

                    // Adicionar ao cache
                    caches.open(CACHE_NAME)
                        .then(cache => {
                            cache.put(event.request, responseToCache);
                        });

                    return response;
                });
            })
    );
});

// Sincronização em background
self.addEventListener('sync', event => {
    if (event.tag === 'sync-messages') {
        event.waitUntil(syncMessages());
    }
});

// Função para sincronizar mensagens
async function syncMessages() {
    try {
        const cache = await caches.open(CACHE_NAME);
        const messages = await cache.match('/messages.json');
        if (messages) {
            // Implementar lógica de sincronização aqui
            console.log('Sincronizando mensagens...');
        }
    } catch (error) {
        console.error('Erro na sincronização:', error);
    }
} 