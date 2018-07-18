const verbose = true;

self.addEventListener('install', function (event) {
	verbose && console.log('install');
	event.waitUntil(self.skipWaiting());
	verbose && console.log('install complete');
});

self.addEventListener('activate', function (event) {
	verbose && console.log('activate');
	event.waitUntil(self.clients.claim());
	verbose && console.log('activate complete');
});

self.addEventListener('fetch', event => {

	if (!event.clientId)
		return;

	let url = event.request.url;

	let origin = self.location.origin;
	if (!url.startsWith(origin)) {
		console.log("REJECT: " + url);
		return;
	}

	verbose && console.log("FETCH", url);

	event.respondWith(new Promise((resolve, reject) => {

		self.clients.get(event.clientId).then(client => {

			verbose && console.log("CLIENT", client);

			let messageChannel = new MessageChannel();
			messageChannel.port1.onmessage = function (event) {

				verbose && console.log("ONMESSAGE", event);

				let data = event.data;
				if (data) {
					if (data.status) {
						let response = new Response();
						response.status = data.status;
						response.statusText = data.statusText || "error";
						resolve(response);
					} else if (data.type) {
						let response = new Response(data);
						response.type = data.type;
						response.headers["Content-Type"] = data.type;
						response.headers["Cache-Control"] = "no-store";
						resolve(response);
					}
				} else {
					let response = new Response();
					response.status = 404;
					response.statusText = "baloney!";
					resolve(response);
				}
			};

			client.postMessage(url, [messageChannel.port2]);

		}).catch(reject);

	}));
});