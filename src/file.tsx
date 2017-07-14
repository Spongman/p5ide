
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

abstract class SourceNode implements monaco.IDisposable {

	constructor(public path: string, public icon: string) {
		const ich = path.lastIndexOf('/');
		this.dir = path.substr(0, ich);
		this.name = path.substr(ich + 1);
	}
	dir: string;
	name: string;
	parent?: SourceFolder;
	element: HTMLElement;

	get used(): boolean { return this.element.classList.contains("used"); }
	set used(value: boolean) {
		if (value && this.parent)
			this.parent.used = true;
		this.element.classList.toggle("used", value);
	}

	get selected(): boolean { return this.element.classList.contains("selected"); }
	set selected(value: boolean) { this.element.classList.toggle("selected", value); }

	abstract render(): HTMLElement;
	abstract dispose(): void;
	delete() {
		this.dispose();
		this.element.remove();
	}

	abstract onClick(event: Event):void;
	
	onDelete(event: Event) {
		event.preventDefault();

		var deleteNodeEvent = new Event("p5ide_deleteNode", {
			bubbles: true,
			cancelable: true,
		}) as SourceNodeEvent;
		deleteNodeEvent.sourceNode = this;
		if (event.target.dispatchEvent(deleteNodeEvent)) {
			this.delete();
		}	
	}
}

class SourceFolder extends SourceNode {

	constructor(public path: string) {
		super(path, "folder-o");

	}

	children: SourceNode[] = [];

	dispose(): void {
		this.children.forEach(i => i.dispose());
	}

	delete() {
		this.children.forEach(i => i.delete());
		super.delete();
		this.children = [];
	}

	find(path: string): SourceNode | undefined {

		if (!path)
			return void 0;	

		path = path.trimStart('/');

		var ich = path.indexOf('/');
		if (ich < 0)
			ich = path.length;
		
		var childName = path.substr(0, ich);
		var child = (childName === "..") ? this.parent : this.children.find(i => i.name === childName) as SourceFolder;
		if (!child)
			return void 0;
		
		var rest = path.substr(ich + 1);
		return rest ? child.find(rest) : child;
	}

	onClick(event: Event) {
		event.preventDefault();
		this.element.classList.toggle("open");
	}

	render() {
		return this.element = (
			<li class="sourceNode">
				<div>
					<a href="#" class="btnDelete" onClick={this.onDelete.bind(this)}>
						<i class="icon fa fa-trash-o"></i>
					</a>
					<a href="#" onClick={this.onClick.bind(this)}>
						<i class="icon fa fa-folder-o"></i>
						<i class="icon fa fa-folder-open-o"></i>
						<span>{this.name}</span>
					</a>
				</div>
				<ul>
					{this.children}
				</ul>
			</li>
		);
	}

	set used(value: boolean) {
		super.used = value;
		if (value && this.name !== 'libraries') {
			this.open = value;
		}
	}

	get open(): boolean { return this.element.classList.contains("open"); }
	set open(value: boolean) {
		this.element.classList.toggle("open", value);
		if (value && this.parent)
			this.parent.open = true;	
	}
}

class SourceFile
	extends SourceNode {

	constructor(public path: string) {

		super(path, "file-text-o");

		const ich = this.name.lastIndexOf('.');
		if (ich >= 0)
			this.extension = this.name.substr(ich);
		else
			this.extension = "";

		this.language = SourceLanguage.fromExtension(this.extension);

		if (this.language)
			this.icon = this.language.icon;
	}

	language?: SourceLanguage;
	extension: string;
	content: string | null = null;

	model?: monaco.editor.IModel;

	fetch(project: Project): Promise<string> {
		return fetch("/default/" + this.path)
			.then(response => response.text());
	}

	dispose(): void {
		if (this.model) {
			this.model.dispose();
			delete this.model;
		}
	}

	onClick(event: Event) {
		event.preventDefault();

		var openFileEvent = new Event("p5ide_openFile", {
			bubbles: true,
		}) as SourceNodeEvent;
		openFileEvent.sourceNode = this;
		event.target.dispatchEvent(openFileEvent);
	}

	render() {
		return this.element = (
			<li class="sourceNode">
				<div>
					<a href="#" class="btnDelete" onClick={this.onDelete.bind(this)}>
						<i class="icon fa fa-trash-o"></i>
					</a>
					<a href="#" onClick={this.onClick.bind(this)}>
						<i class={`icon fa fa-${this.icon}`}></i>
						<span>{this.name}</span>
					</a>
				</div>
			</li>
		);
	}
}

class GitHubSourceFile extends SourceFile {

	constructor(path: string, protected sha: string) {
		super(path);
	}

	async fetch(project: GitHubProject): Promise<string> {

		const response = await fetch(`https://cdn.rawgit.com/${project.user}/${project.repo}/${project.sha}${project.path}/${this.path}`);
		return response.text();
	}
}


abstract class Project extends SourceFolder implements monaco.IDisposable {

	constructor(public items: SourceNode[], cwd: string = "") {
		super("");

		const map: { [name: string]: SourceNode } = {
			"": this,
		};
		items.forEach(item => {
			map[item.path] = item;
		});

		items.forEach(item => {
			let parent = map[item.dir] as SourceFolder;
			if (!parent) {
				parent = map[item.dir] = new SourceFolder(item.dir);
				items.push(parent);
			}
		});

		items.forEach(item => {
			let parent = map[item.dir] as SourceFolder;
			parent.children.push(item);
			item.parent = parent;
		});

		this.workingDirectory = this.find(cwd) as SourceFolder || this;
	}

	render() {
		return this.element = (
			<div>{this.children} </div>
		);
	}

	workingDirectory: SourceFolder;
}
