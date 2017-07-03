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
	set used(value: boolean) { this.element.classList[value ? "add" : "remove"]("used"); }

	get selected(): boolean { return this.element.classList.contains("selected"); }
	set selected(value: boolean) { this.element.classList[value ? "add" : "remove"]("selected"); }

	abstract dispose():void;
}

class SourceFolder extends SourceNode {
	constructor(public path: string) {
		super(path, "folder-o");
	}

	dispose():void {}
}

class SourceFile extends SourceNode {

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
		return cachedFetch("/default/" + this.path)
			.then(response => response.text());
	}

	dispose():void {
		if (this.model)
		{
			this.model.dispose();
			delete this.model;
		}
	}

}


class ExampleCategory {

	name: string;
	path: string;
	sha: string;
	size: number;
	url: string;
	html_url: string;
	git_url: string;

	/*	
	 {
		"name": "00_Structure",
		"path": "dist/assets/examples/en/00_Structure",
		"sha": "675553ed324f1aaa199969f5ca1a1af5f79f4614",
		"size": 0,
		"url": "https://api.github.com/repos/processing/p5.js-website/contents/dist/assets/examples/en/00_Structure?ref=master",
		"html_url": "https://github.com/processing/p5.js-website/tree/master/dist/assets/examples/en/00_Structure",
		"git_url": "https://api.github.com/repos/processing/p5.js-website/git/trees/675553ed324f1aaa199969f5ca1a1af5f79f4614",
		"download_url": null,
		"type": "dir",
		"_links": {
		  "self": "https://api.github.com/repos/processing/p5.js-website/contents/dist/assets/examples/en/00_Structure?ref=master",
		  "git": "https://api.github.com/repos/processing/p5.js-website/git/trees/675553ed324f1aaa199969f5ca1a1af5f79f4614",
		  "html": "https://github.com/processing/p5.js-website/tree/master/dist/assets/examples/en/00_Structure"
		}
	  },
		*/
}

type SourceMap = { [name: string]: SourceNode };

abstract class Project implements monaco.IDisposable {

	constructor(public items: SourceNode[]) {

		const map: { [name: string]: SourceNode } = {};
		items.forEach(item => {
			map[item.path] = item;
		});

		items.filter(item => item.dir).forEach(item => {
			let parent = map[item.dir];
			if (!parent) {
				parent = map[item.dir] = new SourceFolder(item.dir);
				items.push(parent);
			}
			item.parent = parent;
		});
	}

	find(path: string): SourceNode | undefined {

		if (path && path.charAt(0) === '/')
			path = path.substring(1);

		return _currentProject.items.find(f => f.path === path);
	}

	dispose():void {
		this.items.forEach(i => i.dispose());
	}
}

class GitHubSourceFile extends SourceFile {

	constructor(path: string, protected sha: string) {
		super(path);
	}

	async fetch(project: GitHubProject): Promise<string> {

		const response = await cachedFetch(`https://cdn.rawgit.com/${project.user}/${project.repo}/${project.sha}${project.path}/${this.path}`);
		return response.text();
	}
}

async function cachedFetch(url: string): Promise<Response> {

	if (window.caches) {
		const cache = await window.caches.open("fetch");
		//console.log("CACHE", cache);
		let response = await cache.match(url);
		//console.log("MATCH", response);
		if (!response) {
			response = await fetch(url);
			//console.log("FETCH", response);
			await cache.put(url, response);
			response = await cache.match(url);
			//console.log("MATCH", response);
		}
		return response;
	}
	else if (window.localStorage) {

		let response: Response;
		if (!window.localStorage.fetch)
			window.localStorage.fetch = {};

		response = JSON.parse(window.localStorage.fetch[url]);
		if (!response) {
			response = await fetch(url);
			window.localStorage.fetch[url] = JSON.stringify(response);
		}
		return response;
	}
	else {
		return fetch(url);
	}
}

class GitHubProject extends Project {

	constructor(public user: string, public repo: string, public branch: string, public path: string, public sha: string, public items: SourceNode[]) {
		super(items);
	}

	public static async load(url: string): Promise<Project> {

		let [match, user, repo, branch, path] = url.match(/https:\/\/github\.com\/([^/]*)\/([^/]*)(?:\/tree\/([^/]*)\/(.*))?/i) || <string[]>[];
		if (!match)
			throw new Error("invalid url");

		if (!branch)
			branch = 'master';

		const branchResponse = await cachedFetch(`https://api.github.com/repos/${user}/${repo}/branches/${branch||'master'}`);
		const branchJson = await branchResponse.json();

		let sha = branchJson.commit.sha;
		const treeResponse = await cachedFetch(branchJson.commit.commit.tree.url + "?recursive=1");
		var q = 9;
		const treeJson = await treeResponse.json() as { tree: [{ path: string, type: string, sha: string }] };
		var q2 = 9;

		const items = treeJson.tree.map(e => e.type === "blob" ?
			new GitHubSourceFile(e.path, e.sha) :
			new SourceFolder(e.path)
		);

		return new GitHubProject(user, repo, branch, path || "", sha, items);

		/*
		https://api.github.com/repos/processing/p5.js-website/git/trees/6e0333b1146068043d55f00295ef80858df7c3ae
		https://api.github.com/repos/processing/p5.js-website/git/blobs/e64ba0d13cdfaa5858083f724e2232975d22a25e
		https://raw.githubusercontent.com/CodingTrain/Rainbow-Code/cdd39f127bc0d3389c61d78b86e89c251d963c78/README.md
		https://cdn.rawgit.com/CodingTrain/Rainbow-Code/cdd39f127bc0d3389c61d78b86e89c251d963c78/README.md
		*/
	}
}

class StaticProject extends Project {

	constructor(public url: string, public items: SourceNode[]) {
		super(items);
	}
}

const defaultProject = new StaticProject(
	"./", [
		new SourceFile("index.html"),
		new SourceFile("sketch.js"),
		new SourceFile("style.css"),
		new SourceFile("b/index2.html"),
	]
);


/*
class ExampleProject extends Project {
	fetch(url: string): Promise<any> {
		return new Promise<void>((resolve, reject) => {

		});
	}
}
*/