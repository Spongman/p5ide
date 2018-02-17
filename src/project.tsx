
class SourceLanguage {
	constructor(public name: string, public extensions: string[], public icon: string = "file-o", public mimeType: string = "text/" + name) { }

	static Javascript = new SourceLanguage("javascript", [".js"], "file-text-o");
	static Typescript = new SourceLanguage("typescript", [".ts"], "file-text-o");
	static Html = new SourceLanguage("html", [".html"], "file-code-o");
	static Css = new SourceLanguage("css", [".css"], "file-text-o");

	private static _languages = [
		SourceLanguage.Javascript,
		SourceLanguage.Typescript,
		SourceLanguage.Html,
		SourceLanguage.Css,
	];

	static fromExtension(extension: string): SourceLanguage | undefined {
		if (extension.charAt(0) !== '.')
			extension = '.' + extension;
		return SourceLanguage._languages.find(l => l.extensions.indexOf(extension) >= 0);
	}
}

abstract class ProjectNode implements monaco.IDisposable {

	constructor(public name: string, public icon: string) {
		this.element = this.renderElement();
	}
	parent: ProjectFolder | null = null;
	readonly element: HTMLElement;

	abstract get path(): string;

	get used(): boolean { return this.element.classList.contains("used"); }
	set used(value: boolean) { this.setUsed(value); }

	clearUsed() { this.used = false }

	protected setUsed(value: boolean) {
		if (value && this.parent)
			this.parent.used = true;
		this.element.classList.toggle("used", value);
	}

	get selected(): boolean {
		return this.element.classList.contains("selected");
	}
	set selected(value: boolean) {
		this.element.classList.toggle("selected", value);
	}

	protected abstract renderElement(): HTMLElement;

	abstract dispose(): void;
	delete() {
		this.dispose();
		this.element.remove();
	}

	protected _allowClick = true;

	protected onClick(event: Event) {
		event.preventDefault();
		if (this._allowClick)
			this.activate();
	}

	protected onDelete(event: Event) {
		event.preventDefault();

		let deleteNodeEvent = new Event("p5ide_deleteNode", {
			bubbles: true,
			cancelable: true,
		}) as SourceNodeEvent;
		deleteNodeEvent.sourceNode = this;
		if (event.target.dispatchEvent(deleteNodeEvent)) {
			this.delete();
		}
	}

	get project(): Project | null { return this.parent && this.parent.project; }

	abstract activate(): void;

	async startRename(): Promise<boolean> {
		if (!this.project)
			throw new Error("uninitialized");

		var input = this.element.querySelector(".inputWrapper input") as HTMLInputElement;
		if (!input)
			throw new Error("input not found");

		this._allowClick = false;
		this.project.shaded = true;
		input.focus();
		input.readOnly = false;
		input.select();
		this.element.classList.add('unshaded');

		var $this = this;

		var result = await new Promise<boolean>((resolve, reject) => {

			function done(value: boolean) {
				input.removeEventListener('blur', onBlur);
				input.removeEventListener('input', onInput);
				input.removeEventListener('change', onChange);
				input.readOnly = true;
				$this._allowClick = true;
				$this.project!.shaded = false;
				$this.element.classList.remove('unshaded');
				input.style.outlineColor = '';
				resolve(value);
			}

			function onBlur(event: Event) {
				//done(false);
			}

			function onChange(event: Event) {
				if (isValid()) {
					$this.name = input.value;
					done(true);
				}
			}

			function onInput(event: Event) {
				input.style.outlineColor = isValid() ? '' : 'red';
			}

			function isValid() {
				return /^[a-z0-9_.-]*$/.test(input.value);
			}

			input.addEventListener('blur', onBlur);
			input.addEventListener('input', onInput);
			input.addEventListener('change', onChange);
		});

		return result;
	}
}

class ProjectFolder extends ProjectNode {

	constructor(name: string) {
		super(name, "folder-o");

		var childContainer;
		if (this.element.classList.contains("childContainer"))
			childContainer = this.element;
		else {
			childContainer= this.element.querySelector(".childContainer") as HTMLElement;
			if (!childContainer)
				throw new Error("childContainer not found");
		}
		this.childContainer = childContainer;
	}

	readonly children: ProjectNode[] = [];
	protected childContainer: HTMLElement;

