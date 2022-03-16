/**
 * EZElement class & html template string tag
 */

// Inspired from TS typedef lib.dom.d.ts of Element.querySelector
type QuerySelectorMethod = <E extends HTMLElement = HTMLElement>(selectors: string) => E | null;

// Inspired from TS typedef lib.dom.d.ts of Element.querySelectorAll
type QuerySelectorAllMethod = <E extends HTMLElement = HTMLElement>(selectors: string) => NodeListOf<E>;

// Inspired from TS typedef lib.dom.d.ts of Document.getElementById
// Use Element instead of HTMLElement to maintain consistency with QuerySelectorAllMethod & QuerySelectorMethod
type GetElementByIdMethod = <E extends HTMLElement = HTMLElement>(elementId: string) => E | null;



type BlankEZElement = EZElement<DefaultObject, DefaultObject>;
type ElementDB = {
  [uuid: string]: BlankEZElement
};

type EventListenerStore = { [name: string]: EventListener };
type DefaultObject = Record<string, any>;

// Override TemplateStringsArray so it can be seen as an array by Typescript
type RealTemplateStringsArray = TemplateStringsArray & Array<string>;
export type Renderable =
  string
  | HTMLElement
  | HTMLElement[]
  | RealTemplateStringsArray
  | [strings: string[], ...args: any[]];

export enum LogLevel {
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
const ELEMENT_TO_EVENT_LISTENER = new WeakMap<BlankEZElement, EventListenerStore>();

export default class EZElement<Props extends DefaultObject = DefaultObject, State extends DefaultObject = DefaultObject> extends HTMLElement {
  private originalChildren: string;
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

  public state: State | DefaultObject;
  public props: Props | DefaultObject;

  public logLevel: LogLevel = LogLevel.None;

