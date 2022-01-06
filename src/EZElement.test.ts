import {assert, fail, assertEquals} from "https://deno.land/std/testing/asserts.ts";
import {html} from './EZElement.ts';
import EZElement from './EZElement.ts';

Deno.test(
    'html() return a renderable string',
    () => {
        const expectedContent = 'this is a dumb string';
        const content = html(new EZElement())`${expectedContent}`;
//export const html = (element: EZElement) => (strings: string[], ...args: any[]): [strings: string[], ...args: any[]] => {
        //const content = ((strings: TemplateStringsArray, ...args: string[])=>{
        //    console.log({strings, args});
        //    return [strings, ...args];
        //})`arstarst ${expectedContent} arstarst ${expectedContent}`;
        console.log({content});
        assertEquals(content,expectedContent);
    }
)
