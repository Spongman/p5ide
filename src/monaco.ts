

class ImmortalReference<T> {
	constructor(public object: T) { }
	dispose(): void { }
}


class SimpleModel {

	private model: monaco.editor.IModel;
	private _onDispose: monaco.Emitter<void>;

	constructor(model: monaco.editor.IModel) {
		this.model = model;
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

	private editor: monaco.editor.IEditor;

	public setEditor(editor: monaco.editor.IEditor): void {
		this.editor = editor;
	}

	public createModelReference(resource: monaco.Uri): monaco.Promise<ImmortalReference<SimpleModel | null>> {

		var model: monaco.editor.IModel | null;
		if (this.editor.getEditorType() === monaco.editor.EditorType.ICodeEditor)
			model = this.findModel(this.editor, resource);
		else {
			var diffEditor = <monaco.editor.ICommonDiffEditor>this.editor;
			model = this.findModel(diffEditor.getOriginalEditor(), resource) || this.findModel(diffEditor.getModifiedEditor(), resource);
		}
		var simpleModel = model ? new SimpleModel(model) : null;
		return monaco.Promise.as(new ImmortalReference(simpleModel));
	}

	public registerTextModelContentProvider(scheme: string, provider: any): monaco.IDisposable {
		return new ImmortalReference(null);
	}

	private findModel(editor: monaco.editor.IEditor, resource: monaco.Uri): monaco.editor.IModel | null {
		return monaco.editor.getModel(resource);
	}
}
