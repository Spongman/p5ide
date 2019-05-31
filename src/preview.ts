import { ExtraLibs } from './utils';
import { ProxyConsole } from './proxyConsole';
import { SourceLanguage } from "./SourceLanguage";
import { PreviewError } from './error';
import { P5Editor } from './monaco';
import { ProjectFolder, ProjectFile } from './project';

const _previewPage = "assets/v/blank.html";

export class P5Preview {

	private window: Window | null = null;
	private isDocked = true;
	private isPaused = false;
	private isLoading = false;

	private previousScript: IProjectFile | null = null;

	constructor(private application: IApplication) {
		
	}


	private currentProject: IProject | null = null;
	get project() { return this.currentProject; }
	set project(value: IProject | null) {
		this.currentProject = value;
		this.previewFile();
	}

	private _currentHtml: IProjectFile | null = null;
	get currentHtml() { return this._currentHtml; }

	previewFile(file?: IProjectFile) {
		ExtraLibs.dispose();

		this._currentHtml = file as IProjectFile;
		if (file) {
			if (this.currentProject)
				this.currentProject.clearUsed();

			console.log("previewFile", file.path);
			this._currentHtml.used = true;
			this.loadPreview();
			this.isLoading = true;

			document.querySelector("#previewPanel > .panelHeader > span")!.textContent = this._currentHtml.name;
		} else {
			this.writePreview();
		}
	}


	loadPreview(docked?: boolean) {

		this.isLoading = false;
		this.previousScript = null;
		console.log("loadPreview");

		const previewContainer = document.getElementById('previewContainer')!;
		const consoleContainer = document.getElementById("consoleContainer")!;
		consoleContainer.innerHTML = "";

		if (docked === void 0)
			docked = this.isDocked;

		//console.log("LOAD PREVIEW");
		if (docked) {
			this.window = null;
			const previewFrame = <HTMLIFrameElement>document.getElementById("previewFrame")!;
			if (previewFrame)
				previewFrame.src = _previewPage;
			else
				previewContainer.innerHTML = '<iframe id="previewFrame" width="100%" height="100%" src="' + _previewPage + '"></iframe>';
		}
		else {

			const rect = previewContainer.getBoundingClientRect();
			if (this.isDocked) {
				const pr = window.devicePixelRatio;
				this.window = window.open(_previewPage, "previewFrame",
					"toolbar=0,status=0,menubar=0,location=0,replace=1" +
					",width=" + Math.floor(pr * previewContainer.clientWidth) +
					",height=" + Math.floor(pr * previewContainer.clientHeight) +
					",left=" + (window.screenX + Math.floor(pr * rect.left)) +
					",top=" + (window.screenY + Math.floor(pr * rect.top) + 26)
				);
				const interval = setInterval(() => {
					if (!this.window || this.window.closed) {
						clearInterval(interval);
						this.loadPreview(true);
					}
				}, 250);
			}
			else {
				this.window!.location.href = _previewPage;
				window.focus();
			}
		}

		if (this.isDocked !== docked) {
			this.isDocked = docked;
			document.body.classList.toggle("preview-docked", docked);
			if (!docked)
				previewContainer.innerHTML = "";
			window.dispatchEvent(new Event("resize"));
			this.application.editor && this.application.editor.layout();
		}
	}

	async frameLoaded(event: any) {

		if (this.isDocked) {
			const frame = <HTMLIFrameElement>document.getElementById('previewFrame')!;
			this.window = frame.contentWindow;
		}

		if (!this.window) {
			console.log("WARNING: no previewWindow");
			return;
		}

		loopProtect.alias = "__protect";
		(<any>this.window)['__protect'] = loopProtect.protect;
		const sw = this.window.navigator.serviceWorker;

		/*
		window.addEventListener('unload', event => {
			console.log('UNLOAD', event);
			reg.unregister();
		});
		*/

		sw.addEventListener('message', this.handleRequest.bind(this));

		var root = window.location.pathname.substr(0, window.location.pathname.length - 1);

		await sw.register(root + '/sw.js', { scope: root + "/assets/v/" });
		console.log('sw.ready');

		let reg = sw.ready;
		console.log("registered", reg);

		var currentHtml = this._currentHtml;
		if (!currentHtml)
			return;
		const html = await currentHtml.fetchValue();
		var base = currentHtml.parent!.path;
		console.log('BASE', base);

		setTimeout(async () => {
			this.writePreview(
				"<base href='" + base + "'>"
				+ "<script>(opener||parent).app.preview.onDidLoadPreview(window);</script>"
				+ html);
		}, 1);

		//console.log('registration failed', err);
	}

