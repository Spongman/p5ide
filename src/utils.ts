

interface Document {
	ready(): Promise<any>;
}

interface Function {
	call<T>(this: (...args: any[]) => T, thisArg: any, ...argArray: any[]): T;
}


function promiseRequire(paths: string[]): Promise<any[]> {
	return new Promise((resolve, reject) => {
		require(paths, (...modules: any[]) => resolve(modules), (err: RequireError) => reject(err));
	});
}

declare interface String {
	trimStart(str?: string):string;
	trimEnd(str?: string):string;
}

String.prototype.trimStart = function (str?:string)
{
	if (typeof str === 'undefined')
		return this.replace(/^\s+/, '');
	if (this.startsWith(str))
		return this.substr(str.length);
	return this as string;
};

String.prototype.trimEnd = function (str?:string)
{
	if (typeof str === 'undefined')
		return this.replace(/\s+$/, '');
	if (this.endsWith(str))
		return this.substr(0, this.length - str.length);
	return this as string;
};
/*
function promiseEvent(elt: HTMLElement, type: string): Promise<Event> {
	return new Promise(function (resolve) {
		function handle(event: Event) {
			console.log("HANDLE", type);
			elt.removeEventListener(type, handle);
			resolve(event);
		}
		elt.addEventListener(type, handle);
	});
}
*/

function click(element: HTMLElement | string, fn: (event: MouseEvent) => any) {
	if (typeof element === 'string')
		element = document.getElementById(element)!;
	element.addEventListener("click", event => {
		event.preventDefault();
		fn(event);
	});
}

async function cachedFetch(url: string): Promise<Response> {

	if (window.caches) {
		const cache = await window.caches.open("fetch");
		//console.log("CACHE", cache);
		let response = await cache.match(url);
		//console.log("MATCH", response);
		if (!response) {
			response = await fetch(url);
			//console.log("FETCH", response);
			await cache.put(url, response);
			response = await cache.match(url);
			//console.log("MATCH", response);
		}
		return response;
	}
	else if (window.localStorage) {

		if (!window.localStorage.fetch)
			window.localStorage.fetch = {};

		let response: Response = JSON.parse(window.localStorage.fetch[url]);
		if (!response) {
			response = await fetch(url);
			window.localStorage.fetch[url] = JSON.stringify(response);
		}
		return response;
	}
	else {
		return fetch(url);
	}
}


class EventDelayer {

	constructor(private callback: () => void, private delay: number) {
	}

	private timeUpdate: number = 0;

	private startTimer(delay: number) {
		setTimeout(() => {

			const timeRemaining = this.timeUpdate - Date.now();
			if (timeRemaining > 0) {
				this.startTimer(timeRemaining);
			} else {
				this.timeUpdate = 0;
				this.callback();
			}

		}, this.delay);
	}

	trigger() {
		const timeNow = Date.now();
		if (!this.timeUpdate)
			this.startTimer(this.delay);
		this.timeUpdate = timeNow + this.delay;
	}
}

interface SourceNodeEvent extends Event {
	sourceNode: ProjectNode;
}

function searchParams(params: Object) {
	return Object.entries(params).reduce((a, [k, v]) => { return a.append(k, v), a; }, new URLSearchParams());
}

function parseUrl(url:string) {
	const l = document.createElement("a") as HTMLAnchorElement;
	l.href = url;
	return {
		protocol: l.protocol.trimEnd(":"),
		hostname: l.hostname,
		host: l.host,
		port: l.port,
		pathname: l.pathname.trimStart("/"),
		hash: l.hash,
		search: l.search,
	};
}


function blobToString(blob: Blob): Promise<string> {
	return new Promise<string>((resolve, reject) => {
		const reader = new FileReader();
		reader.addEventListener('loadend', e => resolve(reader.result));
		reader.addEventListener('error', reject);
		reader.addEventListener('abort', reject);
		reader.readAsText(blob);
	});
}