/// <reference path="file.tsx"/>

type SourceMap = { [name: string]: SourceNode };

//https://github.com/processing/p5.js-website/tree/master/src/data/examples

class GitHubProject extends Project {

	constructor(public user: string, public repo: string, public branch: string, public path: string, public sha: string, public items: SourceNode[]) {
		super(items, path);
	}

	public static async load(url: string): Promise<Project> {

		let [match, user, repo, branch, path] = url.match(/(?:https:\/\/)?github\.com\/([^\/]*)\/([^\/]*)(?:\/tree\/([^\/]*)\/(.*))?/i) || <string[]>[];
		if (!match)
			return Promise.reject("invalid GitHub url");

		if (!branch)
			branch = 'master';

		if (!path)
			path = "";

		const branchResponse = await cachedFetch(`https://api.github.com/repos/${user}/${repo}/branches/${branch || 'master'}`);
		const branchJson = await branchResponse.json();

		let sha = branchJson.commit.sha;
		const treeResponse = await cachedFetch(branchJson.commit.commit.tree.url + "?recursive=1");
		const treeJson = await treeResponse.json() as { tree: [{ path: string, type: string, sha: string }] };

		const items = treeJson.tree
			.filter(e => e.path.startsWith(path) && e.path.length > path.length)
			.map(e => {
				var rest = e.path.substr(path.length).trimStart('/');
				return e.type === "blob" ?
					new GitHubSourceFile(rest, e.sha) :
					new SourceFolder(rest)
			}
		);

		return new GitHubProject(user, repo, branch, "/" + (path || ""), sha, items);

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

class WebProject extends Project {

	constructor(public path: string, public items: SourceNode[]) {
		super(items, path);
	}

	public static async load(url: string): Promise<Project> {
		if (!url)
			throw new Error("invalid Url");

		var urlParts = parseUrl(url);
		if (urlParts.search)
			throw new Error("querystrings not supported");

		let branchResponse: Response;

		while (true) {
			branchResponse = await fetch(url, {
				redirect: "manual"
			});

			if (branchResponse.type === "opaqueredirect") {
				var urlParts2 = parseUrl(branchResponse.url);
				if (urlParts2.host !== urlParts.host)
					throw new Error("insecure host change during redirect");

				url = branchResponse.url;
				continue;
			}

			break;
		}

		var text = await branchResponse.text();
		
		urlParts = parseUrl(branchResponse.url);

		var path = urlParts.pathname;
		path.trimStart("/");

		if (!path || path.endsWith("/"))
		{
			path = path.trimEnd("/");

			var item = new WebSourceFile("index.html", text);
			return new WebProject(`${urlParts.protocol}://${urlParts.host}${path}`, [item]);
		}
		else
		{
			var parts = path.split('/');
			var filename = parts.pop();
			path = parts.join("/");
			var item = new WebSourceFile(filename!, text);
			return new WebProject(`${urlParts.protocol}://${urlParts.host}${path}`, [item]);
		}
	}

	async loadFile(url: string): Promise<SourceFile | undefined> {

		console.log("loadFile", url);
		if (url.startsWith(this.path))
			return;

		var path: string = url;
		if (url.startsWith("/"))
		{
			path = url.trimStart("/");
			url = this.path + "/" + path;
		}
		else if (url.startsWith("./"))
		{
			path = this.workingDirectory.path + url.substr(1);
			url = this.path + "/" + path;
		}
		else if (!url.startsWith(this.path))
			return;

		console.log("path", path);

		var response = await fetch(url);
		var text = await response.text();

		var folder = this as SourceFolder;
		var parts = path.split('/');
		parts.pop();
		for (var part of parts)
		{
			var childFolder = folder.find(part) as SourceFolder;
			if (!childFolder)
			{
				childFolder = new SourceFolder(folder.path + "/" + part);
				folder.addChild(childFolder);
			}

			folder = childFolder;
		}

		var file = new WebSourceFile(path, text);
		folder.addChild(file);

		return file;
	}
}

class WebSourceFile extends SourceFile {

	constructor(path: string, text: string) {
		super(path);

		if (text)
			this.createModel(text);
	}

	async fetch(project: WebProject): Promise<string> {

		const response = await fetch(`${project.path}/${this.path}`);
		return response.text();
	}

}
