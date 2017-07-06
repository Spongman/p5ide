/// <reference path="file.tsx"/>

type SourceMap = { [name: string]: SourceNode };



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

		const branchResponse = await cachedFetch(`https://api.github.com/repos/${user}/${repo}/branches/${branch || 'master'}`);
		const branchJson = await branchResponse.json();

		let sha = branchJson.commit.sha;
		const treeResponse = await cachedFetch(branchJson.commit.commit.tree.url + "?recursive=1");
		const treeJson = await treeResponse.json() as { tree: [{ path: string, type: string, sha: string }] };

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
