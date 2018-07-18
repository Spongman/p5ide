
export namespace MyReact {

	export function createElement(tagName: string, attributes: AttributeCollection | null, ...children: any[]): Element {
		const element = document.createElement(tagName);

		if (attributes) {
			for (const key of Object.keys(attributes)) {
				const value = attributes[key];
				if (key.startsWith("on") && typeof value === 'function')
					element.addEventListener(key.substr(2).toLowerCase(), value);
				else
					element.setAttribute(key, value);
			}
		}

		for (const child of children)
			appendReactChild(element, child);

		return element;
	}
}
