/// <reference path="project.tsx"/>

import { Project, ProjectFile } from "./project";
import { cachedFetch } from "./utils";


//https://github.com/processing/p5.js-website/tree/master/src/data/examples

export class GitHubProject extends Project {

	constructor(
		public readonly user: string,
		public readonly repo: string,
		public readonly branch: string,
		public readonly root: string,
		public readonly sha: string) {
		super();
	}

	public static async load(url: string): Promise<Project> {

		let [match, user, repo, branch, path]: string[] = url.match(/(?:https:\/\/)?github\.com\/([^\/]*)\/([^\/]*)(?:\/tree\/([^\/]*)\/(.*))?/i) || [];
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

		let project = new GitHubProject(user, repo, branch, "/" + (path || ""), sha);

		for (const item of treeJson.tree.filter(e => e.path.startsWith(path) && e.path.length > path.length && e.type === "blob")) {
			project.addFile(item.path.substr(path.length), item.sha, item.type);
		}

		return project;
	}

	addFile(path: string, sha: string, type: string) {
		let info = this.addParents(path);
		if (info) {
			const child = new GitHubFile(info.name, sha);
			info.parent.addChild(child);
		}
	}
}



class GitHubFile extends ProjectFile {

	constructor(name: string, protected readonly sha: string) {
		super(name);
	}

	protected async fetch(): Promise<Response> {

		let project = this.project as GitHubProject;
		return await fetch(`https://raw.githubusercontent.com/${project.user}/${project.repo}/${project.sha}${project.root}/${this.path}`);
	}
}
