

class ImmortalReference<T> {
	constructor(public readonly object: T) { }
	dispose(): void { }
}


class SimpleModel {

	private readonly _onDispose: monaco.Emitter<void>;

	constructor(private readonly model: monaco.editor.IModel) {
		this._onDispose = new monaco.Emitter<void>();
	}

	public get onDispose(): monaco.IEvent<void> {
		return this._onDispose.event;
	}

	public load(): monaco.Promise<SimpleModel> {
		return monaco.Promise.as(this);
	}

	public get textEditorModel(): monaco.editor.IModel {
		return this.model;
	}

	public dispose(): void {
		this._onDispose.fire();
	}
}

class SimpleEditorModelResolverService {

	private editor: monaco.editor.IEditor | undefined;

	public setEditor(editor: monaco.editor.IEditor): void {
		this.editor = editor;
	}

	public createModelReference(resource: monaco.Uri): monaco.Promise<ImmortalReference<SimpleModel | null>> {

		if (!this.editor)
			throw new Error("not editor set yet");

		let model: monaco.editor.IModel | null;
		if (this.editor.getEditorType() === monaco.editor.EditorType.ICodeEditor)
			model = this.findModel(this.editor, resource);
		else {
			const diffEditor = <monaco.editor.ICommonDiffEditor>this.editor;
			model = this.findModel(diffEditor.getOriginalEditor(), resource) || this.findModel(diffEditor.getModifiedEditor(), resource);
		}
		const simpleModel = model ? new SimpleModel(model) : null;
		return monaco.Promise.as(new ImmortalReference(simpleModel));
	}

	public registerTextModelContentProvider(scheme: string, provider: any): monaco.IDisposable {
		return new ImmortalReference(null);
	}

	private findModel(editor: monaco.editor.IEditor, resource: monaco.Uri): monaco.editor.IModel | null {
		return monaco.editor.getModel(resource);
	}
}

class EditorService {

	private _editor: monaco.editor.IStandaloneCodeEditor | undefined;

	setEditor(editor: monaco.editor.IStandaloneCodeEditor) {
		this._editor = editor;
	}

	openEditor(options: any, sideBySide: boolean) {
		const model = monaco.editor.getModel(options.resource.path);
		if (!model)
			return monaco.Promise.as(null);
		if (!this._editor)
			throw new Error("no editor set yet");
		this._editor.setModel(model);
		if (options.options.selection) {
			this._editor.setSelection(options.options.selection);
			const top = this._editor.getTopForLineNumber(options.options.selection.startLineNumber);
			this._editor.setScrollTop(top - this._editor.getDomNode().clientHeight * 2 / 5);//.setScrollPosition(200);
		}
		this._editor.focus();
		return monaco.Promise.as(null);
	};

	resolveEditor() {
		alert(`resolve editor called!` + JSON.stringify(arguments));
	}
}

declare interface IPreloadLibrary {
	text: string;
	url: string;
}

class P5Editor {

	public _editor: monaco.editor.IStandaloneCodeEditor;
	public options: monaco.editor.IEditorConstructionOptions = {
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
		monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
			noSemanticValidation: false,
			noSyntaxValidation: false
		});

		// compiler options
		monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
			noLib: true,
			target: monaco.languages.typescript.ScriptTarget.ES2016,
			allowNonTsExtensions: true
		});

		const textModelResolverService = new SimpleEditorModelResolverService();
		const editorService = new EditorService();


		const editorContainer = document.getElementById('editorContainer')!;
		this._editor = monaco.editor.create(
			editorContainer, this.options, {
				editorService: editorService,
				textModelService: textModelResolverService,
			});

		textModelResolverService.setEditor(this._editor);
		editorService.setEditor(this._editor);


		libs.forEach((lib, i: number) => {
			console.log("addExtraLib: " + lib.url);
			monaco.languages.typescript.javascriptDefaults.addExtraLib(lib.text, lib.url);
		});
		libs.forEach((lib, i: number) => {
			monaco.editor.createModel(lib.text, "typescript", monaco.Uri.parse(lib.url));
		});

	}

	layout() { this._editor.layout(); }
	getValue() { return this._editor.getValue(); }
	getModel() { return this._editor.getModel(); }
	setModel(model: monaco.editor.IModel) { this._editor.setModel(model); }

	setPosition(pos: monaco.IPosition) {
		this._editor.setPosition(pos);
		this._editor.focus();
	}
	updateOptions(newOptions: monaco.editor.IEditorOptions) { this._editor.updateOptions(newOptions); }

	onDidChangeCursorPosition(listener: (e: monaco.editor.ICursorPositionChangedEvent) => void) {
		return this._editor.onDidChangeCursorPosition(listener);
	}
	onDidChangeModelContent(listener: (e: monaco.editor.IModelContentChangedEvent) => void) {
		return this._editor.onDidChangeModelContent(listener);
	}
	onDidChangeModel(listener: (e: monaco.editor.IModelChangedEvent) => void) {
		return this._editor.onDidChangeModel(listener);
	}
}