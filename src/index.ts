/// <reference types="monaco-editor"/>
/// <reference path="loop-protect.d.ts"/>
/// <reference path="file.ts"/>

// import loopProtect from "loop-protect";

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

function click(element: HTMLElement | string, fn: (event: MouseEvent) => boolean) {
	if (typeof element === 'string')
		element = document.getElementById(element)!;
	element.addEventListener("click", event => {
		if (fn(event) === false)
			event.preventDefault();
	});
}

class EventDelayer {

	constructor(private callback: () => void, private delay: number) {
	}

	private timeUpdate: number;

	private startTimer(delay: number) {
		setTimeout(() => {

			var timeRemaining = this.timeUpdate - Date.now();
			if (timeRemaining > 0) {
				this.startTimer(timeRemaining);
			} else {
				this.timeUpdate = 0;
				this.callback();
			}

		}, this.delay);
	}

	trigger() {
		var timeNow = Date.now();
		if (!this.timeUpdate)
			this.startTimer(this.delay);
		this.timeUpdate = timeNow + this.delay;
	}
}

loopProtect.method = "__protect";

var mapFileElements: { [name: string]: Element } = {};

var _currentFile: SourceFile | null = null;
var _currentHtml: SourceFile;
var _currentProject: Project;

function loadProject(project: Project) {

	_currentProject = project;

	var fileContainer = document.getElementById("fileContainer")!;

	function getNodeElement(node?: SourceFolder): Element {

		if (!node)
			return fileContainer;

		var elt = mapFileElements[node.path];
		if (elt)
			return elt;

		var parentElement = getNodeElement(node.parent);

		var li = parentElement.appendChild(document.createElement("li"));
		li.className = "sourceNode";

		var anchor = li.appendChild(document.createElement("a"));
		anchor.href = "#";

		var icon = anchor.appendChild(document.createElement("i"));
		icon.className = "icon fa fa-" + node.icon;

		var text = anchor.appendChild(document.createElement("span"));
		text.textContent = node.name;

		node.element = anchor;

		if (node instanceof SourceFile) {
			click(anchor, () => {
				loadFile(node);
				return false;
			});
			elt = anchor;
		}
		else {
			var children = elt = li.appendChild(document.createElement("ul"));
			children.className = "sourceFolder";
		}

		mapFileElements[node.path] = elt;
		return elt;
	}

	project.items.forEach(item => getNodeElement(item));
}

async function loadFile(file: SourceFile, position?: monaco.IPosition) {
	if (_currentFile !== file) {
		_currentProject.items.forEach(f => { f.selected = (f === file); });

		var model = _editor.getModel();
		if (_currentFile)
			_currentFile.content = model.getValue();

		_currentFile = null;

		var languageName = file.language && file.language.name;

		monaco.editor.setModelLanguage(model, languageName || "");

		var content: string | null = file.content;
		if (content === null)
			content = file.content = await file.fetch(_currentProject);

		model.setValue(content);


		_currentFile = file;

		document.getElementById("footerFilename")!.textContent = file.path;
		document.getElementById("footerType")!.textContent = languageName || "plain";
		document.getElementById("editorFilename")!.textContent = file.path;

		if (file.language === SourceLanguage.Html) {
			if (_currentHtml !== file) {
				_currentHtml = file;

				_currentProject.items.forEach(f => { f.used = (f === file); });

				loadPreview();
			}
		}
	}

	if (position) {
		_editor.setPosition(position);
		_editor.focus();
	}
}

var _editor: monaco.editor.IStandaloneCodeEditor;
require.config({ paths: { 'vs': 'node_modules/monaco-editor/min/vs' } });

