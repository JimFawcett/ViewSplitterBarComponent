# Spec: ViewSplitterBarComponent

## Purpose

`<view-splitter-bar>` is a W3C custom element (Shadow DOM) that displays two adjacent panels separated by a narrow draggable splitter bar, with a draggable resizer bar along the bottom edge. Total component width is fixed; dragging the splitter redistributes width between panels. Dragging the resizer changes the height of both panels equally.

- **Drag splitter left** — left panel shrinks, right panel grows.
- **Drag splitter right** — right panel shrinks, left panel grows.
- **Drag resizer down** — both panels grow taller.
- **Drag resizer up** — both panels shrink, down to `min-height-px`.
- **Click in left panel** — left panel grows by one step, right panel shrinks by the same step.
- **Click in right panel** — right panel grows by one step, left panel shrinks by the same step.

Either panel may display text or code. Each panel accepts a slot that may hold a `<pre><code>` block with an optional `language` attribute for Prism styling.

---

## Element Registration

```js
customElements.define('view-splitter-bar', ViewSplitterBar);
```

---

## Attributes

| Attribute        | Type   | Default         | Description                                                        |
|------------------|--------|-----------------|--------------------------------------------------------------------|
| `width`          | string | `auto`          | Total component width (px or rem)                                  |
| `height`         | string | `auto`          | Initial panel height (px or rem); draggable after render           |
| `left-ratio`     | number | `0.5`           | Initial fraction of total width given to left panel                |
| `bar-width`      | string | `6px`           | Width of the vertical splitter and height of the bottom resizer    |
| `bar-color`      | string | `#888`          | Color of both the splitter and the resizer                         |
| `bg-color`       | string | `var(--light)`  | Background of both panels                                          |
| `color`          | string | `var(--dark)`   | Foreground (text) color of both panels                             |
| `overflow-x`     | string | `auto`          | `auto`, `scroll`, or `hidden` — applied to both panels             |
| `code-padding`   | string | `0.75rem 1rem`  | Padding inside each panel's code/text area                         |
| `highlight`      | string | (none)          | Set to `prism` to enable Prism.js highlighting                     |
| `step-px`        | number | `40`            | Pixels transferred per panel click                                 |
| `min-panel-px`   | number | `120`           | Minimum width in pixels for either panel                           |
| `min-height-px`  | number | `80`            | Minimum container height in pixels when dragging the resizer       |

---

## Shadow DOM Structure

```
:host (inline-flex, column direction)
├── div.container          ← flex row, border, box-shadow, explicit px height
│   ├── div.panel-left     ← flex: none, explicit px width
│   │   └── slot[name="left"]
│   ├── div.splitter       ← fixed bar-width, cursor: col-resize
│   └── div.panel-right    ← flex: 1, min-width: 0
│       └── slot[name="right"]
└── div.resizer            ← bar-width tall, full width, cursor: ns-resize
```

`div.container` owns the total width and height. `div.panel-left` holds an explicit pixel width; `div.panel-right` fills the remainder via `flex: 1`. `div.resizer` sits below the container and shares `bar-width` and `bar-color` with the vertical splitter.

---

## Content Slots

### Named slot `left`

Accepts a `<pre><code>` block or plain text for the left panel.

```html
<pre slot="left"><code class="language-cpp">
  // left panel content
</code></pre>
```

### Named slot `right`

Accepts a `<pre><code>` block or plain text for the right panel.

```html
<pre slot="right"><code class="language-cpp">
  // right panel content
</code></pre>
```

In Prism mode (`highlight="prism"`), the `class="language-*"` attribute on the `<code>` element activates Prism highlighting when Prism.js is loaded on the host page.

Slotted `<pre>` elements receive inline styles (`margin: 0`, `flex: 1`, `min-height: 0`, `box-sizing: border-box`) applied by the component to override Prism's stylesheet, which has higher cascade priority than `::slotted` shadow rules.

---

## Behavior

### Splitter drag

- `mousedown` on `div.splitter` begins a horizontal drag.
- `mousemove` on `document` recomputes `panel-left` width from cursor X delta.
- `mouseup` on `document` ends the drag.
- Total component width does not change during drag.
- Both `min-panel-px` limits are enforced on every move event.

### Resizer drag

- `mousedown` on `div.resizer` begins a vertical drag.
- `mousemove` on `document` recomputes container height from cursor Y delta.
- `mouseup` on `document` ends the drag.
- Both panels resize together; total width is unaffected.
- `min-height-px` is enforced on every move event.
- If no `height` attribute is set, the container's rendered height at drag start is used as the baseline.

### Panel click

- `click` on `div.panel-left` transfers `step-px` pixels from right to left.
- `click` on `div.panel-right` transfers `step-px` pixels from left to right.
- Both `min-panel-px` limits are enforced.

### Attribute change

Resets computed width and height state, then re-applies styles and layout.

---

## CSS Custom Properties (internal)

Set on `:host` by `_applyStyles()`:

| Property             | Controlled by attribute |
|----------------------|------------------------|
| `--bar-color`        | `bar-color`            |
| `--bar-width`        | `bar-width`            |
| `--panel-bg`         | `bg-color`             |
| `--panel-fg`         | `color`                |
| `--panel-padding`    | `code-padding`         |
| `--panel-overflow-x` | `overflow-x`           |

Container height is managed via `container.style.height` in JS, not via a CSS custom property.

---

## Inline Style Notes

- `font-size` cascades through the shadow boundary; set it on the host element directly.
- `height` is managed as an explicit pixel value on `div.container`. Use the `height` attribute to set an initial value; after the first resizer drag the attribute is no longer consulted.

---

## Dependencies

- **Prism.js** — optional; load both files before the component script when `highlight="prism"` is used.
  - `../js/prism.js`
  - `../css/prism.css`
- No other runtime dependencies.

---

## File Layout

```
ViewSplitterBarComponent/
  js/
    ViewSplitterBar.js          ← component definition
  css/
    ViewSplitterBar.css         ← host-page placement helpers
  ViewSplitterBarComponent.html ← demo / test page
  SpecSplitterBarComponent.md   ← this file
```

---

## Usage Examples

### Plain text

```html
<script src="js/ViewSplitterBar.js" defer></script>

<view-splitter-bar width="60rem" height="20rem" left-ratio="0.45">
  <pre slot="left">Left panel plain text content.</pre>
  <pre slot="right">Right panel plain text content.</pre>
</view-splitter-bar>
```

### Prism highlighting

```html
<link rel="stylesheet" href="../css/prism.css">
<script src="../js/prism.js" defer></script>
<script src="js/ViewSplitterBar.js" defer></script>

<view-splitter-bar width="70rem" height="24rem" highlight="prism" left-ratio="0.5">
  <pre slot="left"><code class="language-cpp">
int main() {
    return 0;
}
  </code></pre>
  <pre slot="right"><code class="language-rust">
fn main() {
    println!("Hello");
}
  </code></pre>
</view-splitter-bar>
```
