self.addEventListener('install', function (event) {
	//console.log('install');
	event.waitUntil(self.skipWaiting());
	//console.log('install complete');
});

self.addEventListener('activate', function (event) {
	//console.log('activate');
	event.waitUntil(self.clients.claim());
	//console.log('activate complete');
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

	//console.log("FETCH", url);

	event.respondWith(new Promise((resolve, reject) => {

		self.clients.get(event.clientId).then(client => {

			//console.log("CLIENT", client);

			let messageChannel = new MessageChannel();
			messageChannel.port1.onmessage = function (event) {

				//console.log("ONMESSAGE", event);

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