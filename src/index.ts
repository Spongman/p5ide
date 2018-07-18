import { Project, ProjectFile, ProjectNode } from "./project";
import { SourceLanguage } from "./SourceLanguage";
import { P5Editor } from "./monaco";
import { P5Preview } from "./preview";
import { click, EventDelayer, promiseRequire, SourceNodeEvent, ExtraLibs } from "./utils";
import { WebProject } from "./webProject";
import { GitHubProject } from "./githubProject";
import { Auth } from "./auth";

const _auth = new Auth();

declare global {
	interface Document {
		ready(): Promise<any>;
	}
}

const libs = [
	"assets/p5.d.ts",
	"assets/p5.global-mode.d.ts",
	"https://cdn.rawgit.com/Microsoft/TypeScript/master/lib/lib.es5.d.ts",
];

export class Application implements IApplication {

	public editor!: P5Editor;
	public preview!: P5Preview;
	public currentProject!: Project;
	public currentFile: ProjectFile | null = null;

	async loadProjectFromUrl(url: string): Promise<Project> {
		try {
			return await GitHubProject.load(url);
		}
		catch (error) {
			return await WebProject.load(url);
		}
	}

	
	static appendReactChild(parent: Node, child: any) {
		if (typeof child === "string")
			parent.appendChild(document.createTextNode(child));
		else if (child instanceof ProjectNode)
			parent.appendChild(child.element);
		else if (child && typeof child['render'] === 'function')
			parent.appendChild(child.render());
		else if (child instanceof Node)
			parent.appendChild(child);
		else if (child instanceof Array) {
			for (const grandChild of child)
				Application.appendReactChild(parent, grandChild);
		}
		else if (child !== null && child !== void 0 && typeof child !== 'boolean')
			throw "Unsupported child: " + child;
	}

	loadProject(project: Project) {
		console.log()

		const fileContainer = document.getElementById("fileContainer")!;
		fileContainer.innerHTML = "";

		if (this.currentProject)
			this.currentProject.dispose();

		this.closeFile();

		this.currentProject = project;
		this.preview.project = project;

		const li = fileContainer.appendChild(project.element);

		li.addEventListener("p5ide_openFile", event => {
			const sourceEvent = event as SourceNodeEvent;
			this.loadFile(sourceEvent.sourceNode as ProjectFile);
		});

		li.addEventListener("p5ide_deleteNode", event => {
			console.log(event);
		});

		const workingDirectory = project.workingDirectory;

		let defaultFile = workingDirectory.find("index.html");
		if (defaultFile) {
			this.preview.previewFile(defaultFile as ProjectFile);
		} else {
			defaultFile = workingDirectory.find("README.md");
			if (defaultFile) {
				this.loadFile(defaultFile as ProjectFile);
			}
		}
	}

	closeFile() {

		if (!this.currentFile)
			return;

		const model = this.editor.getModel();
		if (model) {
			if (model != this.currentFile.model)
				console.log("model has changed");

			if (this.currentFile.language === SourceLanguage.Javascript ||
				this.currentFile.language === SourceLanguage.Typescript) {
				ExtraLibs.add(this.currentFile.name, model.getValue());
			}
		}

		this.currentFile.selected = false;
		this.currentFile = null;

		this.preview.currentHtml
	}

	async loadFile(file: ProjectFile | null, position?: monaco.IPosition) {
		if (!file)
			return;

		if (this.currentFile !== file) {

			this.closeFile();

			if (file !== this.preview.currentHtml && file.language === SourceLanguage.Html) {

				this.currentProject.workingDirectory = file.parent!;
				this.currentProject.walk(f => {
					if (f.parent)
						f.parent.open = (f.parent === file.parent);
					f.used = (f === file);
				});

				this.preview.previewFile(file);
				return;
			}

			this.currentFile = file;
			this.currentFile.selected = true;

			const model = await file.fetchModel();
			this.editor.setModel(model);

			ExtraLibs.remove(file.name);

			document.getElementById("footerFilename")!.textContent = file.path;
			document.getElementById("footerType")!.textContent = file.languageName || "plain";
			document.getElementById("editorFilename")!.textContent = file.path;

			if (file.parent)
				file.parent.open = true;
		}

		if (position) {
			this.editor.setPosition(position);
		}
	}


	async start() {

		let values = await Promise.all(libs.map(url => fetch(url).then(response => response.text()).then(text => { return { url: url, text: text }; })));
		await document.ready();
		await _auth.initialize();

		this.editor = new P5Editor(values);
		this.preview = new P5Preview(this);

		let project: Project;
		try {
			project = await this.loadProjectFromUrl(location.hash.substring(1));
		}
		catch (err) {
			console.log(err);
			project = await this.loadProjectFromUrl("/assets/default/");
		}
		this.loadProject(project);

		/*
		const optionsDialog = new EditorOptions();
		const options = this.editor.options;
		openDialog(document.body.appendChild(optionsDialog.render(options)));
		*/

		window.addEventListener('resize', () => {
			this.editor.layout();
		}, true);

		this.editor.onDidChangeCursorPosition(event => {
			document.getElementById("footerPosition")!.textContent = "Ln " + event.position.lineNumber + ", Col " + event.position.column;
		});

		this.editor.onDidChangeModel(event => {
			const model = this.editor.getModel();
			if (this.currentFile!.model === model)
				return;

			if (!model) {
				this.closeFile();
				return;
			}

			const file = this.currentProject.walk(item => (item as ProjectFile).model === model ? item : null);
			if (file)
				this.loadFile(file);
			else {
				this.closeFile();

				const path = model.uri.toString();
				// TODO: factor
				document.getElementById("footerFilename")!.textContent = path;
				document.getElementById("footerType")!.textContent = "";
				document.getElementById("editorFilename")!.textContent = path;

			}

			const _delayer = new EventDelayer(() => {

				if (this.currentFile)
				this.preview.loadPreview();
	
			}, 1000);
	
			// TODO: fix race condition where file changes before delay triggers
			// leaving stale changes uncommitted.
			this.editor.onDidChangeModelContent(() => {
				if (this.currentFile && this.currentFile.used && !this.preview.paused)
					_delayer.trigger();
			});
	
		});

		let pause = (paused: boolean) => {
			document.body.classList.toggle("preview-paused", paused);
			this.preview.paused = paused;
		};

		click("btnRefresh", () => { this.preview.loadPreview(); });
		click("btnPause", () => { pause(true); });
		click("btnRun", () => { pause(false); });
		click("btnFloatPreview", () => { this.preview.loadPreview(false); });
		click("btnCloseConsole", () => { this.preview.setConsoleVisibility(false); });
		click("btnLoadProject", (event) => {
			this.openDialog("#projectOpenDialog", event.target as HTMLElement);
			//(document.querySelector("#openProjectDialgo") as HTMLElement).style.display = "block";
		});

		click("btnNewFile", event => this.currentProject.onNewFile(event));
		click("btnNewFolder", event => this.currentProject.onNewFolder(event));


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
				const project = await this.loadProjectFromUrl(urlElement.value);
				this.loadProject(project);
				form.style.display = "none";
			}
			catch (error) {
				urlElement.setCustomValidity("invalid project URL");
				form.reportValidity();
			}
		});
	}


	openDialog(elt: string | HTMLElement, location ?: HTMLElement) {
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

}
