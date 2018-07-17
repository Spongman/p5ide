import { Project, ProjectFile, ProjectFolder, SourceLanguage } from './project';
import { IPosition } from 'monaco-editor';
import { ExtraLibs } from './utils';

const _previewPage = "/assets/v/blank.html";

declare function loadFile(file: ProjectFile | null, position?: IPosition): void;
declare var loadCompletePromise: Promise<[{ url: string; text: string; }[], any[], void]>;
declare var _currentFile: ProjectFile;
declare function handlePreviewError(event: ErrorEvent):void;
declare function setConsoleVisibility(show?: boolean): void;

export class P5Preview {

	private _window: Window | null = null;
	private _isDocked = true;
	private _isPaused = false;
	private _isLoading = false;

	private _previousScript: ProjectFile | null = null;

	private _currentProject: Project | null = null;
	get project() { return this._currentProject; }
	set project(value: Project | null) {
		this._currentProject = value;
		this.previewFile();
	}

	private _currentHtml: ProjectFile | null = null;
	get currentHtml() { return this._currentHtml; }

	previewFile(file?: ProjectFile) {
		ExtraLibs.dispose();

		loadCompletePromise.then(() => {
			this._currentHtml = file as ProjectFile;
			if (file) {
				if (this._currentProject)
					this._currentProject.clearUsed();
					
				console.log("previewFile", file.path);
				this._currentHtml.used = true;
				this.loadPreview();
				this._isLoading = true;

				document.querySelector("#previewPanel > .panelHeader > span")!.textContent = this._currentHtml.name;
			} else {
				this.writePreview();
			}
		});
	}


	loadPreview(docked?: boolean) {

		this._isLoading = false;
		this._previousScript = null;
		console.log("loadPreview");

		const previewContainer = document.getElementById('previewContainer')!;
		const consoleContainer = document.getElementById("consoleContainer")!;
		consoleContainer.innerHTML = "";

		if (docked === void 0)
			docked = this._isDocked;

		//console.log("LOAD PREVIEW");
		if (docked) {
			this._window = null;
			const previewFrame = <HTMLIFrameElement>document.getElementById("previewFrame")!;
			if (previewFrame)
				previewFrame.src = _previewPage;
			else
				previewContainer.innerHTML = '<iframe id="previewFrame" width="100%" height="100%" src="' + _previewPage + '"></iframe>';
		}
		else {

			const rect = previewContainer.getBoundingClientRect();
			if (this._isDocked) {
				const pr = window.devicePixelRatio;
				this._window = window.open(_previewPage, "previewFrame",
					"toolbar=0,status=0,menubar=0,location=0,replace=1" +
					",width=" + Math.floor(pr * previewContainer.clientWidth) +
					",height=" + Math.floor(pr * previewContainer.clientHeight) +
					",left=" + (window.screenX + Math.floor(pr * rect.left)) +
					",top=" + (window.screenY + Math.floor(pr * rect.top) + 26)
				);
				const interval = setInterval(() => {
					if (!this._window || this._window.closed) {
						clearInterval(interval);
						this.loadPreview(true);
					}
				}, 250);
			}
			else {
				this._window!.location.href = _previewPage;
				window.focus();
			}
		}

		if (this._isDocked !== docked) {
			this._isDocked = docked;
			document.body.classList.toggle("preview-docked", docked);
			if (!docked)
				previewContainer.innerHTML = "";
			window.dispatchEvent(new Event("resize"));
			//_editor && _editor.layout();
		}
	}

	async frameLoaded(event: any) {

		if (this._isDocked) {
			const frame = <HTMLIFrameElement>document.getElementById('previewFrame')!;
			this._window = frame.contentWindow;
		}

		if (!this._window) {
			console.log("WARNING: no previewWindow");
			return;
		}

		(<any>this._window)['__protect'] = loopProtect.protect;
		const sw = this._window.navigator.serviceWorker;

		/*
		window.addEventListener('unload', event => {
			console.log('UNLOAD', event);
			reg.unregister();
		});
		*/

		sw.addEventListener('message', this.handleRequest.bind(this));

		sw.register('/sw.js', { scope: "/assets/v/" });
		console.log('sw.ready');

		let reg = sw.ready;
		console.log("registered", reg);

		setTimeout(async () => {
			var currentHtml = this._currentHtml;
			if (!currentHtml)
				return;
			const html = await currentHtml.fetchValue();
			var base = /*window.location.origin + */ currentHtml.parent!.path;
			console.log('BASE', base);
			this.writePreview(
				"<base href='" + base + "'>"
				+ "<script>(opener||parent).preview.onDidLoadPreview(window);</script>"
				+ html);
		}, 1);

		//console.log('registration failed', err);
	}

