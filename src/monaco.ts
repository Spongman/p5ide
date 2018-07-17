import { Emitter, editor, IEvent, Promise, Uri, IDisposable, languages, IPosition } from "monaco-editor";


class ImmortalReference<T> {
	constructor(public readonly object: T) { }
	dispose(): void { }
}


class SimpleModel {

	private readonly _onDispose: Emitter<void>;

	constructor(private readonly model: editor.IModel) {
		this._onDispose = new Emitter<void>();
	}

	public get onDispose(): IEvent<void> {
		return this._onDispose.event;
	}

	public load(): Promise<SimpleModel> {
		return Promise.as(this);
	}

	public get textEditorModel(): editor.IModel {
		return this.model;
	}

	public dispose(): void {
		this._onDispose.fire();
	}
}

class SimpleEditorModelResolverService {

	private editor: editor.IEditor | undefined;

	public setEditor(editor: editor.IEditor): void {
		this.editor = editor;
	}

	public createModelReference(resource: Uri): Promise<ImmortalReference<SimpleModel | null>> {

		if (!this.editor)
			throw new Error("not editor set yet");

		let model: editor.IModel | null;
		if (this.editor.getEditorType() === editor.EditorType.ICodeEditor)
			model = this.findModel(this.editor, resource);
		else {
			const diffEditor = this.editor as editor.IDiffEditor;
			model = this.findModel(diffEditor.getOriginalEditor(), resource) || this.findModel(diffEditor.getModifiedEditor(), resource);
		}
		const simpleModel = model ? new SimpleModel(model) : null;
		return Promise.as(new ImmortalReference(simpleModel));
	}

	public registerTextModelContentProvider(scheme: string, provider: any): IDisposable {
		return new ImmortalReference(null);
	}

	private findModel(editor: editor.IEditor, resource: Uri): editor.IModel {
		//return editor.getModel(resource);
		return editor.getModel() as editor.IModel;
	}
}

class EditorService {

	private _editor: editor.IStandaloneCodeEditor | undefined;

	setEditor(editor: editor.IStandaloneCodeEditor) {
		this._editor = editor;
	}

	openEditor(options: any, sideBySide: boolean) {
		const model = editor.getModel(options.resource.path);
		if (!model)
			return Promise.as(null);
		if (!this._editor)
			throw new Error("no editor set yet");
		this._editor.setModel(model);
		if (options.options.selection) {
			this._editor.setSelection(options.options.selection);
			const top = this._editor.getTopForLineNumber(options.options.selection.startLineNumber);
			this._editor.setScrollTop(top - this._editor.getDomNode().clientHeight * 2 / 5);//.setScrollPosition(200);
		}
		this._editor.focus();
		return Promise.as(null);
	};

	resolveEditor() {
		alert(`resolve editor called!` + JSON.stringify(arguments));
	}
}

declare interface IPreloadLibrary {
	text: string;
	url: string;
}

export class P5Editor {

	public _editor: editor.IStandaloneCodeEditor;
	public options: editor.IEditorConstructionOptions = {
		fixedOverflowWidgets: true,
		fontFamily: 'Fira Code',
		//fontLigatures: true,
		//glyphMargin: false,
		lineNumbersMinChars: 3,
		mouseWheelZoom: true,
		scrollBeyondLastLine: false,
		//useTabStops: true,
		//renderIndentGuides: true,
		theme: 'vs-dark',
	};

	constructor(libs: IPreloadLibrary[]) {

		// validation settings
		languages.typescript.javascriptDefaults.setDiagnosticsOptions({
			noSemanticValidation: false,
			noSyntaxValidation: false
		});

		// compiler options
		languages.typescript.javascriptDefaults.setCompilerOptions({
			noLib: true,
			target: languages.typescript.ScriptTarget.ES2016,
			allowNonTsExtensions: true
		});

		const textModelResolverService = new SimpleEditorModelResolverService();
		const editorService = new EditorService();


		const editorContainer = document.getElementById('editorContainer')!;
		this._editor = editor.create(
			editorContainer, this.options, {
				editorService: editorService,
				textModelService: textModelResolverService,
			});

		textModelResolverService.setEditor(this._editor);
		editorService.setEditor(this._editor);


		libs.forEach((lib, i: number) => {
			console.log("addExtraLib: " + lib.url);
			languages.typescript.javascriptDefaults.addExtraLib(lib.text, lib.url);
		});
		libs.forEach((lib, i: number) => {
			editor.createModel(lib.text, "typescript", Uri.parse(lib.url));
		});

	}

	layout() { this._editor.layout(); }
	getValue() { return this._editor.getValue(); }
	getModel() { return this._editor.getModel(); }
	setModel(model: editor.IModel) { this._editor.setModel(model); }

	setPosition(pos: IPosition) {
		this._editor.setPosition(pos);
		this._editor.focus();
	}
	updateOptions(newOptions: editor.IEditorOptions) { this._editor.updateOptions(newOptions); }

	onDidChangeCursorPosition(listener: (e: editor.ICursorPositionChangedEvent) => void) {
		return this._editor.onDidChangeCursorPosition(listener);
	}
	onDidChangeModelContent(listener: (e: editor.IModelContentChangedEvent) => void) {
		return this._editor.onDidChangeModelContent(listener);
	}
	onDidChangeModel(listener: (e: editor.IModelChangedEvent) => void) {
		return this._editor.onDidChangeModel(listener);
	}
}