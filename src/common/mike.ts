/**
 * Create a DOM element or tree.
 * Usages:
 *  - createElement(tag);
 *  - createElement(tag, id);
 *  - createElement(tag, id, class);
 *  - createElement(tag, id, class, children);
 *  - createElement(tag, id, attributes);
 *  - createElement(tag, id, attributes, children);
 *  - createElement(structure);
 * Where:
 *  - tag: string
 *  - id: string, number, or null
 *  - class: string, number, or null
 *  - attributes: {attr: value, ...}
 *  - children: string, node, or array of strings and/or nodes
 *  - structure: {'tag': tag, 'id': id, 'classes': class, 'children': [structure, ...]}
 * @param args
 * @returns
 */
export function make(...args: any[]): HTMLElement | null {
    if (args.length == 0) return null; //You give me nothing, I give you nothing.

    if (isStr(args[0])) {
        var el = document.createElement(args[0]);
        var idx = 1;
        if (args.length == idx) return el;

        if (isStr(args[idx]) || isNum(args[idx])) {
            el.setAttribute('id', args[idx]);
            idx++;
        } else if (args[idx] === null) {
            idx++;
        }
        if (args.length == idx) return el;

        if (isStr(args[idx])) {
            el.setAttribute('class', args[idx]);
            idx++;
        } else if (args[idx] === null) {
            //Null check before object check because null is apparently an object...
            idx++;
        } else if (typeof args[idx] === 'object' && !Array.isArray(args[idx])) {
            for (var attr in args[idx]) {
            if (args[idx].hasOwnProperty(attr)) {
                el.setAttribute(attr, args[idx][attr]);
            }
            }
            idx++;
        }
        if (args.length == idx) return el;

        var children = args[idx];
        if (!Array.isArray(children)) {
            children = [children];
        }
        for (var child of children) {
            if (isStr(child) || isNum(child)) {
            el.appendChild(textNode(child));
            } else if (child) {
            el.appendChild(child);
            }
        }

        return el;
    } else if (typeof args[0] === 'object' && args[0].tag) {
        var el = document.createElement(args[0].tag);
        if (args[0].id) el.setAttribute('id', args[0].id);
        if (args[0].classes) el.setAttribute('class', args[0].classes);
        if (args[0].attributes && typeof args[0].attributes === 'object') {
            for (var attr in args[0].attributes) {
            if (args[0].attributes.hasOwnProperty(attr)) {
                el.setAttribute(attr, args[0].attributes[attr]);
            }
            }
        }
        if (args[0].children && Array.isArray(args[0].children)) {
            for (var child of args[0].children) {
            if (isStr(child) || isNum(child)) {
                el.appendChild(textNode(child));
            } else if (isNode(child) || isElement(child)) {
                el.appendChild(child);
            } else if (child.html) {
                el.innerHTML = child.html;
            } else if (child) {
                var chel = createElement(child);
                if (chel) el.appendChild(chel);
            }
            }
        }
        return el;
    }

    return null;
}
export let createElement: (...args: any[]) => HTMLElement | null = make;

/**
 * Create a text node
 * @param text
 * @returns
 */
export function textNode(text: string): Text {
    return document.createTextNode(text);
}

export function getPlainText(el: HTMLElement): string {
    return '';
}

/**
 * getElementById replacement
 * @param args
 * @returns
 */
export function get(...args: any[]) {
    if (args.length == 0) return null; //You give me nothing, I give you nothing.
    var el = document;
    var i = 0;
    if (!isStr(args[i])) el = args[i++];

    if (isStr(args[i])) return el.getElementById(args[i]);
    return null;
}

/**
 * getElementsByTagName replacement
 * @param args
 * @returns
 */
export function getTags(...args: any[]): HTMLCollectionOf<any> | null {
    if (args.length == 0) return null; //You give me nothing, I give you nothing.
    var el = document;
    var i = 0;
    if (!isStr(args[i])) el = args[i++];

    if (isStr(args[i])) return el.getElementsByTagName(args[i]);
    return null;
}

/**
 * Like getTags, but only returns the first one found. (Intended for cases where there is only one.)
 * @param args
 * @returns
 */
export function getTag(...args: any[]) {
    var elements = getTags(...args);

    if (elements) return elements[0];
    return null;
}

/**
 * getElementsByTagName replacement
 * @param args
 * @returns
 */
export function getClasses(...args: any[]): HTMLCollectionOf<any> | null {
    if (args.length == 0) return null; //You give me nothing, I give you nothing.
    var el = document;
    var i = 0;
    if (!isStr(args[i])) el = args[i++];

    if (isStr(args[i])) return el.getElementsByClassName(args[i]);
    return null;
}

/**
 * Like getClasses, but only returns the first one found. (Intended for cases where there is only one.)
 * @param args
 * @returns
 */
export function getClass(...args: any[]) {
    var elements = getClasses(...args);

    if (elements) return elements[0];
    return null;
}

/**
 * Replace a node with its child nodes
 * @param el
 */
