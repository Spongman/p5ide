

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
}

String.prototype.trimStart = function (str?:string)
{
	if (typeof str === 'undefined')
		return this.replace(/^\s+/, '');
	if (this.startsWith(str))
		return this.substr(str.length);
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

		let response: Response;
		if (!window.localStorage.fetch)
			window.localStorage.fetch = {};

		response = JSON.parse(window.localStorage.fetch[url]);
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

	private timeUpdate: number;

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
	sourceNode: SourceNode;
}

function searchParams(params: Object) {
	return Object.entries(params).reduce((a, [k, v]) => { return a.append(k, v), a; }, new URLSearchParams());
}