	async handleRequest(event:ServiceWorkerMessageEvent) {

		if (!event.ports || !this._currentProject)
			return;

		let blob: Blob | null = null;

		const originalUrl = event.data as string;
		console.log("request: " + originalUrl);
		const originLength = event.origin.length;

		if (originalUrl.substring(0, originLength) === event.origin) {
			let url = originalUrl.substring(originLength);

			let file = this._currentProject.find(url);

			if (file instanceof ProjectFolder) {
				if (!url.endsWith("/")) {
					return event.ports[0].postMessage({ redirect: originalUrl + "/" });
				} else {
					throw new Error("TODO: default document");
				}
			}

			if (!file) {
				try {
					file = await this._currentProject.loadFile(url);
				}
				catch (err) {
					if (err.status) {
						return event.ports[0].postMessage({ statusText: err.statusText, status: err.status });
					}
				}
				if (!file) {
					return event.ports[0].postMessage({ statusText: "not found", status: 404 });
				}
			}

			/*
			let file = this._currentProject.workingDirectory.find(url);
			if (!file) {
				file = await this._currentProject.find(url);
			}
			if (!file) {
			}
			*/
			if (file instanceof ProjectFile) {

				file.used = true;

				const language = file.language;
				switch (language) {
					case SourceLanguage.Javascript:
						if (['p5.js', 'p5.dom.js', 'p5.sound.js'].indexOf(file.name) < 0) {
							if (this._isLoading)
								this._previousScript = file;

							const content = await file.fetchValue();

							if (file !== _currentFile)
								ExtraLibs.add(file.name, content);
							blob = new Blob([loopProtect(content)], { type: language && language.mimeType });
						}
						break;
				}

				if (!blob)
					blob = await file.fetchBlob();
			}
		}
		event.ports[0].postMessage(blob);
	}


	writePreview(html?: string) {
		if (this._window) {
			this._window.document.open();
			this._window.document.clear();
			if (html)
				this._window.document.write(html);
			this._window.document.close();
		}
	}

	onDidLoadPreview(previewWindow: any) {
		if (this._isLoading) {
			previewWindow.document.addEventListener('DOMContentLoaded', () => {
				loadFile(this._previousScript || this._currentHtml);
			});
		}
		previewWindow.addEventListener('error', handlePreviewError);
		const consoleContainer = document.getElementById("consoleContainer")!;
		new ProxyConsole(previewWindow.console, row => {
			const scroll = consoleContainer.scrollTop >= consoleContainer.scrollHeight - consoleContainer.clientHeight - 5;
			consoleContainer.appendChild(row);
			if (scroll)
				consoleContainer.scrollTop = consoleContainer.scrollHeight - consoleContainer.clientHeight;
			setConsoleVisibility();
		});
	}

	updateFile(file: ProjectFile) {

		if (!this._window)
			return;

		switch (file.language) {
			case SourceLanguage.Css:
				const url = this._window.location.origin + "/" + file.path;

				let found = false;
				(<StyleSheet[]>[]).slice.call(this._window.document.styleSheets)
					.filter((ss: StyleSheet) => ss.href === url)
					.forEach((ss: StyleSheet) => {
						const linkNode = <HTMLLinkElement>ss.ownerNode;
						linkNode.href = linkNode.href;
						found = true;
					});

				if (found)
					return;

				break;
		}
	}

	get paused() { return this._isPaused; }
	set paused(paused: boolean) {
		if (this._isPaused !== paused) {
			this._isPaused = paused;
			if (!paused)
				this.loadPreview();
		}
	}
}