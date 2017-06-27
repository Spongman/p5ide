
class SourceLanguage {
	constructor(public name: string, public icon: string = "file-o", public mimeType: string = "text/" + name) { }

	static Javascript = new SourceLanguage("javascript", "file-text-o");
	static Html = new SourceLanguage("html", "file-code-o");
	static Css = new SourceLanguage("css", "file-text-o");
}

class SourceNode {
	constructor(public icon: string)
	{
	}
	parent: SourceFolder;
	element: HTMLElement;
}

class SourceFolder extends SourceNode {
	constructor()
	{
		super("folder-o");
	}
	path: string;
}

class SourceFile extends SourceNode {

	constructor(public fileName: string, public language: SourceLanguage) {
		super(language.icon);

		var ich = fileName.lastIndexOf('.');
		if (ich >= 0)
			this.extension = fileName.substr(ich + 1);
		else
			this.extension = "null";
	}

	extension: string;
	content: string = "";

	fetch(): Promise<string> {
		return fetch("/default/" + this.fileName)
			.then(response => response.text());
	}

	get used(): boolean { return this.element.classList.contains("used"); }
	set used(value: boolean) { this.element.classList[value ? "add" : "remove"]("used"); }

	get selected(): boolean { return this.element.classList.contains("selected"); }
	set selected(value: boolean) { this.element.classList[value ? "add" : "remove"]("selected"); }
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