	async handleRequest(event: MessageEvent) {

		//ServiceWorkerMessageEvent
		if (!event.ports || !this.currentProject)
			return;

		let blob: Blob | null = null;

		const originalUrl = event.data as string;
		console.log("request: " + originalUrl);
		const originLength = event.origin.length;

		if (originalUrl.substring(0, originLength) === event.origin) {
			let url = originalUrl.substring(originLength);

			let node = this.currentProject.find(url);
			if (node instanceof ProjectFolder) {
				if (!url.endsWith("/")) {
					return event.ports[0].postMessage({ redirect: originalUrl + "/" });
				} else {
					throw new Error("TODO: default document");
				}
			}

			if (!node) {
				try {
					node = await this.currentProject.loadFile(url);
				}
				catch (err) {
					if (err.status) {
						return event.ports[0].postMessage({ statusText: err.statusText, status: err.status });
					}
				}
				if (!node) {
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
			if (node instanceof ProjectFile) {
				var file = node as IProjectFile;

				file.used = true;

				const language = file.language;
				switch (language) {
					case SourceLanguage.Javascript:
						if (['p5.js', 'p5.dom.js', 'p5.sound.js'].indexOf(file.name) < 0) {
							if (this.isLoading)
								this.previousScript = file;

							const content = await file.fetchValue();

							if (file !== this.application.currentFile)
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
		if (this.window) {
			this.window.document.open();
			this.window.document.clear();
			if (html)
				this.window.document.write(html);
			this.window.document.close();
		}
	}

	onDidLoadPreview(previewWindow: any) {
		if (this.isLoading) {
			previewWindow.document.addEventListener('DOMContentLoaded', () => {
				this.application.loadFile(this.previousScript || this._currentHtml);
			});
		}
		previewWindow.addEventListener('error', (error:ErrorEvent) => this.handlePreviewError(error));
		const consoleContainer = document.getElementById("consoleContainer")!;
		new ProxyConsole(previewWindow.console, row => {
			const scroll = consoleContainer.scrollTop >= consoleContainer.scrollHeight - consoleContainer.clientHeight - 5;
			consoleContainer.appendChild(row);
			if (scroll)
				consoleContainer.scrollTop = consoleContainer.scrollHeight - consoleContainer.clientHeight;
				this.setConsoleVisibility();
		});
	}

	handlePreviewError(event: ErrorEvent) {

		this.setConsoleVisibility();

		if (this.currentProject) {
			const consoleContainer = document.getElementById("consoleContainer")!;
			const control = new PreviewError(this.application, event);
			consoleContainer.appendChild(control.render());
		}
	}

	setConsoleVisibility(show: boolean = true) {
		const isVisible = document.body.classList.contains("console-visible");
		if (isVisible != show) {
			document.body.classList.toggle("console-visible", show);
			this.application.editor.layout();
		}
	}


	updateFile(file: IProjectFile) {

		if (!this.window)
			return;

		switch (file.language) {
			case SourceLanguage.Css:
				const url = this.window.location.origin + "/" + file.path;

				let found = false;
				(<StyleSheet[]>[]).slice.call(this.window.document.styleSheets)
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

	get paused() { return this.isPaused; }
	set paused(paused: boolean) {
		if (this.isPaused !== paused) {
			this.isPaused = paused;
			if (!paused)
				this.loadPreview();
		}
	}
}