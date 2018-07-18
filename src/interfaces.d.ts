
declare namespace JSX {
	type Element = HTMLElement;
	//interface Element { }
	interface IntrinsicElements {
		div: any;
		span: any;
		a: any;
		i: any;
		li: any;
		ul: any;
		form: any;
		fieldset: any;
		legend: any;
		select: any;
		option: any;
		label: any;
		input: any;
	}
}

declare class SourceLanguage {
	mimeType: string;
}

declare interface IP5Editor {
	layout():void;
}

declare interface IApplication {
	editor: IP5Editor;
	currentProject: IProject;
	currentFile: IProjectFile | null;
	loadFile(file: IProjectFile | null, position?: monaco.IPosition):void;
}

declare interface IProjectNode {
	path: string;
	used: boolean;
	name: string;
	parent: IProjectFolder | null;
	language?: SourceLanguage;

	clearUsed():void;
}

declare interface IProjectFile extends IProjectNode {
	fetchValue(): Promise<string>;
	fetchBlob(): Promise<Blob>;	
}

declare interface IProjectFolder extends IProjectNode {
	find(path: string): IProjectNode | undefined;
}

declare interface IProject extends IProjectFolder {
	loadFile(url: string): Promise<IProjectFile | undefined>;
}

declare let loadCompletePromiseGlobal: Promise<any>;

declare let _currentFile: IProjectFile | null;

interface AttributeCollection {
	[name: string]: string;
}

declare function appendReactChild(parent: Node, child: any):void;
