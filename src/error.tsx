import { MyReact } from "./MyReact";

export class PreviewError {
	project: IProject;
	constructor(public app:IApplication, public event: ErrorEvent) {
		this.project = app.currentProject;
	}

	//private element: HTMLElement;

	render() {

		let event = this.event;
		let previewWindow = event.currentTarget as Window;
		const origin = previewWindow.location.origin;
		const local = event.filename.startsWith(origin);
		let filename = local ? event.filename.substr(origin.length) : event.filename;
		filename = filename.trimStart('/');
		const fileText = `${filename}(${event.lineno},${event.colno})`;

		let onClick = () => {
			this.app.loadFile(
				this.project.find(filename) as IProjectFile,
				{ lineNumber: event.lineno, column: event.colno }
			);
			return false;
		};

		return (
			<div class="error">
				{
					event.error && event.error.stack &&
					<i class="fa fa-info-circle" title={event.error.stack}></i>
				}
				{
					local ?
						<a href="#" onClick={onClick}>{fileText}</a>
						:
						<span>{fileText}</span>
				}
				<span> : {event.message}</span>
			</div>
		);
	}
}
