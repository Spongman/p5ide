import { ProjectNode } from "./project";


export interface Document {
	ready(): Promise<any>;
}

interface Function {
	call<T>(this: (...args: any[]) => T, thisArg: any, ...argArray: any[]): T;
}


export function promiseRequire(paths: string[]): Promise<any[]> {
	return new Promise((resolve, reject) => {
		require(paths, (...modules: any[]) => resolve(modules), (err: RequireError) => reject(err));
	});
}

declare interface String {
	trimStart(str?: string): string;
	trimEnd(str?: string): string;
}

declare global {
	interface String {
		trimStart(str?: string):string;
		trimEnd(str?: string):string;
	}
}

String.prototype.trimStart = function (str?: string) {
	if (typeof str === 'undefined')
		return this.replace(/^\s+/, '');
	if (this.startsWith(str))
		return this.substr(str.length);
	return this as string;
};

String.prototype.trimEnd = function (str?: string) {
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

export function click(element: HTMLElement | string, fn: (event: MouseEvent) => any) {
	if (typeof element === 'string')
		element = document.getElementById(element)!;
	element.addEventListener("click", event => {
		event.preventDefault();
		fn(event);
	});
}

export async function cachedFetch(url: string): Promise<Response> {

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


export class EventDelayer {

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

export interface SourceNodeEvent extends Event {
	sourceNode: ProjectNode;
}

export function searchParams(params: Object) {
	return Object.entries(params).reduce((a, [k, v]) => { return a.append(k, v), a; }, new URLSearchParams());
}

export function parseUrl(url: string) {
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


export function blobToString(blob: Blob): Promise<string> {
	return new Promise<string>((resolve, reject) => {
		const reader = new FileReader();
		reader.addEventListener('loadend', e => resolve(reader.result));
		reader.addEventListener('error', reject);
		reader.addEventListener('abort', reject);
		reader.readAsText(blob);
	});
}



export class ExtraLibs {

	private static mapExtraLibs: { [name: string]: monaco.IDisposable } = {};

	public static dispose() {
		//console.log("DISPOSE LIBS", name);
		for (const libName in this.mapExtraLibs)
			this.mapExtraLibs[libName].dispose();
		this.mapExtraLibs = {};
	}

	public static add(name: string, content: string) {
		if (this.mapExtraLibs[name])
			return;
		console.log("ADD EXTRA LIB", name);
		const disposable = monaco.languages.typescript.javascriptDefaults.addExtraLib(content, name);
		this.mapExtraLibs[name] = disposable;
	}

	public static remove(name: string) {
		const lib = this.mapExtraLibs[name];
		if (lib) {
			lib.dispose();
			delete this.mapExtraLibs[name];
		}
	}
}