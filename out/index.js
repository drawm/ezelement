var LogLevel;
(function(LogLevel1) {
    LogLevel1[LogLevel1["None"] = 0] = "None";
    LogLevel1[LogLevel1["All"] = 1] = "All";
    LogLevel1[LogLevel1["Debug"] = 3] = "Debug";
})(LogLevel || (LogLevel = {
}));
const log = {
    debug (debug, ...args) {
        if (debug >= LogLevel.Debug) console.debug(...args);
    },
    all (debug, ...args) {
        if (debug >= LogLevel.All) console.log(...args);
    }
};
const ELEMENT_DB = {
};
const ELEMENT_TO_EVENT_LISTENER = new WeakMap();
class EZElement extends HTMLElement {
    get shadowRoot() {
        return super.shadowRoot;
    }
    static __count = {
    };
    animationFrameRequest = 0;
    __state;
    __initialState;
    __anonymousFunctionsCount = 0;
    __anonymousFunctions = new Set();
    __uuid;
    state;
    logLevel = LogLevel.None;
    constructor(state1 = {
    }){
        super();
        log.all(this.logLevel, 'constructor', state1);
        this.state = this.linkStateToAttributes(this, state1);
        if (this.render && typeof this.render === 'function') {
            this.attachShadow({
                mode: 'open'
            });
        }
        const count = EZElement.__count[this.tagName] ?? 0;
        this.__uuid = `${this.tagName}__${count}`;
        EZElement.__count[this.tagName] = count + 1;
    }
    querySelector(elementId) {
        return this.shadowRoot?.querySelector(elementId) ?? null;
    }
    querySelectorAll(selectors) {
        return this.shadowRoot?.querySelectorAll(selectors) ?? new NodeList();
    }
    getElementById(elementId) {
        return this.shadowRoot?.getElementById(elementId) ?? null;
    }
    attributeChangedCallback() {
        log.all(this.logLevel, 'attributeChangedCallback');
        this.renderNextFrame();
    }
    render(delta) {
        log.all(this.logLevel, 'render', delta);
        return '';
    }
    renderNextFrame() {
        log.all(this.logLevel, 'renderNextFrame');
        if (this.shadowRoot && !this.animationFrameRequest) {
            const shadowRoot = this.shadowRoot;
            this.animationFrameRequest = requestAnimationFrame((delta)=>{
                const ui = this.render(delta);
                if (typeof ui === 'string') {
                    shadowRoot.innerHTML = ui;
                } else if (Array.isArray(ui)) {
                    if (Array.isArray(ui[0])) {
                        const [strings, ...parsedArgs] = ui;
                        shadowRoot.innerHTML = strings.map((string)=>string + (parsedArgs?.shift() ?? '')
                        ).join('');
                    } else {
                        while(shadowRoot.lastChild){
                            shadowRoot.removeChild(shadowRoot.lastChild);
                        }
                        shadowRoot.append(...ui);
                    }
                } else {
                    shadowRoot.appendChild(ui);
                }
                this.animationFrameRequest = 0;
            });
        }
    }
    disconnectedCallback() {
        log.all(this.logLevel, 'disconnectedCallback');
        if (this.animationFrameRequest) {
            cancelAnimationFrame(this.animationFrameRequest);
            this.animationFrameRequest = 0;
        }
        delete ELEMENT_DB[this.__uuid];
        if (ELEMENT_TO_EVENT_LISTENER.has(this)) {
            const eventHandlers = ELEMENT_TO_EVENT_LISTENER.get(this) ?? {
            };
            for(var key in eventHandlers){
                if (eventHandlers.hasOwnProperty(key)) {
                    delete eventHandlers[key];
                }
            }
            ELEMENT_TO_EVENT_LISTENER.delete(this);
        }
    }
    connectedCallback() {
        log.all(this.logLevel, 'connectedCallback');
        this.setDefaultStateValues();
        this.renderNextFrame();
        ELEMENT_DB[this.__uuid] = this;
    }
    setState(name, value) {
        log.all(this.logLevel, 'setState');
        this.__state[name] = value;
        this.renderNextFrame();
    }
    getState(name) {
        log.all(this.logLevel, 'getState');
        return this.__state[name];
    }
    setDefaultStateValues() {
        log.all(this.logLevel, 'setDefaultStateValues');
        if (this.state?.__initialState) {
            Object.keys(this.state.__initialState).forEach((attribute)=>{
                if (!this.state.hasOwnProperty(attribute)) {
                    this.setState(attribute, this.state.__initialState[attribute]);
                }
            });
        }
    }
    linkStateToAttributes(element, state) {
        log.all(this.logLevel, 'linkStateToAttributes');
        const properties = Object.keys(state).reduce((acc, key)=>{
            acc[key] = {
                get () {
                    return element.getState(key);
                },
                set (value) {
                    element.setState(key, value);
                }
            };
            return acc;
        }, {
        });
        const newState = Object.defineProperties({
        }, properties);
        this.__state = {
            ...state
        };
        this.__initialState = {
            ...state
        };
        return newState;
    }
}
window.__invokeEventHandler = (event, elementUUID, listenerName)=>{
    const element = ELEMENT_DB[elementUUID];
    if (!ELEMENT_TO_EVENT_LISTENER.has(element)) {
        throw new Error(`Can't find eventHandlers for element ${element}"`);
    }
    const eventHandlers = ELEMENT_TO_EVENT_LISTENER.get(element) ?? {
    };
    const listener = eventHandlers?.[listenerName];
    if (!listener) {
        throw new Error(`Can't find handler ${listenerName} in ${eventHandlers}"`);
    }
    listener.call(element, event);
};
const html1 = (element)=>(strings, ...args)=>{
        log.all(element.logLevel, 'rendering html');
        log.debug(element.logLevel, 'html', strings, args);
        let eventListeners = {
        };
        if (!ELEMENT_TO_EVENT_LISTENER.has(element)) {
            ELEMENT_TO_EVENT_LISTENER.set(element, eventListeners);
        } else {
            eventListeners = ELEMENT_TO_EVENT_LISTENER.get(element) ?? {
            };
        }
        log.debug(element.logLevel, 'html', 'eventListeners', eventListeners);
        if (element.__anonymousFunctions.size) {
            for (let methodName of element.__anonymousFunctions){
                if (eventListeners[methodName]) {
                    delete eventListeners[methodName];
                }
            }
            element.__anonymousFunctions.clear();
            element.__anonymousFunctionsCount = 0;
        }
        const parsedArgs = args.map((method)=>{
            log.debug(element.logLevel, 'html', 'method', method);
            if (Array.isArray(method)) {
                return method.join('');
            }
            if (typeof method !== 'function') {
                return method;
            }
            if (method.name) {
                if (eventListeners[method.name]) {
                    delete eventListeners[method.name];
                }
            } else {
                element.__anonymousFunctionsCount++;
                const newMethodName = `${element.__uuid}_${element.__anonymousFunctionsCount}`;
                element.__anonymousFunctions.add(newMethodName);
                Object.defineProperty(method, 'name', {
                    value: newMethodName
                });
            }
            log.debug(element.logLevel, 'html', 'methodName', method.name);
            eventListeners[method.name] = method;
            const htmlCallback = `window.__invokeEventHandler(event, '${element.__uuid}', '${method.name}')`;
            log.debug(element.logLevel, 'html', 'methodName', method.name);
            return htmlCallback;
        });
        return [
            strings,
            ...parsedArgs
        ];
    }
;
export { html1 as html };
function template1(strings, ...values) {
    if (Array.isArray(strings[0])) {
        [strings, ...values] = strings;
    }
    let acc = '';
    for(let i = 0; i < strings.length; i++){
        acc += strings[i];
        if (Array.isArray(values[i])) {
            acc += values[i].map((value)=>value ?? ''
            ).join('');
        } else {
            acc += values[i] ?? '';
        }
    }
    return acc;
}
function print1(text, defaultText = '') {
    return !!text ? text : defaultText;
}
const loop1 = (list, callback)=>{
    let acc = '';
    const state2 = {
        isFirst: true,
        isLast: false
    };
    for(let i = 0; i < list.length; i++){
        const item = list[i];
        state2.isLast = i === list.length - 1;
        acc += callback(item, state2);
        state2.isFirst = false;
    }
    return acc;
};
export { EZElement as default };
export { template1 as template };
export { print1 as print };
export { loop1 as loop };
