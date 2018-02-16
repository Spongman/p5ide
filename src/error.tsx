class PreviewError {
	constructor(public event: ErrorEvent) {
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
			loadFile(_currentProject.find(filename) as ProjectFile, { lineNumber: event.lineno, column: event.colno });
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
