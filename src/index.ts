/// <reference types="monaco-editor"/>
/// <reference path="loop-protect.d.ts"/>
/// <reference path="file.tsx"/>
/// <reference path="utils.ts"/>

require.config({ paths: { 'vs': 'node_modules/monaco-editor/min/vs' } });

var _editor: monaco.editor.IStandaloneCodeEditor;
var _currentProject: Project;
var _currentFile: SourceFile | null = null;
var _currentHtml: SourceFile;

class extraLibs {

	private static mapExtraLibs: { [name: string]: monaco.IDisposable } = {};

	public static dispose() {
		//console.log("DISPOSE LIBS", name);
		for (var libName in this.mapExtraLibs)
			this.mapExtraLibs[libName].dispose();
		this.mapExtraLibs = {};
	}

	public static add(name: string, content: string) {
		if (this.mapExtraLibs[name])
			return;
		//console.log("ADD EXTRA LIB", name);
		var disposable = monaco.languages.typescript.javascriptDefaults.addExtraLib(content, name);
		this.mapExtraLibs[name] = disposable;
	}

	public static remove(name: string) {
		var lib = this.mapExtraLibs[name];
		if (lib) {
			lib.dispose();
			delete this.mapExtraLibs[name];
		}
	}
}



function loadProject(project: Project) {
	console.log()

	const fileContainer = document.getElementById("fileContainer")!;
	fileContainer.innerHTML = "";

	if (_currentProject)
		_currentProject.dispose();

	closeFile();

	if (_previewWindow) {
		writePreview();
	}

	_currentProject = project;


	var li = fileContainer.appendChild(project.render());

	li.addEventListener("p5ide_openFile", (event: SourceNodeEvent) => {
		loadFile(event.sourceNode as SourceFile);
	});

	li.addEventListener("p5ide_deleteNode", event => {
		console.log(event);
	});

	var workingDirectory = project.workingDirectory;

	var defaultFile = workingDirectory.find("index.html");
	if (defaultFile) {
		previewFile(defaultFile as SourceFile);
	} else {
		defaultFile = workingDirectory.find("README.md");
		if (defaultFile) {
			loadFile(defaultFile as SourceFile);
		}
	}
}

function closeFile() {

	if (!_currentFile)
		return;

	_currentFile.selected = false;

	const model = _editor.getModel();
	if (model) {
		if (model != _currentFile.model)
			console.log("model has changed");
		_currentFile.content = model.getValue();

		if (_currentFile.language === SourceLanguage.Javascript ||
			_currentFile.language === SourceLanguage.Typescript) {
			extraLibs.add(_currentFile.name, _currentFile.content);
		}
	}
}

async function loadFile(file: SourceFile, position?: monaco.IPosition) {
	if (!file)
		return;

	if (_currentFile !== file) {

		closeFile();

		if (file !== _currentHtml && file.language === SourceLanguage.Html) {

			_currentProject.workingDirectory = file.parent!;
			_currentProject.items.forEach(f => {
				if (f.parent)
					f.parent.open = (f.parent === file.parent);
				f.used = (f === file);
			});

			previewFile(file);
			return;
		}

		_currentFile = file;
		_currentFile.selected = true;

		let languageName: string = "";
		if (file.language)
			languageName = file.language.name;
		else {
			var l = monaco.languages.getLanguages().find(l => l.extensions ? l.extensions.indexOf(file.extension) >= 0 : false);
			if (l)
				languageName = l.id;
		}

		var model = file.model;
		if (!model) {
			let content: string | null = file.content;
			if (content === null)
				content = file.content = await file.fetch(_currentProject);

			model = file.model = monaco.editor.createModel(content, languageName);
		}

		_editor.setModel(model);

		extraLibs.remove(file.name);

		document.getElementById("footerFilename")!.textContent = file.path;
		document.getElementById("footerType")!.textContent = languageName || "plain";
		document.getElementById("editorFilename")!.textContent = file.path;

		if (file.parent)
			file.parent.open = true;
	}

	if (position) {
		_editor.setPosition(position);
		_editor.focus();
	}
}

var libs = [
	"p5.d.ts",
	"p5.global-mode.d.ts",
	"https://cdn.rawgit.com/Microsoft/TypeScript/master/lib/lib.es5.d.ts",
];

var loadCompletePromise = Promise.all([
	Promise.all(libs.map(url => fetch(url).then(response => response.text()).then(text => { return { url: url, text: text }; }))),
	promiseRequire(['vs/editor/editor.main']),
	//promiseRequire(['loop-protect']),
	document.ready().then(() => { loadProject(defaultProject); }),
]);

function previewFile(file: SourceFile) {
	extraLibs.dispose();

	loadCompletePromise.then(() => {
		_currentHtml = file as SourceFile;
		_currentHtml.used = true;
		loadPreview();
		_loadingPreview = true;

		document.querySelector("#previewPanel > .panelHeader > span")!.textContent = _currentHtml.name;
	});
}

