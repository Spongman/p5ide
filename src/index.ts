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

var files = [

	new SourceFile("index.html", SourceLanguage.Html),
	new SourceFile("sketch.js", SourceLanguage.Javascript),
	new SourceFile("style.css", SourceLanguage.Css),

	new SourceFile("index2.html", SourceLanguage.Html),

];

loopProtect.method = "__protect";

function loadFile(file) {
	if (currentFile == this)
		return;

	files.forEach(f => { f.selected = (f === file); });

	var model = editor.getModel();
	if (currentFile)
		currentFile.content = model.getValue();

	currentFile = file;

	changingFiles = true;
	monaco.editor.setModelLanguage(model, file.language.name);
	model.setValue(file.content);
	changingFiles = false;

	document.getElementById("footerFilename").textContent = file.fileName;
	document.getElementById("footerType").textContent = file.language.name;

	if (file.language === SourceLanguage.Html) {
		if (currentHtml !== file) {
			file.used = true;
			currentHtml = file;

			files.forEach(f => { f.used = (f == file); });

			loadPreview();
		}
	}
}

var currentFile: SourceFile;
var currentHtml: SourceFile;
var changingFiles = false;

function eventPromise(elt: HTMLElement, type: string): Promise<Event> {

	return new Promise(function (resolve) {
		function handle(event: Event) {
			console.log("HANDLE", type);
			elt.removeEventListener(type, handle);
			resolve(event);
		}
		elt.addEventListener(type, handle);
	});
}

var editor: monaco.editor.IStandaloneCodeEditor;

Promise.all<any>([
	fetch("p5.global-mode.d.ts").then(response => response.text()),
	document['ready'](),
	...files.map(sf => sf.fetch().then(text => { sf.content = text; }))
]).then((values: any[]) => {

	var fileContainer = document.getElementById("fileContainer");
	if (fileContainer) {
		files.forEach(sf => {
			var elt = sf.element = document.createElement("a");
			var icon = document.createElement("i");
			icon.className = "fa fa-" + sf.icon;
			elt.appendChild(icon);
			var text = document.createElement("span");
			text.textContent = sf.fileName;
			elt.appendChild(text);
			elt.href = "#";
			elt.addEventListener('click', event => {
				event.preventDefault();
				loadFile(sf);
			});
			fileContainer.appendChild(elt);
		})
	}
	console.log('DOM READY');

	require.config({ paths: { 'vs': 'node_modules/monaco-editor/min/vs' } });
	require(['vs/editor/editor.main'], function () {

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

		editor = monaco.editor.create(editorContainer, { theme: 'vs-dark', });

		window.addEventListener('resize', () => {
			editor.layout();
		}, true);

		var timeout: number;

		editor.onDidChangeCursorPosition(event => {
			document.getElementById("footerPosition").textContent = "Ln " + event.position.lineNumber + ", Col " + event.position.column;
		});

		editor.onDidChangeModelContent(event => {

			if (changingFiles || !currentFile.used)
				return;

			if (timeout)
				clearTimeout(timeout);

			timeout = setTimeout(() => {

				timeout = 0;

				console.log("RELOAD", currentFile.fileName);

				switch (currentFile.language) {
					case SourceLanguage.Css:
						//var frame = <HTMLIFrameElement>document.getElementById('previewFrame')!;
						var url = previewWindow.document['origin'] + "/" + currentFile.fileName;

						var found = false;
						(<StyleSheet[]>[]).slice.call(previewWindow.document.styleSheets)
							.filter(ss => ss.href === url)
							.forEach(ss => {
								var linkNode = (<HTMLLinkElement>ss.ownerNode);
								var cssUrl = linkNode.href;
								//linkNode.disabled = true;
								//linkNode.disabled = false;
								linkNode.href = cssUrl;
								found = true;
							});

						if (found)
							return;

						break;
				}

				loadPreview();

			}, 500);
		});

		currentHtml = files.find(f => f.language === SourceLanguage.Html);
		currentHtml.used = true;
		loadFile(files[1]);
		loadPreview();

		document.getElementById("btnRefresh").addEventListener("click", event => {
			event.preventDefault();
			loadPreview();
		});

		var selectTheme = <HTMLSelectElement>document.getElementById("selectTheme");
		selectTheme.addEventListener('change', event => { setTheme(selectTheme.value); });
		setTheme(window.localStorage.theme || selectTheme.value);

		function setTheme(theme: string)
		{
			editor.updateOptions({ theme: theme });
			[].forEach.call(
				document.querySelectorAll("#selectTheme > option"),
				(opt: HTMLOptionElement) => { document.body.classList.remove("theme-" + opt.value); }
			);
			document.body.classList.add("theme-" + theme);
			window.localStorage.theme = theme;
			selectTheme.value = theme;
		}

		[].forEach.call(document.querySelectorAll(".flex-horizontal > span"), (span: HTMLElement) => {

			var left = <HTMLElement>(span.previousElementSibling);
			var parent = <HTMLElement>span.parentNode;

			span.addEventListener('mousedown', event => {
				event.preventDefault();
				document.addEventListener('mousemove', onMove);
				parent.classList.add("dragging");

				document.addEventListener('mouseup', (event) => {
					document.removeEventListener('mousemove', onMove);
					parent.classList.remove("dragging");
				});
			});

			function onMove(event: MouseEvent) {
				event.preventDefault();

				var rect = parent.getBoundingClientRect();
				left.style.width = (event.pageX - rect.left) + "px";
				left.dispatchEvent(new Event("resize"));
			}

		});
	});

});

