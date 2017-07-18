class EditorOptions {

	element: HTMLElement;

	render(options:monaco.editor.IEditorConstructionOptions) {
		console.log('foo');
		this.element = (
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

		[].forEach.call(this.element.querySelectorAll("input,select"), (e:HTMLInputElement|HTMLSelectElement) => {
			e.value = options[e.name];

			e.addEventListener('change', () => {
				switch (e.type)
				{
					case "checkbox":
						options[e.name] = e.checked ? true : false;
						break;	
					default:
						options[e.name] = e.value;
						break;	
				}

				_editor.updateOptions(options);
			});
		});

		return this.element;
	}
}