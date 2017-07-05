declare namespace JSX {
  interface Element { }
  interface IntrinsicElements { div: any; }
}

namespace MyReact {
    interface AttributeCollection {
        [name: string]: string;
    }

    export function createElement(tagName: string, attributes: AttributeCollection | null, ...children: any[]): Element {
        const element = document.createElement(tagName);

        if (attributes) {
            for (let key of Object.keys(attributes))
                element.setAttribute(key, attributes[key]);
        }

        for (let child of children)
            appendChild(element, child);

        return element;
    }

    function appendChild(parent: Node, child: any) {
        if (typeof child === "string")
            parent.appendChild(document.createTextNode(child));
        else if (child instanceof Node)
            parent.appendChild(child);
        else
            throw "Unsupported child";
    }
}