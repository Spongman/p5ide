export class Auth {
	constructor() {
	}

	userName?: string;
	authenticated: boolean = false;

	async initialize() {
		const token = window.localStorage.access_token;
		if (token) {
			if (!await this.authenticate(token))
				window.localStorage.access_token = null;
		}
	}

	async login() {
		if (this.authenticated)
			return;
		const token = window.localStorage.access_token = await this.fetchToken();
		if (token)
			await this.authenticate(token);
	}

	async authenticate(token: string) {

		const userResponse = await fetch("https://api.github.com/user", {
			method: "GET",
			headers: {
				Authorization: "token " + token,
			},
			cache: "no-cache"
		});

		const userJson = await userResponse.json();
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

			const params: { [name: string]: any } = {
				width: 450,
				height: 600,
				menubar: 0,
				toolbar: 0,
				personalbar: 0,
				status: 0,
				left: window.screenLeft + window.innerWidth - 450,
				top: window.screenTop + window.innerHeight - 600,
			};
			const loginWindow = window.open("https://github.com/login/oauth/authorize?scope=public_repo&client_id=2cb7dbbede12e09b2112", "_login", Object.keys(params).map(k => k + '=' + params[k]).join(','))!;

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
				const data = event.data;
				const code: string = data && data.code;
				if (code) {

					const loginResponse = await fetch("https://p5ide.codewithoutborders.com/login?code=" + code, {
						cache: "no-cache",
					});
					const loginJson = await loginResponse.text();
					const access_token = new URLSearchParams(loginJson).get("access_token");
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