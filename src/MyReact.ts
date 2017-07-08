
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
	}
}

namespace MyReact {
	interface AttributeCollection {
		[name: string]: string;
	}

	export function createElement(tagName: string, attributes: AttributeCollection | null, ...children: any[]): Element {
		const element = document.createElement(tagName);

		if (attributes) {
			for (let key of Object.keys(attributes)) {
				var value = attributes[key];
				if (key.startsWith("on") && typeof value === 'function')
					element.addEventListener(key.substr(2).toLowerCase(), value);
				else
					element.setAttribute(key, value);
			}
		}

		for (let child of children)
			appendChild(element, child);

		return element;
	}

	function appendChild(parent: Node, child: any) {
		if (typeof child === "string")
			parent.appendChild(document.createTextNode(child));
		else if (typeof child['render'] === 'function')
			parent.appendChild(child.render());
		else if (child instanceof Node)
			parent.appendChild(child);
		else if (child instanceof Array) {
			for (var grandChild of child)
				appendChild(parent, grandChild);
		}
		else if (child !== null && child !== void 0 && typeof child !== 'boolean')
			throw "Unsupported child";
	}
}