function openDialog(elt: string | HTMLElement, location: HTMLElement) {
	if (typeof elt === 'string')
		elt = document.querySelector(elt) as HTMLElement;
	var left = 100, top = 100;
	if (location) {
		var rect = location.getBoundingClientRect();
		left = rect.right;
		top = rect.bottom;
	}
	elt.style.paddingLeft = left + "px";
	elt.style.paddingTop = top + "px";
	elt.style.display = "block";

	var focus = elt.querySelector("input[autofocus]") as HTMLElement;
	if (focus)
		focus.focus();
}


loadCompletePromise.then(values => {

	loopProtect.alias = "__protect";

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

	var textModelResolverService = new SimpleEditorModelResolverService();

	var editorService = {
		openEditor: function (options, sideBySide) {
			var model = monaco.editor.getModel(options.resource.path);
			if (!model)
				return monaco.Promise.as(null);
			_editor.setModel(model);
			return monaco.Promise.as(_editor);
		},
		resolveEditor: function () {
			alert(`resolve editor called!` + JSON.stringify(arguments));
		}
	};
	
	const editorContainer = document.getElementById('editorContainer')!;
	_editor = monaco.editor.create(
		editorContainer, {
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
		}, {
			//editorService: editorService,
			textModelResolverService: textModelResolverService,
		});
	
	textModelResolverService.setEditor(_editor);


	values[0].forEach((lib, i: number) => {
		console.log("addExtraLib: " + lib.url);
		monaco.languages.typescript.javascriptDefaults.addExtraLib(lib.text, lib.url);
	});
	values[0].forEach((lib, i: number) => {
		monaco.editor.createModel(lib.text, "typescript", monaco.Uri.parse(lib.url));
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
	click("btnLoadProject", (event) => {
		openDialog("#projectOpenDialog", event.target as HTMLElement);
		//(document.querySelector("#openProjectDialgo") as HTMLElement).style.display = "block";
	});

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

	[].forEach.call(document.body.querySelectorAll(".dialog"), (elt: HTMLElement) => {
		elt.addEventListener("click", event => {
			if (event.target === elt)
				elt.style.display = "none";
		});
	});

	document.querySelector("#projectOpenDialog")!.addEventListener("submit", event => {
		event.preventDefault();

		var form = event.target as HTMLFormElement;
		var urlElement = (document.activeElement.tagName === "BUTTON" ? document.activeElement : form.elements.namedItem("url")) as HTMLInputElement;
		var url = urlElement.value;

		GitHubProject.load(url)
			.then(project => {
				loadProject(project);
				form.style.display = "none";
			})
			.catch(error => {
				urlElement.setCustomValidity(error);
				form.reportValidity();
			});
	});
});

var _previewWindow: Window | null;
var _previewDocked = true;
var _previewPaused = false;
var _loadingPreview = false;

function loadPreview(docked?: boolean) {

	_loadingPreview = false;
	_previousScript = null;
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
	const local = event.filename.startsWith(origin);
	let filename = local ? event.filename.substr(origin.length) : event.filename;
	filename = filename.trimStart('/');
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

var _previousScript: SourceFile | null;

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
		//console.log("MESSAGE", url);
		const originLength = event.origin.length;
		let blob: Blob | null = null;
		if (url.substring(0, originLength) === event.origin) {
			url = url.substring(originLength);

			const file = _currentProject.workingDirectory.find(url);
			if (file instanceof SourceFile) {

				file.used = true;
				const language = file.language;
				let content = (file === _currentFile) ? _editor.getValue() : file.content;
				if (content === null)
					content = await file.fetch(_currentProject);

				switch (language) {
					case SourceLanguage.Javascript:
						if (['p5.js', 'p5.dom.js', 'p5.sound.js'].indexOf(file.name) < 0) {
							if (_loadingPreview)
								_previousScript = file;
							if (file !== _currentFile)
								extraLibs.add(file.name, content);
							content = loopProtect(content);
						}
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
			setTimeout(async () => {
				var html = _currentHtml && (_currentHtml.content || await _currentHtml.fetch(_currentProject));
				writePreview("<script>(opener||parent).initializePreview(window);</script>" + html);
			}, 1);
		}).catch(err => {
			console.log('registration failed', err);
		});
}

function writePreview(html?: string) {
	if (_previewWindow) {
		_previewWindow.document.open();
		_previewWindow.document.clear();
		if (html)
			_previewWindow.document.write(html);
		_previewWindow.document.close();
	}
}

function initializePreview(previewWindow: any) {
	if (_loadingPreview) {
		previewWindow.document.addEventListener('DOMContentLoaded', function () {
			loadFile(_previousScript || _currentHtml);
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