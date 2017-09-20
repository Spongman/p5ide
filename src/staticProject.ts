

/*
class StaticProject extends WebProject {

	constructor(public url: string, items: string[]) {
		super();

		for (const item of items)
			this.loadFile(item);
	}

	async loadFile(url: string): Promise<ProjectFile | undefined> {

		const info = this.addParents(url);
		if (!info)
			return;

		const child = new WebFile(info.name);
		info.parent.addChild(child);

		return child;
	}
}

const defaultProject = new WebProject(
	"/default/", [
		"index.html",
		"sketch.js",
		"style.css",
		"b/index2.html",
	]
);

*/