export function promoteKiddies(el: HTMLElement) {
    var parent = el.parentNode;
    if (parent === null) return;

    var node;
    while (node = el.lastChild) {
      parent.insertBefore(node, el.nextSibling);
    }
    parent.removeChild(el);
}

/**
 * Remove all child nodes of an element.
 * @param el
 */
export function byebyeKiddies(el: HTMLElement) {
    if (el.hasChildNodes()) {
        while (el.childNodes.length >= 1) {
            if (el.firstChild === null) continue;
            el.removeChild(el.firstChild);
        }
    }
}

/**
 * Escape regular expression characters
 * @param str
 * @returns
 */
export function escapeRegExp(str: string): string {
    return str.replace(/[.*+\-?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

/**
 * Splits a unix path on directory separators
 * @param path
 * @returns
 */
export function splitPath(path: string): string[] {
    return path.split(/\//g);
}

/**
 * Returns the path part
 * @param path
 * @returns
 */
export function dirname(path: string): string {
    var pathBits = splitPath(path);
    pathBits.pop();
    return pathBits.join('/');
}

/**
 * Returns the filename part
 * @param path
 * @returns
 */
export function basename(path: string): string {
    var pathBits = splitPath(path);
    var name = pathBits.pop();
    if (name === undefined) return '';//Never going to happen.
    return name;
}

/**
 *
 */
type ColourParts = {
    red: number | null,
    green: number | null,
    blue: number | null,
    hue: number | null,
    saturation: number | null,
    light: number | null,
    alpha: number | null
};

/**
 * Returns an object with the colour components of the passed colour.
 * @param colour
 * @returns
 */
export function cssColourParts(colour: string): ColourParts {
    if (!/^rgba?\(|^hsla?\(|^#/.test(colour)) {
        var s=['GREEN','BLUE','LIGHT','DARK','MEDIUM','GOLDENROD','TURQUOISE'],defs='ALICE;8Pj/,ANTIQUEWHITE+uvX,AQUAAP//,AQUAMARINEf//U,AZURE8P//,BEIGE9fXc,BISQUE/+TE,BLACKAAAA,BLANCHEDALMOND/+vN,;AAD/,;VIOLETiivi,BROWNpSoq,BURLYWOOD3riH,CADET;X56g,CHARTREUSEf/8A,CHOCOLATE0mke,CORAL/39Q,CORNFLOWER;ZJXt,CORNSILK//jc,CRIMSON3BQ8,CYANAP//,=;AACL,=CYANAIuL,=?uIYL,=GRAYqamp,=:AGQA,=KHAKIvbdr,=MAGENTAiwCL,=OLIVE:VWsv,=ORANGE/4wA,=ORCHIDmTLM,=REDiwAA,=SALMON6ZZ6,=SEA:j7yP,=SLATE;SD2L,=SLATEGRAYL09P,=@AM7R,=VIOLETlADT,DEEPPINK/xST,DEEPSKY;AL//,DIMGRAYaWlp,DODGER;HpD/,FIREBRICKsiIi,FLORALWHITE//rw,FOREST:Iosi,FUCHSIA/wD/,GAINSBORO3Nzc,GHOSTWHITE+Pj/,GOLD/9cA,?2qUg,GRAYgICA,:AIAA,:YELLOWrf8v,HONEYDEW8P/w,HOTPINK/2m0,INDIANREDzVxc,INDIGOSwCC,IVORY///w,KHAKI8OaM,LAVENDER5ub6,LAVENDERBLUSH//D1,LAWN:fPwA,LEMONCHIFFON//rN,<;rdjm,<CORAL8ICA,<CYAN4P//,<?YELLOW+vrS,<GREY09PT,<:kO6Q,<PINK/7bB,<SALMON/6B6,<SEA:ILKq,<SKY;h876,<SLATEGRAYd4iZ,<STEEL;sMTe,<YELLOW///g,LIMEAP8A,LIME:Ms0y,LINEN+vDm,MAGENTA/wD/,MAROONgAAA,>AQUAMARINEZs2q,>;AADN,>ORCHIDulXT,>PURPLEk3DY,>SEA:PLNx,>SLATE;e2ju,>SPRING:APqa,>@SNHM,>VIOLETREDxxWF,MIDNIGHT;GRlw,MINTCREAM9f/6,MISTYROSE/+Th,MOCCASIN/+S1,NAVAJOWHITE/96t,NAVYAACA,OLDLACE/fXm,OLIVEgIAA,OLIVEDRABa44j,ORANGE/6UA,ORANGERED/0UA,ORCHID2nDW,PALE?7uiq,PALE:mPuY,PALE@r+7u,PALEVIOLETRED2HCT,PAPAYAWHIP/+/V,PEACHPUFF/9q5,PERUzYU/,PINK/8DL,PLUM3aDd,POWDER;sODm,PURPLEgACA,REBECCAPURPLEZjOZ,RED/wAA,ROSYBROWNvI+P,ROYAL;QWnh,SADDLEBROWNi0UT,SALMON+oBy,SANDYBROWN9KRg,SEA:LotX,SEASHELL//Xu,SIENNAoFIt,SILVERwMDA,SKY;h87r,SLATE;alrN,SLATEGRAYcICQ,SNOW//r6,SPRING:AP9/,STEEL;RoK0,TAN0rSM,TEALAICA,THISTLE2L/Y,TOMATO/2NH,@QODQ,VIOLET7oLu,WHEAT9d6z,WHITE////,WHITESMOKE9fX1,YELLOW//8A,YELLOW:ms0y';
        for(var m of defs.split(',')){var x=/^(.+)(.{4})$/.exec(m);if(!x)continue;var y=atob(x[2]),z=x[1];var a=y.charCodeAt(0),b=y.charCodeAt(1),c=y.charCodeAt(2);for(var i=0;i<s.length;i++)z=z.replace(String.fromCharCode(58+i),s[i]);if(colour.toUpperCase()==z){colour='#'+(a<16?'0':'')+a.toString(16)+(b<16?'0':'')+b.toString(16)+(c<16?'0':'')+c.toString(16);break;}}
    }

    var rgb: ColourParts = {red: null, green: null, blue: null, hue: null, saturation: null, light: null, alpha: null};
    var resRGB = /^rgb(a?)\((\d+%?),\s*(\d+%?),\s*(\d+%?)(?:,\s*(\d+%?|\d*\.\d+|\d+\.\d*))?\)$/.exec(colour);
    if (resRGB) {
        rgb.red = Math.round(parseInt(resRGB[2], 10) * (resRGB[2].indexOf('%') == -1 ? 1 : 2.55));
        rgb.green = Math.round(parseInt(resRGB[3], 10) * (resRGB[3].indexOf('%') == -1 ? 1 : 2.55));
        rgb.blue = Math.round(parseInt(resRGB[4], 10) * (resRGB[4].indexOf('%') == -1 ? 1 : 2.55));
        if (resRGB[1] == 'a') rgb.alpha = parseFloat(resRGB[5]) / (resRGB[5].indexOf('%') == -1 ? 1 : 100);
    }
    var resHSL = /^hsl(a?)\((\d+),\s*(\d+)%,\s*(\d+)%(?:,\s*(\d+%?|\d*\.\d+|\d+\.\d*))?\)$/.exec(colour);
    if (resHSL) {
        rgb.hue = parseInt(resHSL[2], 10);
        rgb.saturation = parseInt(resHSL[3], 10);
        rgb.light = parseInt(resHSL[4], 10);
        if (resHSL[1] == 'a') rgb.alpha = parseFloat(resHSL[5]) / (resHSL[5].indexOf('%') == -1 ? 1 : 100);
    }
    var resHex8 = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(colour);
    if (resHex8) {
        rgb.red = parseInt(resHex8[1], 16);
        rgb.green = parseInt(resHex8[2], 16);
        rgb.blue = parseInt(resHex8[3], 16);
        rgb.alpha = parseInt(resHex8[4], 16) / 255;
    }
    var resHex6 = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(colour);
    if (resHex6) {
        rgb.red = parseInt(resHex6[1], 16);
        rgb.green = parseInt(resHex6[2], 16);
        rgb.blue = parseInt(resHex6[3], 16);
    }
    var resHex3 = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(colour);
    if (resHex3) {
        rgb.red = parseInt(resHex3[1] + resHex3[1], 16);
        rgb.green = parseInt(resHex3[2] + resHex3[2], 16);
        rgb.blue = parseInt(resHex3[3] + resHex3[3], 16);
    }
    return rgb;
}

/**
 * Returns whether the object is a string
 * @param obj
 * @returns
 */
export function isStr(obj: any): boolean {
    return typeof obj === 'string' || obj instanceof String;
}

/**
 * Returns whether the object is a number
 * @param obj
 * @returns
 */
 export function isNum(obj: any): boolean {
    return !Array.isArray(obj) && (obj - parseFloat(obj) + 1) >= 0;
}

/**
 * Returns whether the object is a node
 * @param obj
 * @returns
 */
export function isNode(obj: any): boolean {
    return (
        typeof Node === "object" ? obj instanceof Node :
        obj && typeof obj === "object" && typeof obj.nodeType === "number" && typeof obj.nodeName==="string"
    );
}

/**
 * Returns whether the object is an element
 * @param obj
 * @returns
 */
export function isElement(obj: any): boolean {
    return (
        typeof HTMLElement === "object" ? obj instanceof HTMLElement : //DOM2
        obj && typeof obj === "object" && obj !== null && obj.nodeType === 1 && typeof obj.nodeName==="string"
    );
}

/**
 * Returns get parameters, if present
 * @param parameterName the parameter name
 * @returns the value of the parameter, or null if not present
 */
export function findGetParameter(parameterName: string): string | null {
    var result = null;
    var pairs = location.search.substr(1).split("&");
    pairs.forEach(function (item) {
        var tmp = item.split("=");
        if (tmp[0] === parameterName) result = decodeURIComponent(tmp[1]);
    });
    return result;
}
export let getParam: (parameterName: string) => string | null = findGetParameter;