Promise.all<any>([
	fetch("p5.global-mode.d.ts").then(response => response.text()),
	promiseRequire(['vs/editor/editor.main']),
	document.ready(),
	//..._files.map(sf => sf.fetch().then(text => { sf.content = text; }))
]).then((values: any[]) => {

	//console.log('DOM READY');
	loadProject(defaultProject);

	// validation settings
	monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
		noSemanticValidation: false,
		noSyntaxValidation: false
	});

	// compiler options
	monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
		noLib: true,
		target: monaco.languages.typescript.ScriptTarget.ES2017,
		allowNonTsExtensions: true
	});

	monaco.languages.typescript.javascriptDefaults.addExtraLib(values[0], "p5.global-mode.d.ts");

	var editorContainer = document.getElementById('editorContainer')!;
	_editor = monaco.editor.create(editorContainer, { theme: 'vs-dark', });

	window.addEventListener('resize', () => {
		_editor.layout();
	}, true);


	_editor.onDidChangeCursorPosition(event => {
		document.getElementById("footerPosition")!.textContent = "Ln " + event.position.lineNumber + ", Col " + event.position.column;
	});

	var delayer = new EventDelayer(() => {

		if (!_currentFile || !_previewWindow)
			return;

		switch (_currentFile.language) {
			case SourceLanguage.Css:
				var url = _previewWindow.location.origin + "/" + _currentFile.path;

				var found = false;
				(<StyleSheet[]>[]).slice.call(_previewWindow.document.styleSheets)
					.filter(ss => ss.href === url)
					.forEach(ss => {
						var linkNode = <HTMLLinkElement>ss.ownerNode;
						linkNode.href = linkNode.href;
						found = true;
					});

				if (found)
					return;

				break;
		}

		loadPreview();
	}, 1000);

	_editor.onDidChangeModelContent(() => {
		if (_currentFile && _currentFile.used && !_previewPaused)
			delayer.trigger();
	});

	/*
	var firstHtmlFile = _files.find(f => f.language === SourceLanguage.Html);
	if (firstHtmlFile) {
		_currentHtml = firstHtmlFile;
		_currentHtml.used = true;
		loadFile(_files[1]);
		loadPreview();
	}
	*/

	function pause(paused: boolean) {
		_previewPaused = paused;
		document.body.classList.toggle("preview-paused", paused);
	}

	click("btnRefresh", () => {
		loadPreview();
		return false;
	});

	click("btnPause", () => {
		pause(true);
		return false;
	});

	click("btnRun", () => {
		pause(false);
		loadPreview();
		return false;
	});

	click("btnFloatPreview", () => {
		loadPreview(false);
		return false;
	});

	var selectTheme = <HTMLSelectElement>document.getElementById("selectTheme");
	selectTheme.addEventListener('change', () => { setTheme(selectTheme.value); });
	setTheme(window.localStorage.theme || selectTheme.value);

	function setTheme(theme: string) {
		_editor.updateOptions({ theme: theme });
		[].forEach.call(
			document.querySelectorAll("#selectTheme > option"),
			(opt: HTMLOptionElement) => { document.body.classList.remove("theme-" + opt.value); }
		);
		document.body.classList.add("theme-" + theme);
		window.localStorage.theme = theme;
		selectTheme.value = theme;
	}

	[].forEach.call(document.querySelectorAll(".flex-horizontal > span, .flex-vertical > span"), (span: HTMLElement) => {

		var parent = <HTMLElement>span.parentNode;
		var fixed = parent.querySelector(":scope > :not(.flex-fill):not(span)") as HTMLElement;
		var before = [].find.call(parent.childNodes, (e: Node) => e === fixed || e === span) !== span;
		var horizontal = parent.classList.contains("flex-horizontal");

		span.addEventListener('mousedown', event => {
			event.preventDefault();
			document.addEventListener('mouseup', () => {
				document.removeEventListener('mousemove', onMove);
				parent.classList.remove("dragging");
			});
			document.addEventListener('mousemove', onMove);
			parent.classList.add("dragging");
		});

		function onMove(event: MouseEvent) {
			event.preventDefault();
			var rect = parent.getBoundingClientRect();
			if (horizontal) {
				var width = before ? (event.pageX - rect.left) : (rect.right - event.pageX);
				fixed.style.width = width + "px";
			}
			else {
				var height = before ? (event.pageY - rect.top) : (rect.bottom - event.pageY);
				fixed.style.height = height + "px";
			}
			fixed.dispatchEvent(new Event("resize"));
		}
	});

	/*
	const examplesUrl = "https://api.github.com/repos/processing/p5.js-website/contents/dist/assets/examples";

	fetch(examplesUrl + "/en")
		.then(response => response.json())
		.then(json => {
			var categories = json.map(e => {
				return {
					name: e.name.replace('_', ' '),
					path: e.path.substring('dist/assets/examples'.length)
				};
			});

			Promise.all(categories.map(c =>
				fetch(examplesUrl + c.path)
					.then(response => response.text())
					.then(text => { c.text = text; })
			)).then(categories => {
				debugger;
			});
		});
	*/
});

var _previewLoading = true;
var _previewDocked = true;
var _previewPaused = false;
var _previewWindow: Window | null;


