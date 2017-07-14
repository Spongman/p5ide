class PreviewError {
	constructor(public event: ErrorEvent) {
	}

	element: HTMLElement;

	render() {

		var event = this.event;
		var previewWindow = event.currentTarget as Window;
		const origin = previewWindow.location.origin;
		const local = event.filename.startsWith(origin);
		let filename = local ? event.filename.substr(origin.length) : event.filename;
		filename = filename.trimStart('/');
		const fileText = `${filename}(${event.lineno},${event.colno})`;

		var onClick = () => {
			loadFile(_currentProject.find(filename) as SourceFile, { lineNumber: event.lineno, column: event.colno });
			return false;
		};

		return this.element = (
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
