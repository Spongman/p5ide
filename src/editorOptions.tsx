import { editor } from "monaco-editor";

class EditorOptions {

	//element: HTMLElement;
	render(options: editor.IEditorConstructionOptions) {
		console.log('foo');
		let element = (
			<form id="editorOptionsDialog" class="dialog">
				<fieldset class="vertical">
					<legend>brackets</legend>

					<label>
						auto close
						<input type="checkbox" name="autoClosingBrackets" />
					</label>

					<label>
						highlight matching
						<input type="checkbox" name="matchBrackets" />
					</label>
				</fieldset>

				<fieldset class="vertical">
					<legend>indenting</legend>
					<label>
						auto indent
						<input type="checkbox" name="autoIndent" />
					</label>
					<label>
						show guides
						<input type="checkbox" name="renderIndentGuides" />
					</label>
					<label>
						word wrap
						<input type="checkbox" name="wordWrap" />
					</label>
					<label>
						use tabs
						<input type="checkbox" name="useTabStops" />
					</label>
				</fieldset>

				<fieldset class="vertical">
					<legend>scrolling</legend>
					<label>
						minimap
						<input type="checkbox" name="minimap" />
					</label>

					<label>
						mouse wheel zoom
						<input type="checkbox" name="mouseWheelZoom" />
					</label>

				</fieldset>

				<fieldset class="vertical">
					<legend>cursor</legend>
					<label>
						style
						<select name="cursorStyle">
							<option>block</option>
							<option>line</option>
						</select>
					</label>
					<label>
						blinking
					<input type="checkbox" name="cursorBlinking" />
					</label>

				</fieldset>
			</form >
		);

		[].forEach.call(element.querySelectorAll("input,select"), (e: HTMLInputElement | HTMLSelectElement) => {
			let optionsDict = options as { [a: string]: string };
			e.value = optionsDict[e.name];

			e.addEventListener('change', () => {
				switch (e.type) {
					case "checkbox":
						optionsDict[e.name] = (e as HTMLInputElement).checked ? "checked" : "";
						break;
					default:
						optionsDict[e.name] = e.value;
						break;
				}

				/* TODO
				_editor.updateOptions(options);
				*/
			});
		});

		return element;
	}
}