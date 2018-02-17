/// <reference types="monaco-editor"/>
/// <reference path="loop-protect.d.ts"/>
/// <reference path="auth.ts"/>
/// <reference path="preview.ts"/>

require.config({ paths: { 'vs': 'vs' } });


let _editor: P5Editor;
let _currentProject: Project;
let _currentFile: ProjectFile | null = null;

var preview = new P5Preview();

const _auth = new Auth();

class ExtraLibs {

	private static mapExtraLibs: { [name: string]: monaco.IDisposable } = {};

	public static dispose() {
		//console.log("DISPOSE LIBS", name);
		for (const libName in this.mapExtraLibs)
			this.mapExtraLibs[libName].dispose();
		this.mapExtraLibs = {};
	}

	public static add(name: string, content: string) {
		if (this.mapExtraLibs[name])
			return;
		console.log("ADD EXTRA LIB", name);
		const disposable = monaco.languages.typescript.javascriptDefaults.addExtraLib(content, name);
		this.mapExtraLibs[name] = disposable;
	}

	public static remove(name: string) {
		const lib = this.mapExtraLibs[name];
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

	_currentProject = project;
	preview.project = project;

	const li = fileContainer.appendChild(project.element);

	li.addEventListener("p5ide_openFile", event => {
		const sourceEvent = event as SourceNodeEvent;
		loadFile(sourceEvent.sourceNode as ProjectFile);
	});

	li.addEventListener("p5ide_deleteNode", event => {
		console.log(event);
	});

	const workingDirectory = project.workingDirectory;

	let defaultFile = workingDirectory.find("index.html");
	if (defaultFile) {
		preview.previewFile(defaultFile as ProjectFile);
	} else {
		defaultFile = workingDirectory.find("README.md");
		if (defaultFile) {
			loadFile(defaultFile as ProjectFile);
		}
	}
}

function closeFile() {

	if (!_currentFile)
		return;

	const model = _editor.getModel();
	if (model) {
		if (model != _currentFile.model)
			console.log("model has changed");

		if (_currentFile.language === SourceLanguage.Javascript ||
			_currentFile.language === SourceLanguage.Typescript) {
			ExtraLibs.add(_currentFile.name, model.getValue());
		}
	}

	_currentFile.selected = false;
	_currentFile = null;

	preview.currentHtml
}

async function loadFile(file: ProjectFile | null, position?: monaco.IPosition) {
	if (!file)
		return;

	if (_currentFile !== file) {

		closeFile();

		if (file !== preview.currentHtml && file.language === SourceLanguage.Html) {

			_currentProject.workingDirectory = file.parent!;
			_currentProject.walk(f => {
				if (f.parent)
					f.parent.open = (f.parent === file.parent);
				f.used = (f === file);
			});

			preview.previewFile(file);
			return;
		}

		_currentFile = file;
		_currentFile.selected = true;

		const model = await file.fetchModel();
		_editor.setModel(model);

		ExtraLibs.remove(file.name);

		document.getElementById("footerFilename")!.textContent = file.path;
		document.getElementById("footerType")!.textContent = file.languageName || "plain";
		document.getElementById("editorFilename")!.textContent = file.path;

		if (file.parent)
			file.parent.open = true;
	}

	if (position) {
		_editor.setPosition(position);
	}
}

const libs = [
	"assets/p5.d.ts",
	"assets/p5.global-mode.d.ts",
	"https://cdn.rawgit.com/Microsoft/TypeScript/master/lib/lib.es5.d.ts",
];

const loadCompletePromise = Promise.all([
	Promise.all(libs.map(url => fetch(url).then(response => response.text()).then(text => { return { url: url, text: text }; }))),
	promiseRequire(['vs/editor/editor.main']),
	//promiseRequire(['loop-protect']),
	document.ready().then(async () => {
		await _auth.initialize();
	}),
]);


loadCompletePromise.then(async values => {

	loopProtect.alias = "__protect";

	_editor = new P5Editor(values[0]);


	let project: Project;
	try {
		project = await Project.load(location.hash.substring(1));
	}
	catch (err) {
		console.log(err);
		project = await WebProject.load("/assets/default/");
	}
	loadProject(project);

	/*
	const optionsDialog = new EditorOptions();
	const options = _editor.options;
	openDialog(document.body.appendChild(optionsDialog.render(options)));
	*/

	window.addEventListener('resize', () => {
		_editor.layout();
	}, true);

	_editor.onDidChangeCursorPosition(event => {
		document.getElementById("footerPosition")!.textContent = "Ln " + event.position.lineNumber + ", Col " + event.position.column;
	});

	_editor.onDidChangeModel(event => {
		const model = _editor.getModel();
		if (_currentFile!.model === model)
			return;

		if (!model) {
			closeFile();
			return;
		}

		const file = _currentProject.walk(item => (item as ProjectFile).model === model ? item : null);
		if (file)
			loadFile(file);
		else {
			closeFile();

			const path = model.uri.toString();
			// TODO: factor
			document.getElementById("footerFilename")!.textContent = path;
			document.getElementById("footerType")!.textContent = "";
			document.getElementById("editorFilename")!.textContent = path;

		}
	});

	const _delayer = new EventDelayer(() => {

		if (_currentFile)
			preview.loadPreview();

	}, 1000);

	// TODO: fix race condition where file changes before delay triggers
	// leaving stale changes uncommitted.
	_editor.onDidChangeModelContent(() => {
		if (_currentFile && _currentFile.used && !preview.paused)
			_delayer.trigger();
	});

	function pause(paused: boolean) {
		document.body.classList.toggle("preview-paused", paused);
		preview.paused = paused;
	}

	click("btnRefresh", () => { preview.loadPreview(); });
	click("btnPause", () => { pause(true); });
	click("btnRun", () => { pause(false); });
	click("btnFloatPreview", () => { preview.loadPreview(false); });
	click("btnCloseConsole", () => { setConsoleVisibility(false); });
	click("btnLoadProject", (event) => {
		openDialog("#projectOpenDialog", event.target as HTMLElement);
		//(document.querySelector("#openProjectDialgo") as HTMLElement).style.display = "block";
	});

	click("btnNewFile", event => _currentProject.onNewFile(event));
	click("btnNewFolder", event => _currentProject.onNewFolder(event));


	click("btnLogin", async () => {
		await _auth.login();
	});

	const selectTheme = <HTMLSelectElement>document.getElementById("selectTheme");
	selectTheme.addEventListener('change', () => { setTheme(selectTheme.value); });
	setTheme(window.localStorage.theme || selectTheme.value);

	function setTheme(theme: string) {
		monaco.editor.setTheme(theme);
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

	document.querySelector("#projectOpenDialog")!.addEventListener("submit", async event => {
		event.preventDefault();

		const form = event.target as HTMLFormElement;
		const urlElement = (document.activeElement.tagName === "BUTTON" ? document.activeElement : form.elements.namedItem("url")) as HTMLInputElement;

		try {
			const project = await Project.load(urlElement.value);
			loadProject(project);
			form.style.display = "none";
		}
		catch (error) {
			urlElement.setCustomValidity("invalid project URL");
			form.reportValidity();
		}
	});
});



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
	const control = new PreviewError(event);
	consoleContainer.appendChild(control.render());
}


function openDialog(elt: string | HTMLElement, location?: HTMLElement) {
	if (typeof elt === 'string')
		elt = document.querySelector(elt) as HTMLElement;
	let left = 100, top = 100;
	if (location) {
		const rect = location.getBoundingClientRect();
		left = rect.right;
		top = rect.bottom;
	}
	elt.style.paddingLeft = left + "px";
	elt.style.paddingTop = top + "px";
	elt.style.display = "block";

	const focus = elt.querySelector("input[autofocus]") as HTMLElement;
	if (focus)
		focus.focus();
}