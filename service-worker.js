const filesToCache = [
	'/guess-who/',
	'/guess-who/index.html',
	'/guess-who/style.css',
	'/guess-who/script.js',
	'/guess-who/favicon.ico',
	'/guess-who/assets/full.jpeg',
	'/guess-who/assets/transparent.jpeg',
	'/guess-who/assets/icon-192.png',
	'/guess-who/assets/icon-512.png',
	'/guess-who/assets/ding.mp3',
	'/guess-who/assets/flip.mp3',
	'/guess-who/assets/sent.mp3',
	'/guess-who/assets/failure.mp3',
	'/guess-who/assets/victory.mp3'
];
const cacheName = 'game-cache-v1';

self.oninstall = event => {
	event.waitUntil(
		caches.open(cacheName)
		.then(cache => {
			return cache.addAll(filesToCache);
		})
	);
};

self.onactivate = event => {
	const cacheAllowlist = [cacheName];
	event.waitUntil(
		caches.keys().then(cacheNames => {
			return Promise.all(
				cacheNames.map(cacheName => {
					if (cacheAllowlist.indexOf(cacheName) === -1)
						return caches.delete(cacheName);
				})
			);
		})
	);
};

self.onfetch = event => {
	event.respondWith(
		caches.match(event.request)
		.then(response => {
		if (response) 
			return response;
		return fetch(event.request)
			.then(response => {
				return caches.open(cacheName)
				.then(cache => {
					cache.put(event.request.url, response.clone());
					return response;
				});
			});
		})
		.catch(error => {
			console.log('Error Fetching Files!', 'Error:', error);
		})
	);
};