function loadPreview(docked?: boolean) {

	console.log("loadPreview");

	var consoleContainer = document.getElementById("consoleContainer")!;
	consoleContainer.innerHTML = "";

	var previewContainer = document.getElementById('previewContainer')!;

	_previewLoading = true;

	if (docked === void 0)
		docked = _previewDocked;

	//console.log("LOAD PREVIEW");
	if (docked) {
		_previewWindow = null;
		var previewFrame = <HTMLIFrameElement>document.getElementById("previewFrame")!;
		if (previewFrame)
			previewFrame.src = "/v/blank.html";
		else
			previewContainer.innerHTML = '<iframe id="previewFrame" width="100%" height="100%" style="overflow: hidden;" scrolling="no" src="/v/blank.html"></iframe>';
	}
	else {

		var rect = previewContainer.getBoundingClientRect();
		if (_previewDocked) {
			var pr = window.devicePixelRatio;
			_previewWindow = window.open("/v/blank.html", "previewFrame",
				"toolbar=0,status=0,menubar=0,location=0,replace=1" +
				",width=" + Math.floor(pr * previewContainer.clientWidth) +
				",height=" + Math.floor(pr * previewContainer.clientHeight) +
				",left=" + (window.screenX + Math.floor(pr * rect.left)) +
				",top=" + (window.screenY + Math.floor(pr * rect.top) + 26)
			);
			_previewWindow.addEventListener("error", handlePreviewError);
			var interval = setInterval(() => {
				if (!_previewWindow || _previewWindow.closed) {
					clearInterval(interval);
					loadPreview(true);
				}
			}, 250);
		}
		else {
			_previewWindow!.location.href = "/v/blank.html";
			window.focus();
		}
	}

	if (_previewDocked !== docked) {
		_previewDocked = docked;
		document.body.classList.toggle("preview-docked", docked);
		if (!docked)
			previewContainer.innerHTML = "";
		_editor && _editor.layout();
	}
}

function setConsoleVisibility(show: boolean) {
	var isVisible = document.body.classList.contains("console-visible");
	if (isVisible != show) {
		document.body.classList.toggle("console-visible", show);
		_editor.layout();
	}
}

function handlePreviewError(event: ErrorEvent) {

	setConsoleVisibility(true);

	var consoleContainer = document.getElementById("consoleContainer")!;
	var div = consoleContainer.appendChild(document.createElement("div"));
	div.className = "error";

	if (event.error && event.error.stack) {
		var info = div.appendChild(document.createElement("i"));
		info.className = "fa fa-info-circle";
		info.title = event.error.stack;
	}

	var origin = _previewWindow!.location.origin;
	var local = event.filename.substr(0, origin.length) === origin;
	var filename = local ? event.filename.substr(origin.length) : event.filename;
	if (filename.charAt(0) === '/')
		filename = filename.substr(1);
	var fileText = `${filename}(${event.lineno},${event.colno})`;
	var errorText = ` : ${event.message}`;

	if (local) {
		var anchor = div.appendChild(document.createElement("a"));
		anchor.textContent = fileText;
		anchor.href = "#";

		var span = div.appendChild(document.createElement("span"));
		span.textContent = errorText;

		click(anchor, () => {
			loadFile(_currentProject.find(filename) as SourceFile, { lineNumber: event.lineno, column: event.colno });
			return false;
		});
	}
	else {
		var span = div.appendChild(document.createElement("span"));
		span.textContent = fileText + errorText;
	}
}

function frameLoaded(event: any) {

	/*	
	if (!_previewLoading)
		return;
	_previewLoading = false;
	*/

	if (_previewDocked) {
		var frame = <HTMLIFrameElement>document.getElementById('previewFrame')!;
		_previewWindow = frame.contentWindow;
	}

	if (!_previewWindow) {
		console.log("WARNING: no previewWindow");
		return;
	}

	(<any>_previewWindow)['__protect'] = loopProtect.protect;
	var sw = _previewWindow.navigator.serviceWorker;

    /*
    window.addEventListener('unload', event => {
        console.log('UNLOAD', event);
        reg.unregister();
    });
    */

	sw.addEventListener('message', async event => {

		if (!event.ports)
			return;

		var url = event.data as string;
		console.log("MESSAGE", url);
		var originLength = event.origin.length;
		var blob: Blob | null = null;
		if (url.substring(0, originLength) === event.origin) {
			url = url.substring(originLength);

			var file = _currentProject.find(url);
			if (file instanceof SourceFile) {

				file.used = true;
				var language = file.language;
				var content = (file === _currentFile) ? _editor.getValue() : file.content;
				if (content === null)
					content = await file.fetch(_currentProject);

				switch (language) {
					case SourceLanguage.Javascript:
						content = loopProtect.rewriteLoops(content);
						break;
				}

				blob = new Blob([content], { type: language && language.mimeType });
			}
		}
		event.ports[0].postMessage(blob);
	});

	sw.register('/sw.js', { scope: "/v/" })
		.then(() => {
			//console.log('sw.ready');
			return sw.ready;
		})
		.then(reg => {
			//console.log("registered", reg);
			setTimeout(() => {
				if (_previewWindow && _currentHtml) {
					_previewWindow.document.clear();
					_previewWindow.document.open();
					_previewWindow.document.write("<script>window.addEventListener('error', parent.handlePreviewError);</script>");
					_previewWindow.document.write(_currentHtml.content!);
					_previewWindow.document.close();
				}
			}, 1);
		}).catch(err => {
			//console.log('registration failed', err);
		});
}
