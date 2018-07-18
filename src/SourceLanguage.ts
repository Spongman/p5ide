export class SourceLanguage {
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