var previewWindow:Window;

function writePreview() {

	previewWindow.document.clear();
	previewWindow.document.open();
	previewWindow.document.write(currentHtml.content);
	previewWindow.document.close();
}

var _previewLoading = true;
var _previewPoppedOut = false;

function loadPreview() {
	console.log("LOAD PREVIEW");
	_previewLoading = true;

	var previewContainer = document.getElementById('previewContainer')!;
	if (_previewPoppedOut)
	{
		var rect = previewContainer.getBoundingClientRect();
		previewWindow = window.open("/v/blank.html", "previewFrame",
			"toolbar=0,status=0,menubar=0,location=0,replace=1"+
			",width=" + previewContainer.clientWidth +
			",height=" + previewContainer.clientHeight +
			",left=" + (window.screenX + rect.left)+
			",top=" + (window.screenY + rect.top)
		);
	}
	else
	{
		previewWindow = null;
		//previewContainer.innerHTML = '<iframe id="previewFrame" width="100%" height="100%" style="overflow: hidden;" scrolling="no" onload="frameLoaded(event)" src="/v/blank.html"></iframe>';
		previewContainer.innerHTML = '<iframe id="previewFrame" width="100%" height="100%" style="overflow: hidden;" scrolling="no" src="/v/blank.html"></iframe>';
	}
}

function frameLoaded(event: any) {

/*
	console.log("FRAME LOAD", event.target.src);

	if (!event.target.src || event.target.src === "about:blank")
		return;
*/

	if (!_previewLoading)
		return;
	_previewLoading = false;

	if (!_previewPoppedOut)
	{
		var frame = <HTMLIFrameElement>document.getElementById('previewFrame')!;
		previewWindow = frame.contentWindow;
	}

	if (!previewWindow)
	{
		console.log("WARNING: no previewWindow");
		return;
	}

	previewWindow['__protect'] = loopProtect.protect;
	var sw = previewWindow.navigator.serviceWorker;

    /*
    window.addEventListener('unload', event => {
        console.log('UNLOAD', event);
        reg.unregister();
    });
    */

	sw.addEventListener('message', event => {

		console.log("MESSAGE", event);

		var url = event.data;
		var originLength = event.origin.length;
		if (url.substring(0, originLength) === event.origin) {
			url = url.substring(originLength);

			if (url && url.charAt(0) === '/')
				url = url.substring(1);

			var blob = null;
			for (var i = 0; i < files.length; i++) {
				var file = files[i];
				if (file.fileName === url) {

					file.used = true;
					var language = file.language;
					var content = (file === currentFile) ? editor.getValue() : file.content;
					switch (language)
					{
						case SourceLanguage.Javascript:
							content = loopProtect.rewriteLoops(content);
							break;
					}

					blob = new Blob([content], { type: language.mimeType });
					break;
				}
			}
		}
		event.ports && event.ports[0].postMessage(blob);
	});

	sw.register('/sw.js', { scope: "/v/" })
		.then(() => {
			console.log('sw.ready');
			return sw.ready;
		})
		.then(reg => {
			console.log("registered", reg);
			setTimeout(writePreview, 1);
		}).catch(err => {
			console.log('registration failed', err);
		});
}
