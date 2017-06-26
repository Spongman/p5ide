/// <reference types="monaco-editor"/>

// import loopProtect from "loop-protect";

interface Document {
	ready(): Promise<any>;
}

interface Function {
	call<T>(this: (...args: any[]) => T, thisArg: any, ...argArray: any[]): T;
}

class SourceLanguage {
	constructor(public name: string, public mimeType: string = "text/" + name) { }

	static Javascript = new SourceLanguage("javascript");
	static Html = new SourceLanguage("html");
	static Css = new SourceLanguage("css");
}

class SourceFile {

	constructor(public fileName: string, public language: SourceLanguage) {

		var ich = fileName.lastIndexOf('.');
		if (ich >= 0)
			this.extension = fileName.substr(ich + 1);
		else
			this.extension = "null";
	}

	extension: string;
	content: string = "";

	element: HTMLElement;

	fetch(): Promise<string> {
		return fetch("/default/" + this.fileName)
			.then(response => response.text());
	}

	get used(): boolean { return this.element.classList.contains("used"); }
	set used(value: boolean) { this.element.classList[value ? "add" : "remove"]("used"); }

	get selected(): boolean { return this.element.classList.contains("selected"); }
	set selected(value: boolean) { this.element.classList[value ? "add" : "remove"]("selected"); }
}

var files = [

	new SourceFile("index.html", SourceLanguage.Html),
	new SourceFile("sketch.js", SourceLanguage.Javascript),
	new SourceFile("style.css", SourceLanguage.Css),

	new SourceFile("index2.html", SourceLanguage.Html),

];

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
	})
}

var editor: monaco.editor.IStandaloneCodeEditor;

Promise.all<any>([
	fetch("p5.global-mode.d.ts").then(response => response.text()),
	document['ready'](),
	...files.map(sf => sf.fetch().then(text => { sf.content = text; }))
]).then((values: any[]) => {

	var fileContainer = document.getElementById("fileContainer");
	files.forEach(sf => {
		var elt = sf.element = document.createElement("a");
		elt.textContent = sf.fileName;
		elt.href = "#";
		elt.addEventListener('click', event => {
			event.preventDefault();
			loadFile(sf);
		});
		fileContainer.appendChild(elt);
	})

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

				switch (currentFile.language.mimeType) {
					case "text/css":
						var frame = <HTMLIFrameElement>document.getElementById('previewFrame')!;
						var url = frame.contentWindow['origin'] + "/" + currentFile.fileName;

						var found = false;
						(<StyleSheet[]>[]).slice.call(frame.contentWindow.document.styleSheets)
							.filter(ss => ss.href === url)
							.forEach(ss => {
								var linkNode = (<HTMLLinkElement>ss.ownerNode);
								var cssUrl = linkNode.href;
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

		[].forEach.call(document.querySelectorAll(".flex-horizontal span"), (span:HTMLElement) => {

			var left = <HTMLElement> (span.previousElementSibling);

			span.addEventListener('mousedown', event => {
				event.preventDefault();
				document.addEventListener('mousemove', onMove);

				document.addEventListener('mouseup', (event) => {
					document.removeEventListener('mousemove', onMove);
				});
			});

			function onMove(event:MouseEvent)
			{
				event.preventDefault();

				left.style.width = (event.pageX - left.offsetLeft) + "px";
			}

		});
	});

});

function writePreview() {

	var frame = <HTMLIFrameElement>document.getElementById('previewFrame')!;
	console.log("WRITE PREVIEW", frame.baseURI);
	var childWindow = frame.contentWindow

	childWindow.document.clear();
	childWindow.document.open();
	childWindow.document.write(currentHtml.content);
	childWindow.document.close();
}

var _previewLoading = true;

function loadPreview() {
	console.log("LOAD PREVIEW");
	_previewLoading = true;

	var previewContainer = document.getElementById('previewContainer')!;
	previewContainer.innerHTML = '<iframe id="previewFrame" width="100%" height="100%" style="overflow: hidden;" scrolling="no" onload="frameLoaded(event)" src="/v/blank.html"></iframe>';
}

function frameLoaded(event: any) {

	console.log("FRAME LOAD", event.target.src);

	if (!event.target.src || event.target.src === "about:blank")
		return;

	if (!_previewLoading)
		return;

	_previewLoading = false;

	var frame = <HTMLIFrameElement>document.getElementById('previewFrame')!;
	var sw = frame.contentWindow.navigator.serviceWorker;

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
					var content = (file === currentFile) ? editor.getValue() : file.content;

					blob = new Blob([content], { type: file.language.mimeType });
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
			console.log("registered", reg, frame.baseURI);
			setTimeout(writePreview, 1);
		}).catch(err => {
			console.log('registration failed', err);
		});
}
