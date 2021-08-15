type Renderable = string | HTMLElement | HTMLElement[] | [strings: string[], ...args: any[]]
type ElementDB = {
  [uuid: string]: EZElement
}
type EventListenerStore = { [name: string]: EventListener };
type DefaultState = Record<string, any>;

enum LogLevel {
  None = 0,
  All = 1,
  Debug = 3,
}

const log = {
  debug(debug: LogLevel, ...args: any[]): void {
    if (debug >= LogLevel.Debug) console.debug(...args);
  },
  all(debug: LogLevel, ...args: any[]): void {
    if (debug >= LogLevel.All) console.log(...args);
  }
}

const ELEMENT_DB: ElementDB = {};
const ELEMENT_TO_EVENT_LISTENER = new WeakMap<EZElement, EventListenerStore>();


export default class EZElement<State extends DefaultState = any> extends HTMLElement {
  public get shadowRoot(): ShadowRoot | null {
    return super.shadowRoot;
  }

  private static __count: { [tagName: string]: number } = {};

  private animationFrameRequest: number = 0;

  // @ts-ignore is defined in the constructor
  private __state: State;
  // @ts-ignore is defined in the constructor
  private __initialState: State;

  public __anonymousFunctionsCount: number = 0;
  public __anonymousFunctions: Set<string> = new Set<string>();
  public __uuid: string;

  public state: State;
  public logLevel: LogLevel = LogLevel.None;


  // @ts-ignore
  constructor(state: State = {}) {
    super();
    log.all(this.logLevel, 'constructor', state);

    this.state = this.linkStateToAttributes(this, state);

    // If we want to do rendering, attach a shadow root
    if (this.render && typeof this.render === 'function') {
      this.attachShadow({mode: 'open'});
    }

    const count = EZElement.__count[this.tagName] ?? 0;
    this.__uuid = `${this.tagName}__${count}`;
    EZElement.__count[this.tagName] = count + 1;
  }

  public querySelector<K extends keyof HTMLElementTagNameMap>(selectors: K): HTMLElementTagNameMap[K] | null;
  public querySelector<K extends keyof SVGElementTagNameMap>(selectors: K): SVGElementTagNameMap[K] | null;
  public querySelector<E extends Element = Element>(elementId: string): E | null {
    return this.shadowRoot?.querySelector(elementId) ?? null;
  }

  public querySelectorAll<K extends keyof HTMLElementTagNameMap>(selectors: K): NodeListOf<HTMLElementTagNameMap[K]>;
  public querySelectorAll<K extends keyof SVGElementTagNameMap>(selectors: K): NodeListOf<SVGElementTagNameMap[K]>;
  public querySelectorAll<E extends Element = Element>(selectors: string): NodeListOf<E> {
    return this.shadowRoot?.querySelectorAll(selectors) ?? (new NodeList() as NodeListOf<E>);
  }

  public getElementById(elementId: string): Element | null;
  public getElementById(elementId: string): HTMLElement | null {
    return this.shadowRoot?.getElementById(elementId) ?? null;
  }

  // Shadow dom callbacks
  attributeChangedCallback() {
    log.all(this.logLevel, 'attributeChangedCallback');
    this.renderNextFrame();
  }

  // Meant to be overridden
  protected render(delta: number): Renderable {
    log.all(this.logLevel, 'render', delta);
    return '';
  }

