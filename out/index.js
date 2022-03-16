// deno-fmt-ignore-file
// deno-lint-ignore-file
// This code was bundled using `deno bundle` and it's not recommended to edit it manually

var LogLevel;
(function(LogLevel1) {
    LogLevel1[LogLevel1["None"] = 0] = "None";
    LogLevel1[LogLevel1["All"] = 1] = "All";
    LogLevel1[LogLevel1["Debug"] = 3] = "Debug";
})(LogLevel || (LogLevel = {}));
const log = {
    debug (debug, ...args) {
        if (debug >= LogLevel.Debug) console.debug(...args);
    },
    all (debug, ...args) {
        if (debug >= LogLevel.All) console.log(...args);
    }
};
const ELEMENT_DB = {};
const ELEMENT_TO_EVENT_LISTENER = new WeakMap();
class EZElement extends HTMLElement {
    originalChildren;
    get shadowRoot() {
        return super.shadowRoot;
    }
    static __count = {};
    animationFrameRequest = 0;
    __state;
    __initialState;
    __anonymousFunctionsCount = 0;
    __anonymousFunctions = new Set();
    __uuid;
    state;
    props;
    logLevel = LogLevel.None;
    constructor(props = {}, state = {}){
        super();
        this.originalChildren = this.innerHTML;
        log.all(this.logLevel, 'constructor', state, this);
        this.props = {
            ...props
        };
        if (this.attributes.length) {
            for(let i = this.attributes.length - 1; i >= 0; i--){
                const attribute = this.attributes[i];
                const match = attribute.value.match(/__get_method_handler\('(.+)', '(.+)'\)\(/);
                if (match && match.length) {
                    const [_, elementUUID, listenerName] = match;
                    this.props[attribute.name] = window.__get_method_handler(elementUUID, listenerName);
                } else {
                    this.props[attribute.name] = attribute.value;
                }
            }
        }
        if (state) {
            this.state = this.linkStateToAttributes(this, state);
        } else {
            this.state = {};
        }
        if (this.render && typeof this.render === 'function') {
            this.attachShadow({
                mode: 'open'
            });
        }
        const count = EZElement.__count[this.tagName] ?? 0;
        this.__uuid = `${this.tagName}__${count}`;
        EZElement.__count[this.tagName] = count + 1;
    }
    _querySelector;
    get querySelector() {
        if (!this._querySelector) {
            this._querySelector = this.shadowRoot?.querySelector.bind(this.shadowRoot) || this.querySelector || document.querySelector;
        }
        return this._querySelector;
    }
    _querySelectorAll;
    get querySelectorAll() {
        if (!this._querySelectorAll) {
            this._querySelectorAll = this.shadowRoot?.querySelectorAll.bind(this.shadowRoot) || this.querySelectorAll || document.querySelectorAll;
        }
        return this._querySelectorAll;
    }
    _getElementById;
    get getElementById() {
        if (!this._getElementById) {
            this._getElementById = this.shadowRoot?.getElementById.bind(this.shadowRoot) || this.getElementById || document.getElementById;
        }
        return this._getElementById;
    }
    getSelection() {
        return this.shadowRoot?.getSelection ? this.shadowRoot?.getSelection() : window.getSelection();
    }
    attributeChangedCallback() {
        log.all(this.logLevel, 'attributeChangedCallback');
        this.renderNextFrame();
    }
    onLoad() {
        log.all(this.logLevel, 'onload');
    }
    render(children) {
        log.all(this.logLevel, 'render');
        return '';
    }
    renderNextFrame() {
        log.all(this.logLevel, 'renderNextFrame');
        if (this.shadowRoot && !this.animationFrameRequest) {
            const shadowRoot = this.shadowRoot;
            this.animationFrameRequest = requestAnimationFrame(()=>{
                const ui = this.render(this.originalChildren);
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
                this.onLoad();
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
            const eventHandlers = ELEMENT_TO_EVENT_LISTENER.get(this) ?? {};
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
            `${key}`;
            acc[key] = {
                get () {
                    return element.getState(key);
                },
                set (value) {
                    element.setState(key, value);
                }
            };
            return acc;
        }, {});
        const newState = Object.defineProperties({}, properties);
        this.__state = {
            ...state
        };
        this.__initialState = {
            ...state
        };
        return newState;
    }
}
window.__get_method_handler = (elementUUID, listenerName)=>{
    const element = ELEMENT_DB[elementUUID];
    if (!ELEMENT_TO_EVENT_LISTENER.has(element)) {
        throw new Error(`Can't find eventHandlers for element ${element} (${JSON.stringify({
            elementUUID,
            listenerName
        })})"`);
    }
    const eventHandlers = ELEMENT_TO_EVENT_LISTENER.get(element) ?? {};
    const listener = eventHandlers?.[listenerName];
    if (!listener) {
        throw new Error(`Can't find handler ${listenerName} in ${eventHandlers}"`);
    }
    return listener.bind(element);
};
const html = (element)=>(strings, ...args)=>{
        log.all(element.logLevel, 'rendering html');
        log.debug(element.logLevel, 'html', strings, args);
        let eventListeners = {};
        if (!ELEMENT_TO_EVENT_LISTENER.has(element)) {
            ELEMENT_TO_EVENT_LISTENER.set(element, eventListeners);
        } else {
            eventListeners = ELEMENT_TO_EVENT_LISTENER.get(element) ?? {};
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
            const htmlCallback = `window.__get_method_handler('${element.__uuid}', '${method.name}')(event)`;
            log.debug(element.logLevel, 'html', 'methodName', method.name);
            return htmlCallback;
        });
        return [
            strings,
            ...parsedArgs
        ];
    }
;
export { LogLevel as LogLevel };
export { html as html };
export { EZElement as default };
