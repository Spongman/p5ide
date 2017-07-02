/// <reference types="monaco-editor"/>
/// <reference path="loop-protect.d.ts"/>
/// <reference path="file.ts"/>
/// <reference path="utils.ts"/>

loopProtect.method = "__protect";
require.config({ paths: { 'vs': 'node_modules/monaco-editor/min/vs' } });

var _editor: monaco.editor.IStandaloneCodeEditor;
var _currentProject: Project;
var _currentFile: SourceFile | null = null;
var _currentHtml: SourceFile;

var loadCompletePromise:Promise<any>;

function loadProject(project: Project) {
	console.log()

	const fileContainer = document.getElementById("fileContainer")!;
	fileContainer.innerHTML = "";

	const mapFileElements: { [name: string]: Element } = {};
	let defaultFile:SourceFile|null = null;

	function getNodeElement(node?: SourceFolder): Element {

		if (!node)
			return fileContainer;

		let elt = mapFileElements[node.path];
		if (elt)
			return elt;

		const parentElement = getNodeElement(node.parent);

		const li = parentElement.appendChild(document.createElement("li"));
		li.className = "sourceNode";

		const anchor = li.appendChild(document.createElement("a"));
		anchor.href = "#";

		const icon = anchor.appendChild(document.createElement("i"));
		icon.className = "icon fa fa-" + node.icon;

		if (node instanceof SourceFile) {
			click(anchor, () => {
				loadFile(node);
				return false;
			});
			elt = anchor;

			if (node.path === "index.html")
				defaultFile = node;
		}
		else {
			const children = elt = li.appendChild(document.createElement("ul"));
			children.className = "sourceFolder";

			const icon2 = anchor.appendChild(document.createElement("i"));
			icon2.className = "icon fa fa-folder-open-o";

			click(anchor, () => {
				li.classList.toggle("open");
				return false;
			});		
		}

		const text = anchor.appendChild(document.createElement("span"));
		text.textContent = node.name;

		node.element = anchor;

		mapFileElements[node.path] = elt;
		return elt;
	}

	project.items.forEach(item => getNodeElement(item));
	_currentProject = project;

	if (defaultFile)
	{
		loadCompletePromise.then(() => {
			_currentHtml = defaultFile!;
			_currentHtml.used = true;
			loadPreview();
		})
	}
}

async function loadFile(file: SourceFile, position?: monaco.IPosition) {
	if (_currentFile !== file) {
		_currentProject.items.forEach(f => { f.selected = (f === file); });

		const model = _editor.getModel();
		if (_currentFile)
			_currentFile.content = model.getValue();

		_currentFile = null;

		const languageName = file.language && file.language.name;

		monaco.editor.setModelLanguage(model, languageName || "");

		let content: string | null = file.content;
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

loadCompletePromise = Promise.all([
	fetch("p5.global-mode.d.ts").then(response => response.text()),
	fetch("p5.d.ts").then(response => response.text()),
	promiseRequire(['vs/editor/editor.main']),
	document.ready().then(() => { loadProject(defaultProject); }),
]);

loadCompletePromise.then((values: any[]) => {

	// validation settings
	monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
		noSemanticValidation: false,
		noSyntaxValidation: false
	});

	// compiler options
	monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
		noLib: true,
		target: monaco.languages.typescript.ScriptTarget.ES2016,
		allowNonTsExtensions: true
	});

	monaco.languages.typescript.javascriptDefaults.addExtraLib(values[1], "p5.d.ts");
	monaco.languages.typescript.javascriptDefaults.addExtraLib(values[0], "p5.global-mode.d.ts");

	const editorContainer = document.getElementById('editorContainer')!;
	_editor = monaco.editor.create(editorContainer, {
		fixedOverflowWidgets: true,
		fontFamily: 'Fira Code',
		//fontLigatures: true,
		//glyphMargin: false,
		lineNumbersMinChars: 3,
		mouseWheelZoom: true,
		scrollBeyondLastLine: false,
		//useTabStops: true,
		//renderIndentGuides: true,
		theme: 'vs-dark',
	});

	window.addEventListener('resize', () => {
		_editor.layout();
	}, true);

	_editor.onDidChangeCursorPosition(event => {
		document.getElementById("footerPosition")!.textContent = "Ln " + event.position.lineNumber + ", Col " + event.position.column;
	});

	const delayer = new EventDelayer(() => {

		if (!_currentFile || !_previewWindow)
			return;

		switch (_currentFile.language) {
			case SourceLanguage.Css:
				const url = _previewWindow.location.origin + "/" + _currentFile.path;

				let found = false;
				(<StyleSheet[]>[]).slice.call(_previewWindow.document.styleSheets)
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

		loadPreview();
	}, 1000);

	_editor.onDidChangeModelContent(() => {
		if (_currentFile && _currentFile.used && !_previewPaused)
			delayer.trigger();
	});

	function pause(paused: boolean) {
		_previewPaused = paused;
		document.body.classList.toggle("preview-paused", paused);
		if (!paused)
			loadPreview();
	}

	click("btnRefresh", () => { loadPreview(); });
	click("btnPause", () => { pause(true); });
	click("btnRun", () => { pause(false); });
	click("btnFloatPreview", () => { loadPreview(false); });
	click("btnCloseConsole", () => { setConsoleVisibility(false); });

	const selectTheme = <HTMLSelectElement>document.getElementById("selectTheme");
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

		const parent = <HTMLElement>span.parentNode;
		const fixed = parent.querySelector(":scope > :not(.flex-fill):not(span)") as HTMLElement;
		const before = [].find.call(parent.childNodes, (e: Node) => e === fixed || e === span) !== span;
		const horizontal = parent.classList.contains("flex-horizontal");

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
			const rect = parent.getBoundingClientRect();
			if (horizontal) {
				const width = before ? (event.pageX - rect.left) : (rect.right - event.pageX);
				fixed.style.width = width + "px";
			}
			else {
				const height = before ? (event.pageY - rect.top) : (rect.bottom - event.pageY);
				fixed.style.height = height + "px";
			}
			fixed.dispatchEvent(new Event("resize"));
		}
	});
});

