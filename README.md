EZ Element
===
---
> Custom elements made easy
---

EZ Element is a no-dependency, easy to grasp, custom element helper. Its goal is to makes working with custom elements
easy enough you reconsider using other library (ie: React, Vue & friends)

Based on the same principles of [contemplating](https://github.com/drawm/contemplating/)

* [Deno](https://deno.land/x/ezelement)
* [NPM](https://www.npmjs.com/package/ezelement)

# Usage

For more examples, check the [examples/](examples/ folder) in the repo.

## Smallest example

1. Create your custom element class & extend `EZElement`
2. Add a `render` method to generate a string of `html`
3. Register your new element and use it in your HTML

```html

<script type="module">
  import EZElement, {html} from "../out/index.js";

  customElements.define('hello-world', class extends EZElement {
    render() {
      return '<span>Hello World</span>'
    }
  });
</script>

<hello-world></hello-world>
```

```html
<span>Hello World</span>
```

## Attributes
You can specify a set of attributes who will re-render the component when changed.
Read [Using the life cycle callback article on MDN](https://developer.mozilla.org/en-US/docs/Web/Web_Components/Using_custom_elements#using_the_lifecycle_callbacks) to understand how it works internally.

All you need to do is:
1. Add a `static observedAttributes = ['an-attribute'];` with all the attributes you want to trigger a render
2. Use DOM [`getAttribute`](https://developer.mozilla.org/en-US/docs/Web/API/Element/getAttribute) & [`setAttribute`](https://developer.mozilla.org/en-US/docs/Web/API/Element/setAttribute) where you want to use the attributes

```html
<script type="module">
  import EZElement from "../out/index.js";

  customElements.define('hello-world', class extends EZElement {
    // Define the attributes you are listening for (this is required by custom element spec)
    static observedAttributes = ['name'];

    render() {
      // Use the attribute when rendering
      return `<span>Hello ${this.getAttribute('name')}</span>`
    }
  });
</script>

<!-- Need to be in a separate script tag so button onclick can reference to the onChangeName callback -->
<script type="application/javascript">
  const onChangeName = (event) => {
    const newName = document.getElementById('nameInput').value;

    // Will trigger a re-render of the component
    document.getElementById('greeting').setAttribute('name', newName);
  }
</script>

<hello-world id='greeting' name="w0r1d"></hello-world>
<input id='nameInput' type="text" value="w0r1d"/>
<button onclick="onChangeName()">Change name</button>
```

## State
Attributes are great but limited, using [`getAttribute`](https://developer.mozilla.org/en-US/docs/Web/API/Element/getAttribute) & [`setAttribute`](https://developer.mozilla.org/en-US/docs/Web/API/Element/setAttribute) can be overly verbose and they only work with strings!
Luckily EZElement provide a simple `state` object to automatically re-render when updated.

1. Pass an object to the parent constructor to use it as a state.
2. Edit the state property to your hearts content!

```html
<script type="module">
  import EZElement from "../out/index.js";

  customElements.define('hello-world', class extends EZElement {
    constructor() {
      // Will be available through `this.state`
      super({name: 'world'});
    }

    render() {
      // Use the attribute when rendering
      return `<span>Hello ${this.state.name}</span>`
    }
  });
</script>

<!-- Need to be in a separate script tag so button onclick can reference to the onChangeName callback -->
<script type="application/javascript">
  const onChangeName = (event) => {
    const newName = document.getElementById('nameInput').value;

    // Will trigger a re-render of the component
    document.getElementById('greeting').state.name = newName;
  }
</script>

<hello-world id='greeting'></hello-world>
<input id='nameInput' type="text" value="w0r1d"/>
<button onclick="onChangeName()">Change name</button>
```

## Events
Events requires are made easy with EZElement.
Simply use the `html` template  string to automatically wire function to your HTML.
As a bonus, they will be automatically wired to your element's scope so you can use any notation you like.

1. Use the `html` template string generate your HTML string
2. Add methods to your HTML

```html
<script type="module">
  import EZElement, {html} from "../out/index.js";

  customElements.define('hello-world', class extends EZElement {
    constructor() {
      super({name: 'world'});
    }

    render() {
      // Use the attribute when rendering
      return html(this)`
        <span>Hello ${this.state.name}</span>
        <input id='nameInput' type="text" value="${this.state.name}"/>
        <button onclick="${this.onChangeName}">Change name</button>
      `
    }

    onChangeName(event) {
      const newName = this.getElementById('nameInput').value;

      // Will trigger a re-render of the component
      this.state.name = newName;
    }
  });
</script>

<hello-world></hello-world>
```

## Advanced templating
For even better templating you can use [contemplating](https://github.com/drawm/contemplating/) in your `render` method.

```html
<script type="module">
  import EZElement, {html, template} from "../out/index.js";

  customElements.define('hello-world', class extends EZElement {
    constructor() {
      super({name: 'world, dev'});
    }

    render() {
      // Use the attribute when rendering
      return template(html(this)`
        <span>Enter names seperated with a comma (,)</span>
        <input id='nameInput' type="text" value="${this.state.name}"/>
        <button onclick="${this.onChangeName}">Change name</button>
        <ul>
          ${
            this.state.name
              .split(',')
              .map(name => `<li>Hello ${name.trim()}</li>`)
            }
         </ul>
      `);
    }

    onChangeName(event) {
      const newName = this.getElementById('nameInput').value;

      // Will trigger a re-render of the component
      this.state.name = newName;
    }
  });
</script>

<hello-world></hello-world>
```

# Features
* No over-rendering, EZElement will only render once per frame at most.
* JSX style templating & event callbacks without transpiling
* No binding or wrapping methods
* No dependencies
* Small codebase:
  * Fits in one file under 350 lines of Typescript code
  * Or under 225 transpiled non minified js code
  * Or 4KB, (~4000 characters) minified js code