  // @ts-ignore
  constructor(props: Props = {}, state: State = {}) {
    super();
    this.originalChildren = this.innerHTML;
    log.all(this.logLevel, 'constructor', state, this);

    this.props = {...props};

    // Set props
    if (this.attributes.length) {
      for (let i = this.attributes.length - 1; i >= 0; i--) {
        const attribute = this.attributes[i];
        const match = attribute.value.match(/__get_method_handler\('(.+)', '(.+)'\)\(/) as ([string, string, string] | null);
        if (match && match.length) {
          const [_, elementUUID, listenerName] = match;
          // @ts-ignore
          this.props[attribute.name] = window.__get_method_handler(elementUUID, listenerName);
        } else {
          // @ts-ignore
          this.props[attribute.name] = attribute.value;
        }
      }
    }

    // Set state
    if (state) {
      this.state = this.linkStateToAttributes(this, state);
    } else {
      this.state = {};
    }


    // If we want to do rendering, attach a shadow root
    if (this.render && typeof this.render === 'function') {
      this.attachShadow({mode: 'open'});
    }

    const count = EZElement.__count[this.tagName] ?? 0;
    this.__uuid = `${this.tagName}__${count}`;
    EZElement.__count[this.tagName] = count + 1;
  }

  private _querySelector:QuerySelectorMethod | undefined;
  // @ts-ignore: TS complains about this method already existing. We are overriding it, its want we want.
  get querySelector():QuerySelectorMethod {
    if(!this._querySelector){
        this._querySelector = this.shadowRoot?.querySelector.bind(this.shadowRoot) ||
            this.querySelector ||
            document.querySelector;
    }

    return this._querySelector;
  }

  private _querySelectorAll:QuerySelectorAllMethod | undefined;
  // @ts-ignore: TS complains about this method already existing. We are overriding it, its want we want.
  get querySelectorAll():QuerySelectorAllMethod {
    if(!this._querySelectorAll){
        this._querySelectorAll = this.shadowRoot?.querySelectorAll.bind(this.shadowRoot) ||
            this.querySelectorAll ||
            document.querySelectorAll;
    }

    return this._querySelectorAll;
  }

  private _getElementById:GetElementByIdMethod | undefined;
  //
  // @ts-ignore: TS complains about this method already existing. We are overriding it, its want we want.
  get getElementById():GetElementByIdMethod {
    if(!this._getElementById){
        // @ts-ignore: Prevent complains about GetElementByIdMethod E not matching because it could be a subtype of HTMLElement (which fit the implementation, the official type definition is wrong)
        this._getElementById = this.shadowRoot?.getElementById.bind(this.shadowRoot) ||
            this.getElementById ||
            document.getElementById;
    }

    return this._getElementById as GetElementByIdMethod;
  }

  // Return a Selection object regardless if we use shadowroot or not (important on firefox vs chrome)
  public getSelection(): Selection {
    // @ts-ignore: ShadowRoot has a getSelection method on Chrome but not on Firefox
    return this.shadowRoot?.getSelection
      // @ts-ignore: ShadowRoot has a getSelection method on Chrome but not on Firefox
      ? this.shadowRoot?.getSelection()
      // Note: Firefox getSelection always give you the right element, Chrome will give back 'body' if the element is in a shadowroot
      : window.getSelection();
  }

  // Shadow dom callbacks
  attributeChangedCallback() {
    log.all(this.logLevel, 'attributeChangedCallback');
    this.renderNextFrame();
  }

  // Meant to be overridden
  protected onLoad(): void {
    log.all(this.logLevel, 'onload');
  }

  protected render(children?:string | Renderable): Renderable {
    log.all(this.logLevel, 'render');
    return '';
  }

  private renderNextFrame() {
    log.all(this.logLevel, 'renderNextFrame');
    if (this.shadowRoot && !this.animationFrameRequest) {
      const shadowRoot = this.shadowRoot;

      this.animationFrameRequest = requestAnimationFrame(() => {
        const ui: Renderable = this.render(this.originalChildren);

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

  linkStateToAttributes(element: EZElement<Props, State>, state: State): State {
    type StateDescriptor = Record<keyof State, PropertyDescriptor>;

    log.all(this.logLevel, 'linkStateToAttributes');
    // Create a state object that will automatically set attributes & update the element
    // While preventing conversion to string when using state directly
    const properties = Object
      .keys(state)
      .reduce((acc: StateDescriptor, key: keyof State) => {
        const stringKey = `${key}`;
        acc[key] = {
          get() {
            return element.getState(key as keyof State);
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
window.__get_method_handler = (elementUUID: string, listenerName: string): VoidFunction | EventListener => {
  // Find the element associated with elementUUID
  const element = ELEMENT_DB[elementUUID];

  if (!ELEMENT_TO_EVENT_LISTENER.has(element)) {
    throw new Error(`Can't find eventHandlers for element ${element} (${JSON.stringify({
      elementUUID,
      listenerName
    })})"`);
  }

  // Find event listener associated with both elementUUID & listenerName
  const eventHandlers: EventListenerStore = ELEMENT_TO_EVENT_LISTENER.get(element) ?? {};
  const listener = eventHandlers?.[listenerName];
  if (!listener) {
    throw new Error(`Can't find handler ${listenerName} in ${eventHandlers}"`);
  }

  return listener.bind(element);
};

/**
 * Save references to methods passed as arguments to remove the use of `bind` or `=>` to preserve context
 * Any method passes to html will have a `this` equal to the element argument
 */
export const html = (element: BlankEZElement) => (strings: TemplateStringsArray, ...args: any[]): [strings: TemplateStringsArray, ...args: any[]] => {
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
   * Change the HTML to call the method using the new reference (using `window.__get_method_handler`).
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

    // Save the method aside to reference it later
    // We have to use a new lookup table (instead of using element) so we can support anonymous methods
    eventListeners[method.name] = method;

    // `event` is magically present when creating even handlers in html
    // `arg.name` is used to reference the handler method when the event is triggered
    const htmlCallback = `window.__get_method_handler('${element.__uuid}', '${method.name}')(event)`;
    log.debug(element.logLevel, 'html', 'methodName', method.name);

    return htmlCallback;
  });

  return [strings, ...parsedArgs];
}