var _previewWindow: Window | null;
var _previewDocked = true;
var _previewPaused = false;

function loadPreview(docked?: boolean) {

	console.log("loadPreview");

	const previewContainer = document.getElementById('previewContainer')!;
	const consoleContainer = document.getElementById("consoleContainer")!;
	consoleContainer.innerHTML = "";

	if (docked === void 0)
		docked = _previewDocked;

	//console.log("LOAD PREVIEW");
	if (docked) {
		_previewWindow = null;
		const previewFrame = <HTMLIFrameElement>document.getElementById("previewFrame")!;
		if (previewFrame)
			previewFrame.src = "/v/blank.html";
		else
			previewContainer.innerHTML = '<iframe id="previewFrame" width="100%" height="100%" style="overflow: hidden;" scrolling="no" src="/v/blank.html"></iframe>';
	}
	else {

		const rect = previewContainer.getBoundingClientRect();
		if (_previewDocked) {
			const pr = window.devicePixelRatio;
			_previewWindow = window.open("/v/blank.html", "previewFrame",
				"toolbar=0,status=0,menubar=0,location=0,replace=1" +
				",width=" + Math.floor(pr * previewContainer.clientWidth) +
				",height=" + Math.floor(pr * previewContainer.clientHeight) +
				",left=" + (window.screenX + Math.floor(pr * rect.left)) +
				",top=" + (window.screenY + Math.floor(pr * rect.top) + 26)
			);
			const interval = setInterval(() => {
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

function setConsoleVisibility(show: boolean = true) {
	const isVisible = document.body.classList.contains("console-visible");
	if (isVisible != show) {
		document.body.classList.toggle("console-visible", show);
		_editor.layout();
	}
}

function handlePreviewError(event: ErrorEvent) {

	setConsoleVisibility();

	const consoleContainer = document.getElementById("consoleContainer")!;
	const div = consoleContainer.appendChild(document.createElement("div"));
	div.className = "error";

	if (event.error && event.error.stack) {
		const info = div.appendChild(document.createElement("i"));
		info.className = "fa fa-info-circle";
		info.title = event.error.stack;
	}

	const origin = _previewWindow!.location.origin;
	const local = event.filename.substr(0, origin.length) === origin;
	let filename = local ? event.filename.substr(origin.length) : event.filename;
	if (filename.charAt(0) === '/')
		filename = filename.substr(1);
	const fileText = `${filename}(${event.lineno},${event.colno})`;
	const errorText = ` : ${event.message}`;

	if (local) {
		const anchor = div.appendChild(document.createElement("a"));
		anchor.textContent = fileText;
		anchor.href = "#";

		const span = div.appendChild(document.createElement("span"));
		span.textContent = errorText;

		click(anchor, () => {
			loadFile(_currentProject.find(filename) as SourceFile, { lineNumber: event.lineno, column: event.colno });
			return false;
		});
	}
	else {
		const span = div.appendChild(document.createElement("span"));
		span.textContent = fileText + errorText;
	}
}

function frameLoaded(event: any) {

	if (_previewDocked) {
		const frame = <HTMLIFrameElement>document.getElementById('previewFrame')!;
		_previewWindow = frame.contentWindow;
	}

	if (!_previewWindow) {
		console.log("WARNING: no previewWindow");
		return;
	}

	(<any>_previewWindow)['__protect'] = loopProtect.protect;
	const sw = _previewWindow.navigator.serviceWorker;

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
		console.log("MESSAGE", url);
		const originLength = event.origin.length;
		let blob: Blob | null = null;
		if (url.substring(0, originLength) === event.origin) {
			url = url.substring(originLength);

			const file = _currentProject.find(url);
			if (file instanceof SourceFile) {

				file.used = true;
				const language = file.language;
				let content = (file === _currentFile) ? _editor.getValue() : file.content;
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
				_currentHtml &&	_currentHtml.fetch(_currentProject).then((html) => {
					if (_previewWindow)
					{
						_previewWindow.document.clear();
						_previewWindow.document.open();
						_previewWindow.document.write("<script>(opener||parent).initializePreview(window);</script>");
						_previewWindow.document.write(html);
						_previewWindow.document.close();
					}
				});
			}, 1);
		}).catch(err => {
			//console.log('registration failed', err);
		});
}


function initializePreview(previewWindow:any)
{
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