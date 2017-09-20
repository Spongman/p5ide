
const _previewPage = "/assets/v/blank.html";

class P5Preview {

	private _window: Window | null;
	private _isDocked = true;
	private _isPaused = false;
	private _isLoading = false;

	private _previousScript: ProjectFile | null;

	private _currentProject: Project;
	get project() { return this._currentProject; }
	set project(value: Project) {
		this._currentProject = value;
		preview.previewFile();
	}

	private _currentHtml: ProjectFile;
	get currentHtml() { return this._currentHtml; }

	previewFile(file?: ProjectFile) {
		ExtraLibs.dispose();

		loadCompletePromise.then(() => {
			this._currentHtml = file as ProjectFile;
			if (file) {
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

	frameLoaded(event: any) {

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

		sw.addEventListener('message', async event => {

			if (!event.ports)
				return;

			let url = event.data as string;
			//console.log("MESSAGE", url);
			const originLength = event.origin.length;
			let blob: Blob | null = null;
			if (url.substring(0, originLength) === event.origin) {
				url = url.substring(originLength);

				console.log("load: " + url);
				let file = this._currentProject.workingDirectory.find(url);
				if (!file) {
					file = await this._currentProject.loadFile(url);
				}
				if (file instanceof ProjectFile) {

					file.used = true;
					console.log("message: " + file.path);

					var language = file.language;
					
					/*
					var model = await file.fetchModel();
					var content = model.getValue();
					*/

					switch (language) {
						case SourceLanguage.Javascript:
							if (['p5.js', 'p5.dom.js', 'p5.sound.js'].indexOf(file.name) < 0) {
								if (this._isLoading)
									this._previousScript = file;
								
								let content = await file.fetchValue();

								if (file !== _currentFile)
									ExtraLibs.add(file.name, content);
								blob = new Blob([loopProtect(content)], { type: language && language.mimeType });
							}
							break;
					}

					if (!blob)
						blob = await file.fetchBlob();	

					//blob = new Blob([content], { type: language && language.mimeType });
				}
			}
			event.ports[0].postMessage(blob);
		});

		sw.register('/sw.js', { scope: "/assets/v/" })
			.then(() => {
				console.log('sw.ready');
				return sw.ready;
			})
			.then(reg => {
				console.log("registered", reg);
				setTimeout(async () => {
					var html = await this._currentHtml.fetchValue();
					this.writePreview("<script>(opener||parent).preview.onDidLoadPreview(window);</script>" + html);
				}, 1);
			}).catch(err => {
				console.log('registration failed', err);
			});
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
			var scroll = consoleContainer.scrollTop >= consoleContainer.scrollHeight - consoleContainer.clientHeight - 5;
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
					.filter(ss => ss.href === url)
					.forEach(ss => {
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

var preview = new P5Preview();