	get path(): string {
		let parentPath = this.parent ? this.parent.path : "/";
		return parentPath + this.name + "/";
	}

	dispose(): void {
		this.children.forEach(i => i.dispose());
	}

	delete() {
		this.children.forEach(i => i.delete());
		super.delete();
		this.children.length = 0;
	}

	walk(callback:(node:ProjectNode) => any):any {
		for (var child of this.children) {
			var result = callback(child);
			if (result != null)
				return result;
			if (child instanceof ProjectFolder) {
				result = child.walk(callback);
				if (result != null)
					return result;
			}
		}
	}

	find(path: string): ProjectNode | undefined {

		if (!path)
			return void 0;

		path = path.trimStart('/');

		let ich = path.indexOf('/');
		if (ich < 0)
			ich = path.length;

		let childName = path.substr(0, ich);
		let child = (childName === "..") ? this.parent : this.children.find(i => i.name === childName) as ProjectFolder;
		if (!child)
			return void 0;

		let rest = path.substr(ich + 1);
		return rest ? child.find(rest) : child;
	}

	activate() {
		this.element.classList.toggle("open");
	}

	async onNewFile(event: Event) {
		this.open = true;
		var newNode = new ProjectFile('');
		this.addChild(newNode);
		if (await newNode.startRename()) {
			newNode.activate();
		} else {
			this.removeChild(newNode);
		}
	}

	async onNewFolder(event: Event) {
		this.open = true;
		var newNode = new ProjectFolder('');
		this.addChild(newNode);
		if (await newNode.startRename()) {
			newNode.activate();
		} else {
			this.removeChild(newNode);
		}
	}

	renderElement() {
		return (
			<li class="sourceNode">
				<div class="hover">
					<div class="hover-show">
						<a href="#" title="new file" onClick={this.onNewFile.bind(this)} >
							<i class="fa fa-file-o" aria-hidden="true">
								<i class="fa fa-plus fa-overlay" aria-hidden="true"></i>
							</i>
						</a>
						<a href="#" title="new folder" onClick={this.onNewFolder.bind(this)} >
							<i class="fa fa-folder-o" aria-hidden="true">
								<i class="fa fa-plus fa-overlay" aria-hidden="true"></i>
							</i>
						</a>
						<a href="#" title={"delete " + this.name} onClick={this.onDelete.bind(this)} >
							<i class="fa fa-trash-o"></i>
						</a>
					</div>
					<a href="#" onClick={this.onClick.bind(this)}>
						<i class="icon fa fa-folder-o"></i>
						<i class="icon fa fa-folder-open-o"></i>
						<div class="inputWrapper">
							<input readonly="readonly" value={this.name}></input>
						</div>
					</a>
				</div>
				<ul class="childContainer">
					{this.children}
				</ul>
			</li>
		);
	}

	set used(value: boolean) {
		super.setUsed(value);
		if (value && this.name !== 'libraries') {
			this.open = value;
		}
	}

	clearUsed() {
		super.clearUsed();
		this.open = false;
		for (var child of this.children)
			child.clearUsed();
	}

	get open(): boolean {
		return this.element.classList.contains("open");
	}
	set open(value: boolean) {
		this.element.classList.toggle("open", value);
		if (value && this.parent)
			this.parent.open = true;
	}

	addChild(child: ProjectNode) {
		child.parent = this;
		this.children.push(child);
		this.childContainer.appendChild(child.element);
	}
	removeChild(child: ProjectNode) {
		var index = this.children.indexOf(child);
		if (index < 0)
			throw new Error("not a child of this node");
		child.parent = null;
		this.children.splice(index, 1);
		this.childContainer.removeChild(child.element);
	}
}


abstract class Project extends ProjectFolder implements monaco.IDisposable {

	constructor(cwd: string = "") {
		super("");

		this.workingDirectory = this.find(cwd) as ProjectFolder || this;
	}

	renderElement() {
		return (
			<ul class="childContainer">{this.children}</ul>
		);
	}

	get project() { return this; }
	get path() { return "/"; }

	async loadFile(url: string): Promise<ProjectFile | undefined> { return; }

	find(path: string): ProjectNode | undefined {
		if (this.workingDirectory &&
			this.workingDirectory !== this &&
			!path.startsWith("/")) {
			return this.workingDirectory.find(path);
		}
		return super.find(path);
	}

