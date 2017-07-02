

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