  private renderNextFrame() {
    log.all(this.logLevel, 'renderNextFrame');
    if (this.shadowRoot && !this.animationFrameRequest) {
      const shadowRoot = this.shadowRoot;

      this.animationFrameRequest = requestAnimationFrame((delta: number) => {
        const ui: Renderable = this.render(delta);

        // Simple string, let the browser parse it
        if (typeof ui === 'string') {
          shadowRoot.innerHTML = ui;

          // Might be a list of nodes or a template literal-like structure (string[], ...args:any[])
        } else if (Array.isArray(ui)) {

          // Good chance this is a template literal-like structure, convert it to a string first
          if (Array.isArray(ui[0])) {
            const [strings, ...parsedArgs] = ui;
            shadowRoot.innerHTML = strings.map(string => (
              string + (parsedArgs?.shift() ?? '')
            )).join('');

          // Assume any other array structure is a list of html nodes
          } else {
            // Remove all nodes, before we can add more
            while (shadowRoot.lastChild) {
              shadowRoot.removeChild(shadowRoot.lastChild);
            }

            shadowRoot.append(...ui);
          }
          // Add new nodes
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
      const eventHandlers: EventListenerStore = ELEMENT_TO_EVENT_LISTENER.get(this) ?? {};
      for (var key in eventHandlers) {
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

  // adoptedCallback(...args) {
  // }

  // Extend get&set attribute to sync with state
  // This enables us to call attributeChangedCallback automatically &
  // maintain types when using state directly
  private setState(name: keyof State, value: any) {
    log.all(this.logLevel, 'setState');
    this.__state[name] = value;
    this.renderNextFrame();
  }

  private getState(name: keyof State): any {
    log.all(this.logLevel, 'getState');
    return this.__state[name];
  }

  setDefaultStateValues() {
    log.all(this.logLevel, 'setDefaultStateValues');
    if (this.state?.__initialState) {
      Object
        .keys(this.state.__initialState)
        .forEach((attribute) => {
          if (!this.state.hasOwnProperty(attribute)) {
            this.setState(attribute, this.state.__initialState[attribute]);
          }
        })
    }
  }

  linkStateToAttributes(element: EZElement<State>, state: State): State {
    type StateDescriptor = Record<keyof State, PropertyDescriptor>;

    log.all(this.logLevel, 'linkStateToAttributes');
    // Create a state object that will automatically set attributes & update the element
    // While preventing conversion to string when using state directly
    const properties = Object
      .keys(state)
      .reduce((acc: StateDescriptor, key: keyof State) => {
        acc[key] = {
          get() {
            return element.getState(key);
          },
          set(value: any) {
            element.setState(key, value);
          },
        };
        return acc;
      }, {} as StateDescriptor);

    const newState: State = Object.defineProperties({}, properties) as State;

    this.__state = {...state};
    this.__initialState = {...state};
    return newState;
  }
}

/**
 * `invoke` use a ref for element & method to keep weak link to methods to enable
 * GC to free them when needed without the need to do it manually
 * Elements can easily be freed in base class, so we can use a plain old object
 */
window.__invokeEventHandler = (event: Event, elementUUID: string, listenerName: string) => {
  // Find the element associated with elementUUID
  const element = ELEMENT_DB[elementUUID];

  if (!ELEMENT_TO_EVENT_LISTENER.has(element)) {
    throw new Error(`Can't find eventHandlers for element ${element}"`);
  }

  // Find event listener associated with both elementUUID & listenerName
  const eventHandlers: EventListenerStore = ELEMENT_TO_EVENT_LISTENER.get(element) ?? {};
  const listener = eventHandlers?.[listenerName];
  if (!listener) {
    throw new Error(`Can't find handler ${listenerName} in ${eventHandlers}"`);
  }

  // Call the event handler with its host element as its context
  listener.call(element, event);
};

/**
 * Save references to methods passed as arguments to remove the use of `bind` or `=>` to preserve context
 * Any method passes to html will have a `this` equal to the element argument
 */
export const html = (element: EZElement) => (strings: string[], ...args: any[]): [strings: string[], ...args: any[]] => {
  log.all(element.logLevel, 'rendering html');
  log.debug(element.logLevel, 'html', strings, args);

  let eventListeners: EventListenerStore = {};
  if (!ELEMENT_TO_EVENT_LISTENER.has(element)) {
    ELEMENT_TO_EVENT_LISTENER.set(element, eventListeners);
  } else {
    // TODO: Free and create new event handler
    // (
    //   Try to re-use maybe?
    //   Save new events, and free those who were not added this time
    // )
    eventListeners = ELEMENT_TO_EVENT_LISTENER.get(element) ?? {};
  }
  log.debug(element.logLevel, 'html', 'eventListeners', eventListeners);

  // Clear reference to old anonymous function, they are probably gone anyway
  if (element.__anonymousFunctions.size) {
    for (let methodName of element.__anonymousFunctions) {
      if (eventListeners[methodName]) {
        delete eventListeners[methodName];
      }
    }
    element.__anonymousFunctions.clear()
    element.__anonymousFunctionsCount = 0;
  }

  /**
   * Save a reference to each callback and its HtmlElement
   * Change the HTML to call the method using the new reference (using `window.__invokeEventHandler`).
   * This makes writing HTML easier as you don't have to bind manually (the scope is always the HtmlElement).
   * It also doesn't waste memory creating new functions using bing or fat arrow
   */
  const parsedArgs = args.map(method => {
    log.debug(element.logLevel, 'html', 'method', method);

    if (Array.isArray(method)) {
      return method.join('');
    }

    // If arg is not a function, simply render it as a string
    if (typeof method !== 'function') {
      return method;
    }

    // Delete reference to old methods
    if (method.name) {
      // (might be useless assuming the same name also means the same instance)
      if (eventListeners[method.name]) {
        delete eventListeners[method.name];
      }

      // Method is anonymous, give it a name to prevent collisions and make it free-able later
    } else {
      // Mark it for deletion during next render
      element.__anonymousFunctionsCount++;

      // Create new function name
      const newMethodName = `${element.__uuid}_${element.__anonymousFunctionsCount}`;
      element.__anonymousFunctions.add(newMethodName);
      // Has to use defineProperty as its read-only
      // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/name#inferred_function_names
      Object.defineProperty(method, 'name', {value: newMethodName});
    }

    log.debug(element.logLevel, 'html', 'methodName', method.name);

    // Save the method aside so we can refer to it later.
    // We have to use a new lookup table (instead of using element) so we can support anonymous methods
    eventListeners[method.name] = method;

    // `event` is magically present when creating even handlers in html
    // `arg.name` is used to reference the handler method when the event is triggered
    const htmlCallback = `window.__invokeEventHandler(event, '${element.__uuid}', '${method.name}')`;
    log.debug(element.logLevel, 'html', 'methodName', method.name);

    return htmlCallback;
  });

  return [strings, ...parsedArgs];
}