
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
	set used(value: boolean) { this.setUsed(value); }

	protected setUsed(value: boolean) {
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

	protected onDelete(event: Event) {
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
	childrenContainer: HTMLUListElement;

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

	private onClick(event: Event) {
		event.preventDefault();
		this.element.classList.toggle("open");
	}

	private async onNewFile(event: Event) {

		this.open = true;
		var name = await this.newNode("file");
		console.log(name);
	}

	private async onNewFolder(event: Event) {
		this.open = true;
		var name = await this.newNode("folder");
		console.log(name);
	}

	private newNode(icon:string): Promise<string> {

		return new Promise((resolve, reject) => {

			function onInputBlur(event: Event) {
				if (newNodeElement) {
					newNodeElement.remove();
					newNodeElement = null;
					
					if (reject)
						reject("cancelled");
				}
			}

			function onInputChange(event: Event) {
				if (newNodeElement && isValid()) {
					newNodeElement.remove();
					resolve(input.value.trim());
				}
			}

			function onInputInput(event: Event) {
				input.style.borderColor = isValid() ? '' : 'red';
			}

			function isValid() {
				var value = input.value.trim();
				if (!/^[a-z0-9_.-]*$/.test(value))
					return false;

				return true;
			}

			var input:HTMLInputElement;
			var newNodeElement = (
				<li class="sourceNode new-file">
					<div style="display: flex;">
						<i class={'icon fa fa-'+icon+'-o'}>
							<i class="fa fa-plus fa-overlay" aria-hidden="true"></i>
						</i>
						{input = (
							<input type="text"
								onBlur={onInputBlur.bind(this)}
								onInput={onInputInput.bind(this)}
								onChange={onInputChange.bind(this)}></input>
						) as HTMLInputElement}
					</div>
				</li>
			);

			this.childrenContainer.insertBefore(newNodeElement, this.childrenContainer.firstChild);
			input.focus();
		});


	}

	render() {
		return this.element = (
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
						<span>{this.name}</span>
					</a>
				</div>
				{this.childrenContainer = (
					<ul>
						{this.children}
					</ul>
				) as HTMLUListElement}
			</li>
		);
	}

	set used(value: boolean) {
		super.setUsed(value);
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

	private _languageName: string;
	get languageName() {
		if (typeof this._languageName === 'undefined') {
			if (this.language)
				this._languageName = this.language.name;
			else {
				var l = monaco.languages.getLanguages().find(l => l.extensions ? l.extensions.indexOf(this.extension) >= 0 : false);
				if (l)
					this._languageName = l.id;
			}
		}
		return this._languageName;
	}

	model?: monaco.editor.IModel;

	async fetchModel(project: Project): Promise<monaco.editor.IModel> {

		var model = this.model;
		if (!model) {
			var content = await this.fetch(_currentProject);
			model = this.createModel(content);
		}
		return model;
	}

	async fetch(project: Project): Promise<string> {
		if (this.model)
			return this.model.getValue();

		var response = await fetch("/assets/default/" + this.path);
		var content = await response.text();
		var model = this.createModel(content);
		return model.getValue();
	}

	private createModel(content: string) {
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

	private onClick(event: Event) {
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
				<div class="hover">
					<div class="hover-show">
						<a href="#" onClick={this.onDelete.bind(this)} title={"delete " + this.name}>
							<i class="fa fa-trash-o"></i>
						</a>
					</div>
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