	static async load(url: string): Promise<Project> {
		try {
			return await GitHubProject.load(url);
		}
		catch (error) {
			return await WebProject.load(url);
		}
	}

	workingDirectory: ProjectFolder;

	protected addParents(path: string) {

		if (path.startsWith("/")) {
			path = path.trimStart("/");
		}
		else if (path.startsWith("./")) {
			path = this.workingDirectory.path + path.substr(1);
		}
		else if (!path.startsWith(this.path))
			return;

		let parent = this as ProjectFolder;
		let parts = path.split('/');
		let name = parts.pop();
		if (!name)
			return;

		for (let part of parts) {
			let childFolder = parent.find(part) as ProjectFolder;
			if (!childFolder) {
				childFolder = new ProjectFolder(part);
				parent.addChild(childFolder);
			}

			parent = childFolder;
		}

		return {
			name: name,
			parent: parent,
		}
	}

	get shaded(): boolean { return this.element.classList.contains("shaded"); }
	set shaded(value: boolean) {
		this.element.classList.toggle("shaded", value);
	}
}


class ProjectFile
	extends ProjectNode {

	constructor(name: string) {

		super(name, "file-text-o");

		const ich = this.name.lastIndexOf('.');
		if (ich >= 0)
			this.extension = this.name.substr(ich);
		else
			this.extension = "";

		this.language = SourceLanguage.fromExtension(this.extension);

		if (this.language)
			this.icon = this.language.icon;
	}

	get path() {
		let parentPath = this.parent ? this.parent.path : "/";
		return parentPath + this.name;
	}

	language?: SourceLanguage;
	extension: string;

	private _languageName: string | undefined;
	get languageName() {
		if (typeof this._languageName === 'undefined') {
			if (this.language)
				this._languageName = this.language.name;
			else {
				let l = monaco.languages.getLanguages().find(l => l.extensions ? l.extensions.indexOf(this.extension) >= 0 : false);
				if (l)
					this._languageName = l.id;
			}
		}
		return this._languageName;
	}

	protected async fetch(): Promise<Response> {
		return await fetch("/assets/default/" + this.path);
	}

	model?: monaco.editor.IModel;
	blob?: Blob;

	async fetchBlob(): Promise<Blob> {
		if (this.model)
			return new Blob([this.model.getValue()], { type: this.language && this.language.mimeType });

		if (!this.blob) {
			let response = await this.fetch();
			this.blob = await response.blob();
		}
		return this.blob;
	}

	async fetchModel(): Promise<monaco.editor.IModel> {

		if (!this.model) {
			let content: string;
			if (this.blob) {
				content = await blobToString(this.blob);
				delete this.blob;
			}
			else {
				let response = await this.fetch();
				content = await response.text();
			}
			this.model = this.createModel(content);
		}
		return this.model;
	}

	async fetchValue(): Promise<string> {
		let model = await this.fetchModel();
		return model.getValue();
	}

	/*
	protected async fetch(): Promise<string> {
		let response = await fetch("/assets/default/" + this.path);
		let content = await response.text();
		let model = this.createModel(content);
		return model.getValue();
	}
	*/

	protected createModel(content: string) {
		if (!this.model)
			this.model = monaco.editor.createModel(content, this.languageName, monaco.Uri.parse(this.path));
		return this.model;
	}

	dispose(): void {
		if (this.model) {
			this.model.dispose();
			delete this.model;
		}
	}

	activate() {
		let openFileEvent = new Event("p5ide_openFile", {
			bubbles: true,
		}) as SourceNodeEvent;
		openFileEvent.sourceNode = this;
		this.element.dispatchEvent(openFileEvent);
	}

	renderElement() {
		return (
			<li class="sourceNode">
				<div class="hover">
					<div class="hover-show">
						<a href="#" onClick={this.onDelete.bind(this)} title={"delete " + this.name}>
							<i class="fa fa-trash-o"></i>
						</a>
					</div>
					<a href="#" onClick={this.onClick.bind(this)}>
						<i class={`icon fa fa-${this.icon}`}></i>
						<div class="inputWrapper">
							<input readonly="readonly" value={this.name}></input>
						</div>
					</a>
				</div>
			</li>
		);
	}
}
