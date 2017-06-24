self.addEventListener('install', event => {
    console.log('INSTALL', event);
});

self.addEventListener('activate', event => {
    console.log('ACTIVATE', event);
});

self.addEventListener('fetch', event => {
    //console.log("FETCH", event);

    if (!event.clientId)
        return;

    var url = event.request.url;

    var origin = self.origin;
    if (url.substr(0, origin.length) !== origin)
        return;

    console.log("FETCH", url);

    event.respondWith(new Promise((resolve, reject) => {

        self.clients.get(event.clientId).then(client => {

            console.log("CLIENT", client);

            var messageChannel = new MessageChannel();
            messageChannel.port1.onmessage = function(event) {

                console.log("ONMESSAGE", event);

                if (event.data) {
                    if (event.data.error) {
                        reject(event.data.error);
                    } else {
                        var blob = event.data;
                        var response = new Response(blob);
                        response.type = blob.type;
                        response.headers["Content-Type"] = blob.type;
                        console.log(url, blob.type);
                        //console.log(response);
                        resolve(response);
                    }
                } else {
                    var response = new Response();
                    response.status = 404;
                    response.statusText = "baloney!";
                    resolve(response);
                }
            };

            client.postMessage(url, [messageChannel.port2]);

        }).catch(reject);

    }));
});