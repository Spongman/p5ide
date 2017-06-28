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


function click(element: HTMLElement | string, fn: (event: MouseEvent) => boolean) {
	if (typeof element === 'string')
		element = document.getElementById(element)!;
	element.addEventListener("click", event => {
		if (fn(event) === false)
			event.preventDefault();
	});
}

loopProtect.method = "__protect";

var _files = [

	new SourceFile("index.html", SourceLanguage.Html),
	new SourceFile("sketch.js", SourceLanguage.Javascript),
	new SourceFile("style.css", SourceLanguage.Css),

	new SourceFile("index2.html", SourceLanguage.Html),

];
var _currentFile: SourceFile;
var _currentHtml: SourceFile;
var _changingFiles = false;

function loadFile(file: SourceFile) {
	if (_currentFile === file)
		return;

	_files.forEach(f => { f.selected = (f === file); });

	var model = _editor.getModel();
	if (_currentFile)
		_currentFile.content = model.getValue();

	_currentFile = file;

	_changingFiles = true;
	monaco.editor.setModelLanguage(model, file.language.name);
	model.setValue(file.content);
	_changingFiles = false;

	document.getElementById("footerFilename")!.textContent = file.fileName;
	document.getElementById("footerType")!.textContent = file.language.name;
	document.getElementById("editorFilename")!.textContent = file.fileName;

	if (file.language === SourceLanguage.Html) {
		if (_currentHtml !== file) {
			_currentHtml = file;

			_files.forEach(f => { f.used = (f === file); });

			loadPreview();
		}
	}
}

var _editor: monaco.editor.IStandaloneCodeEditor;
require.config({ paths: { 'vs': 'node_modules/monaco-editor/min/vs' } });

Promise.all<any>([
	fetch("p5.global-mode.d.ts").then(response => response.text()),
	promiseRequire(['vs/editor/editor.main']),
	document.ready(),
	..._files.map(sf => sf.fetch().then(text => { sf.content = text; }))
]).then((values: any[]) => {

	//console.log('DOM READY');

	var fileContainer = document.getElementById("fileContainer")!;
	_files.forEach(sf => {
		var elt = sf.element = document.createElement("a");
		var icon = document.createElement("i");
		icon.className = "icon fa fa-" + sf.icon;
		elt.appendChild(icon);
		var text = document.createElement("span");
		text.textContent = sf.fileName;
		elt.appendChild(text);
		elt.href = "#";
		click(elt, event => {
			event.preventDefault();
			return false;
		});
		fileContainer.appendChild(elt);
	})

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

	var timeout: number;

	_editor.onDidChangeModelContent(event => {

		if (_changingFiles || !_currentFile.used || _previewPaused)
			return;

		if (timeout)
			clearTimeout(timeout);

		timeout = setTimeout(() => {
			timeout = 0;
			//console.log("RELOAD", _currentFile.fileName);

			if (!_previewWindow)
				return;

			switch (_currentFile.language) {
				case SourceLanguage.Css:
					var url = _previewWindow.location.origin + "/" + _currentFile.fileName;

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

		}, 500);
	});

	var firstHtmlFile = _files.find(f => f.language === SourceLanguage.Html);
	if (firstHtmlFile) {
		_currentHtml = firstHtmlFile;
		_currentHtml.used = true;
		loadFile(_files[1]);
		loadPreview();
	}


	click("btnRefresh", event => {
		loadPreview();
		return false;
	});

	function pause(paused: boolean) {
		_previewPaused = paused;
		document.body.classList.toggle("preview-paused", paused);
	}
	click("btnPause", event => {
		pause(true);
		return false;
	});

	click("btnRun", event => {
		pause(false);
		loadPreview();
		return false;
	});

	click("btnFloatPreview", event => {
		loadPreview(false);
		return false;
	});

	var selectTheme = <HTMLSelectElement>document.getElementById("selectTheme");
	selectTheme.addEventListener('change', event => { setTheme(selectTheme.value); });
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

	[].forEach.call(document.querySelectorAll(".flex-horizontal > span"), (span: HTMLElement) => {

		var parent = <HTMLElement>span.parentNode;
		var fixed = parent.querySelector(":scope > :not(.flex-fill):not(span)") as HTMLElement;
		var left = [].find.call(parent.childNodes, (e: Node) => e === fixed || e === span) !== span;

		span.addEventListener('mousedown', event => {
			event.preventDefault();
			document.addEventListener('mouseup', (event) => {
				document.removeEventListener('mousemove', onMove);
				parent.classList.remove("dragging");
			});
			document.addEventListener('mousemove', onMove);
			parent.classList.add("dragging");
		});

		function onMove(event: MouseEvent) {
			event.preventDefault();
			var rect = parent.getBoundingClientRect();
			var width = left ? (event.pageX - rect.left) : (rect.right - event.pageX);
			fixed.style.width = width + "px";
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

	sw.addEventListener('message', event => {

		//console.log("MESSAGE", event);
		if (!event.ports)
			return;

		var url = event.data as string;
		var originLength = event.origin.length;
		var blob: Blob | null = null;
		if (url.substring(0, originLength) === event.origin) {
			url = url.substring(originLength);

			if (url && url.charAt(0) === '/')
				url = url.substring(1);

			var file = _files.find(f => f.fileName === url);
			if (file) {

				file.used = true;
				var language = file.language;
				var content = (file === _currentFile) ? _editor.getValue() : file.content;
				switch (language) {
					case SourceLanguage.Javascript:
						content = loopProtect.rewriteLoops(content);
						break;
				}

				blob = new Blob([content], { type: language.mimeType });
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
				if (_previewWindow) {
					_previewWindow.document.clear();
					_previewWindow.document.open();
					_previewWindow.document.write(_currentHtml.content);
					_previewWindow.document.close();
				}
			}, 1);
		}).catch(err => {
			//console.log('registration failed', err);
		});
}
