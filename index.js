var __awaiter=this&&this.__awaiter||function(e,t,i,o){return new(i||(i=Promise))(function(n,r){function s(e){try{l(o.next(e))}catch(e){r(e)}}function a(e){try{l(o.throw(e))}catch(e){r(e)}}function l(e){var t;e.done?n(e.value):(t=e.value,t instanceof i?t:new i(function(e){e(t)})).then(s,a)}l((o=o.apply(e,t||[])).next())})};define("SourceLanguage",["require","exports"],function(e,t){"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.SourceLanguage=void 0;class i{constructor(e,t,i="file-o",o="text/"+e){this.name=e,this.extensions=t,this.icon=i,this.mimeType=o}static fromExtension(e){return"."!==e.charAt(0)&&(e="."+e),i._languages.find(t=>t.extensions.indexOf(e)>=0)}}t.SourceLanguage=i,i.Javascript=new i("javascript",[".js"],"file-text-o"),i.Typescript=new i("typescript",[".ts"],"file-text-o"),i.Html=new i("html",[".html"],"file-code-o"),i.Css=new i("css",[".css"],"file-text-o"),i._languages=[i.Javascript,i.Typescript,i.Html,i.Css]}),define("MyReact",["require","exports"],function(e,t){"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.MyReact=void 0,function(e){e.createElement=function(e,t,...i){const o=document.createElement(e);if(t)for(const e of Object.keys(t)){const i=t[e];e.startsWith("on")&&"function"==typeof i?o.addEventListener(e.substr(2).toLowerCase(),i):o.setAttribute(e,i)}for(const e of i)appendReactChild(o,e);return o}}(t.MyReact||(t.MyReact={}))}),define("utils",["require","exports"],function(e,t){"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.ExtraLibs=t.blobToString=t.parseUrl=t.searchParams=t.EventDelayer=t.cachedFetch=t.click=t.promiseRequire=void 0,t.promiseRequire=function(t){return new Promise((i,o)=>{e(t,(...e)=>i(e),e=>o(e))})},String.prototype.trimStart=function(e){return void 0===e?this.replace(/^\s+/,""):this.startsWith(e)?this.substr(e.length):this},String.prototype.trimEnd=function(e){return void 0===e?this.replace(/\s+$/,""):this.endsWith(e)?this.substr(0,this.length-e.length):this},t.click=function(e,t){"string"==typeof e&&(e=document.getElementById(e)),e.addEventListener("click",e=>{e.preventDefault(),t(e)})},t.cachedFetch=function(e){return __awaiter(this,void 0,void 0,function*(){if(window.caches){const t=yield window.caches.open("fetch");let i=yield t.match(e);return i||(i=yield fetch(e),yield t.put(e,i),i=yield t.match(e)),i}if(window.localStorage){window.localStorage.fetch||(window.localStorage.fetch={});let t=JSON.parse(window.localStorage.fetch[e]);return t||(t=yield fetch(e),window.localStorage.fetch[e]=JSON.stringify(t)),t}return fetch(e)})};t.EventDelayer=class{constructor(e,t){this.callback=e,this.delay=t,this.timeUpdate=0}startTimer(e){setTimeout(()=>{const e=this.timeUpdate-Date.now();e>0?this.startTimer(e):(this.timeUpdate=0,this.callback())},this.delay)}trigger(){const e=Date.now();this.timeUpdate||this.startTimer(this.delay),this.timeUpdate=e+this.delay}},t.searchParams=function(e){return Object.entries(e).reduce((e,[t,i])=>(e.append(t,i),e),new URLSearchParams)},t.parseUrl=function(e){const t=document.createElement("a");return t.href=e,{protocol:t.protocol.trimEnd(":"),hostname:t.hostname,host:t.host,port:t.port,pathname:t.pathname.trimStart("/"),hash:t.hash,search:t.search}},t.blobToString=function(e){return new Promise((t,i)=>{const o=new FileReader;o.addEventListener("loadend",e=>t(o.result)),o.addEventListener("error",i),o.addEventListener("abort",i),o.readAsText(e)})};class i{static dispose(){for(const e in this.mapExtraLibs)this.mapExtraLibs[e].dispose();this.mapExtraLibs={}}static add(e,t){if(this.mapExtraLibs[e])return;console.log("ADD EXTRA LIB",e);const i=monaco.languages.typescript.javascriptDefaults.addExtraLib(t,e);this.mapExtraLibs[e]=i}static remove(e){const t=this.mapExtraLibs[e];t&&(t.dispose(),delete this.mapExtraLibs[e])}}t.ExtraLibs=i,i.mapExtraLibs={}}),define("monaco",["require","exports"],function(e,t){"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.P5Editor=void 0;class i{constructor(e){this.object=e}dispose(){}}class o{constructor(e){this.model=e,this._onDispose=new monaco.Emitter}get onDispose(){return this._onDispose.event}load(){return __awaiter(this,void 0,void 0,function*(){return this})}get textEditorModel(){return this.model}dispose(){this._onDispose.fire()}}class n{setEditor(e){this.editor=e}createModelReference(e){return __awaiter(this,void 0,void 0,function*(){if(!this.editor)throw new Error("not editor set yet");let t;if(this.editor.getEditorType()===monaco.editor.EditorType.ICodeEditor)t=this.findModel(this.editor,e);else{const i=this.editor;t=this.findModel(i.getOriginalEditor(),e)||this.findModel(i.getModifiedEditor(),e)}const n=t?new o(t):null;return new i(n)})}registerTextModelContentProvider(e,t){return new i(null)}findModel(e,t){return e.getModel()}}class r{setEditor(e){this._editor=e}openEditor(e,t){return __awaiter(this,void 0,void 0,function*(){const t=monaco.editor.getModel(e.resource.path);if(!t)return null;if(!this._editor)throw new Error("no editor set yet");if(this._editor.setModel(t),e.options.selection){this._editor.setSelection(e.options.selection);const t=this._editor.getTopForLineNumber(e.options.selection.startLineNumber),i=this._editor.getDomNode();i&&this._editor.setScrollTop(t-2*i.clientHeight/5)}return this._editor.focus(),null})}resolveEditor(){alert("resolve editor called!"+JSON.stringify(arguments))}}class s{constructor(e){this.options={fixedOverflowWidgets:!0,fontFamily:"Fira Code",lineNumbersMinChars:3,mouseWheelZoom:!0,scrollBeyondLastLine:!1,theme:"vs-dark"},monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({noSemanticValidation:!1,noSyntaxValidation:!1}),monaco.languages.typescript.javascriptDefaults.setCompilerOptions({noLib:!0,target:monaco.languages.typescript.ScriptTarget.ES2016,allowNonTsExtensions:!0});const t=new n,i=new r,o=document.getElementById("editorContainer");this._editor=monaco.editor.create(o,this.options,{editorService:i,textModelService:t}),t.setEditor(this._editor),i.setEditor(this._editor),e.forEach((e,t)=>{console.log("addExtraLib: "+e.url),monaco.languages.typescript.javascriptDefaults.addExtraLib(e.text,e.url)}),e.forEach((e,t)=>{const i=s.parseUrl(e.url);monaco.editor.createModel(e.text,"typescript",i)})}static parseUrl(e){return monaco.Uri.isUri(e)||(e=window.origin+"/"+e),monaco.Uri.parse(e)}layout(){this._editor.layout()}getValue(){return this._editor.getValue()}getModel(){return this._editor.getModel()}setModel(e){this._editor.setModel(e)}setPosition(e){this._editor.setPosition(e),this._editor.focus()}updateOptions(e){this._editor.updateOptions(e)}onDidChangeCursorPosition(e){return this._editor.onDidChangeCursorPosition(e)}onDidChangeModelContent(e){return this._editor.onDidChangeModelContent(e)}onDidChangeModel(e){return this._editor.onDidChangeModel(e)}}t.P5Editor=s}),define("project",["require","exports","SourceLanguage","MyReact","utils","monaco"],function(e,t,i,o,n,r){"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.ProjectFile=t.Project=t.ProjectFolder=t.ProjectNode=void 0;class s{constructor(e,t){this.name=e,this.icon=t,this.parent=null,this._allowClick=!0,this.element=this.renderElement()}get used(){return!!this.element&&this.element.classList.contains("used")}set used(e){this.setUsed(e)}clearUsed(){this.used=!1}setUsed(e){e&&this.parent&&(this.parent.used=!0),this.element&&this.element.classList.toggle("used",e)}get selected(){return this.element.classList.contains("selected")}set selected(e){this.element.classList.toggle("selected",e)}delete(){this.dispose(),this.element&&this.element.remove()}onClick(e){e.preventDefault(),this._allowClick&&this.activate()}onDelete(e){e.preventDefault();let t=new Event("p5ide_deleteNode",{bubbles:!0,cancelable:!0});t.sourceNode=this,e.target&&e.target.dispatchEvent(t)&&this.delete()}get project(){return this.parent&&this.parent.project}startRename(){return __awaiter(this,void 0,void 0,function*(){if(!this.project)throw new Error("uninitialized");var e=this.element.querySelector(".inputWrapper input");if(!e)throw new Error("input not found");this._allowClick=!1,this.project.shaded=!0,e.focus(),e.readOnly=!1,e.select(),this.element.classList.add("unshaded");var t=this;return yield new Promise((i,o)=>{function n(e){}function r(o){var l;a()&&(t.name=e.value,l=!0,e.removeEventListener("blur",n),e.removeEventListener("input",s),e.removeEventListener("change",r),e.readOnly=!0,t._allowClick=!0,t.project.shaded=!1,t.element.classList.remove("unshaded"),e.style.outlineColor="",i(l))}function s(t){e.style.outlineColor=a()?"":"red"}function a(){return/^[a-z0-9_.-]*$/.test(e.value)}e.addEventListener("blur",n),e.addEventListener("input",s),e.addEventListener("change",r)})})}}t.ProjectNode=s;class a extends s{constructor(e){var t;if(super(e,"folder-o"),this.children=[],this.element.classList.contains("childContainer"))t=this.element;else if(!(t=this.element.querySelector(".childContainer")))throw new Error("childContainer not found");this.childContainer=t}get path(){return(this.parent?this.parent.path:"/")+this.name+"/"}dispose(){this.children.forEach(e=>e.dispose())}delete(){this.children.forEach(e=>e.delete()),super.delete(),this.children.length=0}walk(e){for(var t of this.children){var i=e(t);if(null!=i)return i;if(t instanceof a&&null!=(i=t.walk(e)))return i}}find(e){if(!e)return;let t=(e=e.trimStart("/")).indexOf("/");t<0&&(t=e.length);let i=e.substr(0,t),o=".."===i?this.parent:this.children.find(e=>e.name===i);if(!o)return;let n=e.substr(t+1);return n?o.find(n):o}activate(){this.element.classList.toggle("open")}onNewFile(e){return __awaiter(this,void 0,void 0,function*(){this.open=!0;var e=new l("");this.addChild(e),(yield e.startRename())?e.activate():this.removeChild(e)})}onNewFolder(e){return __awaiter(this,void 0,void 0,function*(){this.open=!0;var e=new a("");this.addChild(e),(yield e.startRename())?e.activate():this.removeChild(e)})}renderElement(){return o.MyReact.createElement("li",{class:"sourceNode"},o.MyReact.createElement("div",{class:"hover"},o.MyReact.createElement("div",{class:"hover-show"},o.MyReact.createElement("a",{href:"#",title:"new file",onClick:this.onNewFile.bind(this)},o.MyReact.createElement("i",{class:"fa fa-file-o","aria-hidden":"true"},o.MyReact.createElement("i",{class:"fa fa-plus fa-overlay","aria-hidden":"true"}))),o.MyReact.createElement("a",{href:"#",title:"new folder",onClick:this.onNewFolder.bind(this)},o.MyReact.createElement("i",{class:"fa fa-folder-o","aria-hidden":"true"},o.MyReact.createElement("i",{class:"fa fa-plus fa-overlay","aria-hidden":"true"}))),o.MyReact.createElement("a",{href:"#",title:"delete "+this.name,onClick:this.onDelete.bind(this)},o.MyReact.createElement("i",{class:"fa fa-trash-o"}))),o.MyReact.createElement("a",{href:"#",onClick:this.onClick.bind(this)},o.MyReact.createElement("i",{class:"icon fa fa-folder-o"}),o.MyReact.createElement("i",{class:"icon fa fa-folder-open-o"}),o.MyReact.createElement("div",{class:"inputWrapper"},o.MyReact.createElement("input",{readonly:"readonly",value:this.name})))),o.MyReact.createElement("ul",{class:"childContainer"},this.children))}set used(e){super.setUsed(e),e&&"libraries"!==this.name&&(this.open=e)}clearUsed(){for(var e of(super.clearUsed(),this.open=!1,this.children))e.clearUsed()}get open(){return this.element.classList.contains("open")}set open(e){this.element&&this.element.classList.toggle("open",e),e&&this.parent&&(this.parent.open=!0)}addChild(e){e.parent=this,this.children.push(e),this.childContainer.appendChild(e.element)}removeChild(e){var t=this.children.indexOf(e);if(t<0)throw new Error("not a child of this node");e.parent=null,this.children.splice(t,1),e.element&&this.childContainer.removeChild(e.element)}}t.ProjectFolder=a;t.Project=class extends a{constructor(e=""){super(""),this.workingDirectory=this.find(e)||this}renderElement(){return o.MyReact.createElement("ul",{class:"childContainer"},this.children)}get project(){return this}get path(){return"/"}loadFile(e){return __awaiter(this,void 0,void 0,function*(){})}find(e){return this.workingDirectory&&this.workingDirectory!==this&&!e.startsWith("/")?this.workingDirectory.find(e):super.find(e)}addParents(e){if(e.startsWith("/"))e=e.trimStart("/");else if(e.startsWith("./"))e=this.workingDirectory.path+e.substr(1);else if(!e.startsWith(this.path))return;let t=this,i=e.split("/"),o=i.pop();if(o){for(let e of i){let i=t.find(e);i||(i=new a(e),t.addChild(i)),t=i}return{name:o,parent:t}}}get shaded(){return this.element.classList.contains("shaded")}set shaded(e){this.element.classList.toggle("shaded",e)}};class l extends s{constructor(e){super(e,"file-text-o");const t=this.name.lastIndexOf(".");this.extension=t>=0?this.name.substr(t):"",this.language=i.SourceLanguage.fromExtension(this.extension),this.language&&(this.icon=this.language.icon)}get path(){return(this.parent?this.parent.path:"/")+this.name}get languageName(){if(void 0===this._languageName)if(this.language)this._languageName=this.language.name;else{let e=monaco.languages.getLanguages().find(e=>!!e.extensions&&e.extensions.indexOf(this.extension)>=0);e&&(this._languageName=e.id)}return this._languageName}fetch(){return __awaiter(this,void 0,void 0,function*(){return yield fetch("assets/default/"+this.path)})}fetchBlob(){return __awaiter(this,void 0,void 0,function*(){if(this.model)return new Blob([this.model.getValue()],{type:this.language&&this.language.mimeType});if(!this.blob){let e=yield this.fetch();this.blob=yield e.blob()}return this.blob})}fetchModel(){return __awaiter(this,void 0,void 0,function*(){if(!this.model){let e;if(this.blob)e=yield n.blobToString(this.blob),delete this.blob;else{e=yield(yield this.fetch()).text()}this.model=this.createModel(e)}return this.model})}fetchValue(){return __awaiter(this,void 0,void 0,function*(){return(yield this.fetchModel()).getValue()})}createModel(e){return this.model||(this.model=monaco.editor.createModel(e,this.languageName,r.P5Editor.parseUrl(this.path))),this.model}dispose(){this.model&&(this.model.dispose(),delete this.model)}activate(){let e=new Event("p5ide_openFile",{bubbles:!0});e.sourceNode=this,this.element.dispatchEvent(e)}renderElement(){return o.MyReact.createElement("li",{class:"sourceNode"},o.MyReact.createElement("div",{class:"hover"},o.MyReact.createElement("div",{class:"hover-show"},o.MyReact.createElement("a",{href:"#",onClick:this.onDelete.bind(this),title:"delete "+this.name},o.MyReact.createElement("i",{class:"fa fa-trash-o"}))),o.MyReact.createElement("a",{href:"#",onClick:this.onClick.bind(this)},o.MyReact.createElement("i",{class:`icon fa fa-${this.icon}`}),o.MyReact.createElement("div",{class:"inputWrapper"},o.MyReact.createElement("input",{readonly:"readonly",value:this.name})))))}}t.ProjectFile=l}),define("proxyConsole",["require","exports"],function(e,t){"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.ProxyConsole=void 0;class i{constructor(e,t){this.addRow=t;const o=this;for(const t in Object.getOwnPropertyDescriptors(i.prototype)){const i=e[t],n=o[t];e[t]=function(){n.apply(o,arguments),i.apply(this,arguments)}}}addSimpleRow(e,t){const i=document.createElement("div");i.className=e,i.textContent=Array.prototype.slice.call(t).map(e=>e.toString()).join(" "),this.addRow(i)}debug(e,...t){this.addSimpleRow("console-debug",arguments)}log(e,...t){this.addSimpleRow("console-log",arguments)}info(e,...t){this.addSimpleRow("console-info",arguments)}warn(e,...t){this.addSimpleRow("console-warn",arguments)}error(e,...t){this.addSimpleRow("console-error",arguments)}}t.ProxyConsole=i}),define("error",["require","exports","MyReact"],function(e,t,i){"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.PreviewError=void 0;t.PreviewError=class{constructor(e,t){this.app=e,this.event=t,this.project=e.currentProject}render(){let e=this.event;const t=e.currentTarget.location.origin,o=e.filename.startsWith(t);let n=o?e.filename.substr(t.length):e.filename;const r=`${n=n.trimStart("/")}(${e.lineno},${e.colno})`;return i.MyReact.createElement("div",{class:"error"},e.error&&e.error.stack&&i.MyReact.createElement("i",{class:"fa fa-info-circle",title:e.error.stack}),o?i.MyReact.createElement("a",{href:"#",onClick:()=>(this.app.loadFile(this.project.find(n),{lineNumber:e.lineno,column:e.colno}),!1)},r):i.MyReact.createElement("span",null,r),i.MyReact.createElement("span",null," : ",e.message))}}}),define("preview",["require","exports","utils","proxyConsole","SourceLanguage","error","project"],function(e,t,i,o,n,r,s){"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.P5Preview=void 0;const a="assets/v/blank.html";t.P5Preview=class{constructor(e){this.application=e,this.window=null,this.isDocked=!0,this.isPaused=!1,this.isLoading=!1,this.previousScript=null,this.currentProject=null,this._currentHtml=null}get project(){return this.currentProject}set project(e){this.currentProject=e,this.previewFile()}get currentHtml(){return this._currentHtml}previewFile(e){i.ExtraLibs.dispose(),this._currentHtml=e,e?(this.currentProject&&this.currentProject.clearUsed(),console.log("previewFile",e.path),this._currentHtml.used=!0,this.loadPreview(),this.isLoading=!0,document.querySelector("#previewPanel > .panelHeader > span").textContent=this._currentHtml.name):this.writePreview()}loadPreview(e){this.isLoading=!1,this.previousScript=null,console.log("loadPreview");const t=document.getElementById("previewContainer");if(document.getElementById("consoleContainer").innerHTML="",void 0===e&&(e=this.isDocked),e){this.window=null;const e=document.getElementById("previewFrame");e?e.src=a:t.innerHTML='<iframe id="previewFrame" width="100%" height="100%" src="'+a+'"></iframe>'}else{const e=t.getBoundingClientRect();if(this.isDocked){const i=window.devicePixelRatio;this.window=window.open(a,"previewFrame","toolbar=0,status=0,menubar=0,location=0,replace=1,width="+Math.floor(i*t.clientWidth)+",height="+Math.floor(i*t.clientHeight)+",left="+(window.screenX+Math.floor(i*e.left))+",top="+(window.screenY+Math.floor(i*e.top)+26));const o=setInterval(()=>{this.window&&!this.window.closed||(clearInterval(o),this.loadPreview(!0))},250)}else this.window.location.href=a,window.focus()}this.isDocked!==e&&(this.isDocked=e,document.body.classList.toggle("preview-docked",e),e||(t.innerHTML=""),window.dispatchEvent(new Event("resize")),this.application.editor&&this.application.editor.layout())}frameLoaded(e){return __awaiter(this,void 0,void 0,function*(){if(this.isDocked){const e=document.getElementById("previewFrame");this.window=e.contentWindow}if(!this.window)return void console.log("WARNING: no previewWindow");loopProtect.alias="__protect",this.window.__protect=loopProtect.protect;const e=this.window.navigator.serviceWorker;e.addEventListener("message",this.handleRequest.bind(this));var t=window.location.pathname.substr(0,window.location.pathname.length-1);yield e.register(t+"/sw.js",{scope:t+"/assets/v/"}),console.log("sw.ready");let i=e.ready;console.log("registered",i);var o=this._currentHtml;if(!o)return;const n=yield o.fetchValue();var r=o.parent.path;console.log("BASE",r),setTimeout(()=>__awaiter(this,void 0,void 0,function*(){this.writePreview("<base href='"+r+"'><script>(opener||parent).app.preview.onDidLoadPreview(window);<\/script>"+n)}),1)})}handleRequest(e){return __awaiter(this,void 0,void 0,function*(){if(!e.ports||!this.currentProject)return;let t=null;const o=e.data;console.log("request: "+o);const r=e.origin.length;if(o.substring(0,r)===e.origin){let l=o.substring(r),c=this.currentProject.find(l);if(c instanceof s.ProjectFolder){if(l.endsWith("/"))throw new Error("TODO: default document");return e.ports[0].postMessage({redirect:o+"/"})}if(!c){try{c=yield this.currentProject.loadFile(l)}catch(t){if(t.status)return e.ports[0].postMessage({statusText:t.statusText,status:t.status})}if(!c)return e.ports[0].postMessage({statusText:"not found",status:404})}if(c instanceof s.ProjectFile){var a=c;a.used=!0;const e=a.language;switch(e){case n.SourceLanguage.Javascript:if(["p5.js","p5.dom.js","p5.sound.js"].indexOf(a.name)<0){this.isLoading&&(this.previousScript=a);const o=yield a.fetchValue();a!==this.application.currentFile&&i.ExtraLibs.add(a.name,o),t=new Blob([loopProtect(o)],{type:e&&e.mimeType})}}t||(t=yield a.fetchBlob())}}e.ports[0].postMessage(t)})}writePreview(e){this.window&&(this.window.document.open(),this.window.document.clear(),e&&this.window.document.write(e),this.window.document.close())}onDidLoadPreview(e){this.isLoading&&e.document.addEventListener("DOMContentLoaded",()=>{this.application.loadFile(this.previousScript||this._currentHtml)}),e.addEventListener("error",e=>this.handlePreviewError(e));const t=document.getElementById("consoleContainer");new o.ProxyConsole(e.console,e=>{const i=t.scrollTop>=t.scrollHeight-t.clientHeight-5;t.appendChild(e),i&&(t.scrollTop=t.scrollHeight-t.clientHeight),this.setConsoleVisibility()})}handlePreviewError(e){if(this.setConsoleVisibility(),this.currentProject){const t=document.getElementById("consoleContainer"),i=new r.PreviewError(this.application,e);t.appendChild(i.render())}}setConsoleVisibility(e=!0){document.body.classList.contains("console-visible")!=e&&(document.body.classList.toggle("console-visible",e),this.application.editor.layout())}updateFile(e){if(this.window)switch(e.language){case n.SourceLanguage.Css:const t=this.window.location.origin+"/"+e.path;let i=!1;if([].slice.call(this.window.document.styleSheets).filter(e=>e.href===t).forEach(e=>{const t=e.ownerNode;t.href=t.href,i=!0}),i)return}}get paused(){return this.isPaused}set paused(e){this.isPaused!==e&&(this.isPaused=e,e||this.loadPreview())}}}),define("webProject",["require","exports","project","utils"],function(e,t,i,o){"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.WebProject=void 0;class n extends i.Project{constructor(e){super(),this.root=e}static load(e){return __awaiter(this,void 0,void 0,function*(){if(!e)throw new Error("invalid Url");let t,i=o.parseUrl(e);if(i.search)throw new Error("querystrings not supported");for(;"opaqueredirect"===(t=yield fetch(e,{redirect:"manual"})).type;){if(o.parseUrl(t.url).host!==i.host)throw new Error("insecure host change during redirect");e=t.url}let s=yield t.blob(),a=(i=o.parseUrl(t.url)).pathname;a.trimStart("/"),a.trimEnd("/");let l=new n(`${i.protocol}://${i.host}/${a}`);if(!a||a.endsWith("/")){a=a.trimEnd("/");let e=new r("index.html",s);l.addChild(e)}else{let e=a.split("/"),t=e.pop();a=e.join("/");let i=new r(t,s);l.addChild(i)}return l})}loadFile(e){return __awaiter(this,void 0,void 0,function*(){console.log("loadFile",e);const t=yield fetch(this.root+e);if(!t.ok)throw t;const i=yield t.blob(),o=this.addParents(e);if(!o)return;const n=new r(o.name,i);return o.parent.addChild(n),n})}}t.WebProject=n;class r extends i.ProjectFile{constructor(e,t){super(e),t&&(this.blob=t)}fetch(){return __awaiter(this,void 0,void 0,function*(){return yield fetch(`${this.project.path}/${this.path}`)})}}}),define("githubProject",["require","exports","project","utils"],function(e,t,i,o){"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.GitHubProject=void 0;class n extends i.Project{constructor(e,t,i,o,n){super(),this.user=e,this.repo=t,this.branch=i,this.root=o,this.sha=n}static load(e){return __awaiter(this,void 0,void 0,function*(){let[t,i,r,s,a]=e.match(/(?:https:\/\/)?github\.com\/([^\/]*)\/([^\/]*)(?:\/tree\/([^\/]*)\/(.*))?/i)||[];if(!t)return Promise.reject("invalid GitHub url");s||(s="master"),a||(a="");const l=yield(yield o.cachedFetch(`https://api.github.com/repos/${i}/${r}/branches/${s||"master"}`)).json();let c=l.commit.sha;const d=yield(yield o.cachedFetch(l.commit.commit.tree.url+"?recursive=1")).json();let h=new n(i,r,s,"/"+(a||""),c);for(const e of d.tree.filter(e=>e.path.startsWith(a)&&e.path.length>a.length&&"blob"===e.type))h.addFile(e.path.substr(a.length),e.sha,e.type);return h})}addFile(e,t,i){let o=this.addParents(e);if(o){const e=new r(o.name,t);o.parent.addChild(e)}}}t.GitHubProject=n;class r extends i.ProjectFile{constructor(e,t){super(e),this.sha=t}fetch(){return __awaiter(this,void 0,void 0,function*(){let e=this.project;return yield fetch(`https://raw.githubusercontent.com/${e.user}/${e.repo}/${e.sha}${e.root}/${this.path}`)})}}}),define("auth",["require","exports"],function(e,t){"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.Auth=void 0;t.Auth=class{constructor(){this.authenticated=!1}initialize(){return __awaiter(this,void 0,void 0,function*(){const e=window.localStorage.access_token;e&&((yield this.authenticate(e))||(window.localStorage.access_token=null))})}login(){return __awaiter(this,void 0,void 0,function*(){if(this.authenticated)return;const e=window.localStorage.access_token=yield this.fetchToken();e&&(yield this.authenticate(e))})}authenticate(e){return __awaiter(this,void 0,void 0,function*(){const t=yield(yield fetch("https://api.github.com/user",{method:"GET",headers:{Authorization:"token "+e},cache:"no-cache"})).json();return this.userName=t.login,this.authenticated=!!this.userName,document.body.classList.toggle("authenticated",this.authenticated),document.getElementById("userName").textContent=this.userName||"",this.authenticated})}logoff(){delete window.localStorage.access_token,delete this.userName,this.authenticated=!1,document.body.classList.remove("authenticated")}fetchToken(){return new Promise((e,t)=>{const i={width:450,height:600,menubar:0,toolbar:0,personalbar:0,status:0,left:window.screenLeft+window.innerWidth-450,top:window.screenTop+window.innerHeight-600},o=window.open("https://github.com/login/oauth/authorize?scope=public_repo&client_id=2cb7dbbede12e09b2112","_login",Object.keys(i).map(e=>e+"="+i[e]).join(","));window.addEventListener("message",s);const n=setInterval(()=>{o&&!o.closed||(r(),t("cancelled"))},250);function r(){clearInterval(n),window.removeEventListener("message",s),o.close()}function s(i){return __awaiter(this,void 0,void 0,function*(){const o=i.data,n=o&&o.code;if(n){const i=yield(yield fetch("https://p5ide.codewithoutborders.com/login?code="+n,{cache:"no-cache"})).text(),o=new URLSearchParams(i).get("access_token");r(),o?e(o):t("failed")}})}})}}}),define("index",["require","exports","project","SourceLanguage","monaco","preview","utils","webProject","githubProject","auth"],function(e,t,i,o,n,r,s,a,l,c){"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.Application=void 0;const d=new c.Auth,h=["./assets/types/index.d.ts","./assets/types/global.d.ts","https://raw.githubusercontent.com/Microsoft/TypeScript/master/lib/lib.es5.d.ts"];class u{constructor(){this.currentFile=null}loadProjectFromUrl(e){return __awaiter(this,void 0,void 0,function*(){try{return yield l.GitHubProject.load(e)}catch(t){return yield a.WebProject.load(e)}})}static appendReactChild(e,t){if("string"==typeof t)e.appendChild(document.createTextNode(t));else if(t instanceof i.ProjectNode)e.appendChild(t.element);else if(t&&"function"==typeof t.render)e.appendChild(t.render());else if(t instanceof Node)e.appendChild(t);else if(t instanceof Array)for(const i of t)u.appendReactChild(e,i);else if(null!==t&&void 0!==t&&"boolean"!=typeof t)throw"Unsupported child: "+t}loadProject(e){console.log();const t=document.getElementById("fileContainer");t.innerHTML="",this.currentProject&&this.currentProject.dispose(),this.closeFile(),this.currentProject=e,this.preview.project=e;const i=t.appendChild(e.element);i.addEventListener("p5ide_openFile",e=>{const t=e;this.loadFile(t.sourceNode)}),i.addEventListener("p5ide_deleteNode",e=>{console.log(e)});const o=e.workingDirectory;let n=o.find("index.html");n?this.preview.previewFile(n):(n=o.find("README.md"))&&this.loadFile(n)}closeFile(){if(!this.currentFile)return;const e=this.editor.getModel();e&&(e!=this.currentFile.model&&console.log("model has changed"),this.currentFile.language!==o.SourceLanguage.Javascript&&this.currentFile.language!==o.SourceLanguage.Typescript||s.ExtraLibs.add(this.currentFile.name,e.getValue())),this.currentFile.selected=!1,this.currentFile=null,this.preview.currentHtml}loadFile(e,t){return __awaiter(this,void 0,void 0,function*(){if(e){if(this.currentFile!==e){if(this.closeFile(),e!==this.preview.currentHtml&&e.language===o.SourceLanguage.Html)return this.currentProject.workingDirectory=e.parent,this.currentProject.walk(t=>{t.parent&&(t.parent.open=t.parent===e.parent),t.used=t===e}),void this.preview.previewFile(e);this.currentFile=e,this.currentFile.selected=!0;const t=yield e.fetchModel();this.editor.setModel(t),s.ExtraLibs.remove(e.name),document.getElementById("footerFilename").textContent=e.path,document.getElementById("footerType").textContent=e.languageName||"plain",document.getElementById("editorFilename").textContent=e.path,e.parent&&(e.parent.open=!0)}t&&this.editor.setPosition(t)}})}start(){return __awaiter(this,void 0,void 0,function*(){let e,t=yield Promise.all(h.map(e=>fetch(e).then(e=>e.text()).then(t=>({url:e,text:t}))));yield document.ready(),yield d.initialize(),this.editor=new n.P5Editor(t),this.preview=new r.P5Preview(this);try{e=yield this.loadProjectFromUrl(location.hash.substring(1))}catch(t){console.log(t),e=yield this.loadProjectFromUrl("assets/default/")}window.addEventListener("resize",()=>{this.editor.layout()},!0),this.editor.onDidChangeCursorPosition(e=>{document.getElementById("footerPosition").textContent="Ln "+e.position.lineNumber+", Col "+e.position.column}),this.editor.onDidChangeModel(e=>{const t=this.editor.getModel();if(this.currentFile.model===t)return;if(!t)return void this.closeFile();const i=this.currentProject.walk(e=>e.model===t?e:null);if(i)this.loadFile(i);else{this.closeFile();const e=t.uri.toString();document.getElementById("footerFilename").textContent=e,document.getElementById("footerType").textContent="",document.getElementById("editorFilename").textContent=e}});const i=new s.EventDelayer(()=>{this.currentFile&&this.preview.loadPreview()},1e3);this.editor.onDidChangeModelContent(()=>{this.currentFile&&this.currentFile.used&&!this.preview.paused&&i.trigger()}),this.loadProject(e);let o=e=>{document.body.classList.toggle("preview-paused",e),this.preview.paused=e};s.click("btnRefresh",()=>{this.preview.loadPreview()}),s.click("btnPause",()=>{o(!0)}),s.click("btnRun",()=>{o(!1)}),s.click("btnFloatPreview",()=>{this.preview.loadPreview(!1)}),s.click("btnCloseConsole",()=>{this.preview.setConsoleVisibility(!1)}),s.click("btnLoadProject",e=>{this.openDialog("#projectOpenDialog",e.target)}),s.click("btnNewFile",e=>this.currentProject.onNewFile(e)),s.click("btnNewFolder",e=>this.currentProject.onNewFolder(e)),s.click("btnLogin",()=>__awaiter(this,void 0,void 0,function*(){yield d.login()}));const a=document.getElementById("selectTheme");function l(e){monaco.editor.setTheme(e),[].forEach.call(document.querySelectorAll("#selectTheme > option"),e=>{document.body.classList.remove("theme-"+e.value)}),document.body.classList.add("theme-"+e),window.localStorage.theme=e,a.value=e}a.addEventListener("change",()=>{l(a.value)}),l(window.localStorage.theme||a.value),[].forEach.call(document.querySelectorAll(".flex-horizontal > span, .flex-vertical > span"),e=>{const t=e.parentNode,i=t.querySelector(":scope > :not(.flex-fill):not(span)"),o=[].find.call(t.childNodes,t=>t===i||t===e)!==e,n=t.classList.contains("flex-horizontal");function r(e){e.preventDefault();const r=t.getBoundingClientRect();if(n){const t=o?e.pageX-r.left:r.right-e.pageX;i.style.width=t+"px"}else{const t=o?e.pageY-r.top:r.bottom-e.pageY;i.style.height=t+"px"}i.dispatchEvent(new Event("resize"))}e.addEventListener("mousedown",e=>{e.preventDefault(),document.addEventListener("mouseup",()=>{document.removeEventListener("mousemove",r),t.classList.remove("dragging")}),document.addEventListener("mousemove",r),t.classList.add("dragging")})}),[].forEach.call(document.body.querySelectorAll(".dialog"),e=>{e.addEventListener("click",t=>{t.target===e&&(e.style.display="none")})}),document.querySelector("#projectOpenDialog").addEventListener("submit",e=>__awaiter(this,void 0,void 0,function*(){if(e.preventDefault(),!document.activeElement)return;const t=e.target,i="BUTTON"===document.activeElement.tagName?document.activeElement:t.elements.namedItem("url");try{const e=yield this.loadProjectFromUrl(i.value);this.loadProject(e),t.style.display="none"}catch(e){i.setCustomValidity("invalid project URL"),t.reportValidity()}}))})}openDialog(e,t){"string"==typeof e&&(e=document.querySelector(e));let i=100,o=100;if(t){const e=t.getBoundingClientRect();i=e.right,o=e.bottom}e.style.paddingLeft=i+"px",e.style.paddingTop=o+"px",e.style.display="block";const n=e.querySelector("input[autofocus]");n&&n.focus()}}t.Application=u});
//# sourceMappingURL=index.js.map
