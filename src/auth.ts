class Auth {
	constructor() {
	}

	userName?: string;
	authenticated: boolean;

	async initialize() {
		var token = window.localStorage.access_token;
		if (token) {
			if (!await this.authenticate(token))
				window.localStorage.access_token = null;
		}
	}

	async login() {
		if (this.authenticated)
			return;
		var token = window.localStorage.access_token = await this.fetchToken();
		if (token)
			await this.authenticate(token);
	}

	async authenticate(token: string) {

		var userResponse = await fetch("https://api.github.com/user", {
			method: "GET",
			headers: {
				Authorization: "token " + token,
			},
			cache: "no-cache"
		});

		var userJson = await userResponse.json();
		this.userName = userJson.login;
		this.authenticated = !!this.userName;

		document.body.classList.toggle("authenticated", this.authenticated);
		document.getElementById("userName")!.textContent = this.userName || "";

		return this.authenticated;
	}

	logoff() {
		delete window.localStorage.access_token;
		delete this.userName;
		this.authenticated = false;

		document.body.classList.remove("authenticated");
	}

	fetchToken() {

		return new Promise<string>((resolve, reject) => {

			var params: { [name: string]: any } = {
				width: 450,
				height: 600,
				menubar: 0,
				toolbar: 0,
				personalbar: 0,
				status: 0,
				left: window.screenLeft + window.innerWidth - 450,
				top: window.screenTop + window.innerHeight - 600,
			};
			var loginWindow = window.open("https://github.com/login/oauth/authorize?scope=public_repo&client_id=2cb7dbbede12e09b2112", "_login", Object.keys(params).map(k => k + '=' + params[k]).join(','));

			window.addEventListener("message", onMessage);
			const interval = setInterval(() => {
				if (!loginWindow || loginWindow.closed) {
					close();
					reject("cancelled");
				}
			}, 250);

			function close() {
				clearInterval(interval);
				window.removeEventListener("message", onMessage);
				loginWindow.close();
			}

			async function onMessage(event: MessageEvent) {
				var data = event.data;
				var code: string = data && data.code;
				if (code) {

					var loginResponse = await fetch("https://p5ide.codewithoutborders.com/login?code=" + code, {
						cache: "no-cache",
					});
					var loginJson = await loginResponse.text();
					var access_token = new URLSearchParams(loginJson).get("access_token");
					close();
					if (access_token)
						resolve(access_token);
					else
						reject("failed");
				}
			}
		});
	}
}