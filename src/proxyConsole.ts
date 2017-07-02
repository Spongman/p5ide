class ProxyConsole {

    constructor(console:any, protected addRow:(elt:HTMLElement) => void) {
        let _this:any = this;
        for (let prop in ProxyConsole.prototype)
        {
            let orig:Function = console[prop];
            let override:Function = _this[prop];
            console[prop] = function () {
                override.apply(_this, arguments);
                orig.apply(this, arguments);
            };
        }
    }

    addSimpleRow(className:string, args:IArguments)
    {
        var row = document.createElement("div");
        row.className = className;
        row.textContent = Array.prototype.slice.call(args).map(a => a.toString()).join(" ");
        this.addRow(row);
    }

    /*
    assert(test?: boolean, message?: string, ...optionalParams: any[]): void;
    clear(): void;
    count(countTitle?: string): void;
    debug(message?: any, ...optionalParams: any[]): void;
    */
    debug(message?: any, ...optionalParams: any[]): void { this.addSimpleRow("console-debug", arguments); }
    /*
    dir(value?: any, ...optionalParams: any[]): void;
    dirxml(value: any): void;
    group(groupTitle?: string): void;
    groupCollapsed(groupTitle?: string): void;
    groupEnd(): void;
    msIsIndependentlyComposed(element: Element): boolean;
    profile(reportName?: string): void;
    profileEnd(): void;
    select(element: Element): void;
    table(...data: any[]): void;
    time(timerName?: string): void;
    timeEnd(timerName?: string): void;
    */
    log(message?: any, ...optionalParams: any[]): void { this.addSimpleRow("console-log", arguments); }
    info(message?: any, ...optionalParams: any[]): void { this.addSimpleRow("console-info", arguments); }
    warn(message?: any, ...optionalParams: any[]): void { this.addSimpleRow("console-warn", arguments); }
    /*
    trace(message?: any, ...optionalParams: any[]): void;
    */
    error(message?: any, ...optionalParams: any[]): void { this.addSimpleRow("console-error", arguments); }
    /*
    exception(message?: string, ...optionalParams: any[]): void;
    */
}
