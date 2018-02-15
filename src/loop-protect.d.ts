declare function loopProtect(content:string): string;
declare namespace loopProtect
{
    export let alias: string;
    export function debug(enable:boolean): void;
    export function protect(line:number, reset?: boolean): any;
    export function reset(): void;
    export function rewriteLoops(code: string, offset?: number): any;
}