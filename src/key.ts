type callbackArr = {[index: string]: {[index: string]: {[index: string]: ((event: KeyboardEvent) => void)}}};

/**
 * Centralise key handler
 */
class KeyRegistry {
    callbacks: callbackArr = {
        'keydown': {},
        'keyup': {},
        'keypress': {}
    }

    constructor() {
        var me = this;
        window.addEventListener('keydown', me.key.bind(me, 'keydown'));
        window.addEventListener('keyup', me.key.bind(me, 'keyup'));
        window.addEventListener('keypress', me.key.bind(me, 'keypress'));
    }

    /**
     * Register a callback for a specific key.
     * @param what which event to respond for
     * @param key which key to respond for
     * @param callback which function to callback to
     * @returns A unique identifier for this listener
     */
    register(what: string, key: string, callback: (event: KeyboardEvent) => void) {
        var id = newID();
        if (!this.callbacks[what][key]) this.callbacks[what][key] = {};
        this.callbacks[what][key][id] = callback;
        return id;
    }

    /**
     * Stop listening for a keyboard event
     * @param id the identifier for the listener
     * @returns
     */
    deregister(id: string) {
        for (var w of Object.keys(this.callbacks)) {
            for (var k of Object.keys(this.callbacks[w])) {
                if (!this.callbacks[w][k][id]) continue;

                delete this.callbacks[w][k][id];
                if (Object.keys(this.callbacks[w][k]).length == 0) delete this.callbacks[w][k];
                return;
            }
        }
    }

    /**
     * Trigger callbacks for an event
     */
    key(which: string, event: KeyboardEvent) {
        if (!this.callbacks[which][event.key]) return;

        for (var id of Object.keys(this.callbacks[which][event.key])) {
            this.callbacks[which][event.key][id](event);
        }

        event.stopPropagation();
    }
}

/**
 * Singleton instance of the KeyRegistry
 */
export var KeyboardHandler = new KeyRegistry();

/**
 * Generates a new ID; not guaranteed to be unique
 * @returns
 */
export function newID(): string {
    var arr = new Uint8Array(4);
    window.crypto.getRandomValues(arr);
    return Array.from(arr, dec2hex).join('')
}

/**
 * Turn a decimal number into a two-character hex string.
 * @param dec
 * @returns
 */
function dec2hex(dec: number) {
    var str = dec.toString(16);
    return (str.length < 2 ? '0' : '') + str;
}
