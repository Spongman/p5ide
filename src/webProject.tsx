

class WebProject extends Project {

	constructor(public root: string) {
		super();
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

		var blob = await branchResponse.blob();

		urlParts = parseUrl(branchResponse.url);

		var path = urlParts.pathname;
		path.trimStart("/");

		var project = new WebProject(`${urlParts.protocol}://${urlParts.host}/${path}`);

		if (!path || path.endsWith("/")) {
			path = path.trimEnd("/");

			var item = new WebFile("index.html", blob);
			project.addChild(item);
		}
		else {
			var parts = path.split('/');
			var filename = parts.pop();
			path = parts.join("/");
			var item = new WebFile(filename!, blob);
			project.addChild(item);
		}
		return project;
	}

	async loadFile(url: string): Promise<ProjectFile | undefined> {

		console.log("loadFile", url);
		//if (url.startsWith(this.path))
		//	return;

		const info = this.addParents(url);
		if (!info)
			return;

		const response = await fetch(this.root + info.parent.path + info.name);
		const blob = await response.blob();

		const child = new WebFile(info.name, blob);
		info.parent.addChild(child);

		return child;
	}
}

class WebFile extends ProjectFile {

	constructor(path: string, blob: Blob) {
		super(path);

		if (blob)
			this.blob = blob;
	}

	protected async fetch(): Promise<Response> {
		return await fetch(`${this.project!.path}/${this.path}`);
	}
}
