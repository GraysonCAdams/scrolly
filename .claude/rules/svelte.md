---
paths:
  - "src/**/*.svelte"
---

# Svelte Component Rules

- Use Svelte 5 runes exclusively: `$state`, `$props`, `$effect`, `$derived`, `$bindable`
- NEVER use legacy patterns: `let` for reactive vars, `export let` for props, `$:` reactive blocks, `$$props`, `$$restProps`
- Use `{#snippet}` blocks instead of `<slot>` for component composition
- Component props: `let { prop1, prop2 } = $props()`
- State: `let count = $state(0)` — not `let count = 0`
- Derived values: `let doubled = $derived(count * 2)` — not `$: doubled = count * 2`
- Event handlers: use `onclick={handler}` — not `on:click={handler}`
- Scoped `<style>` block in every component — never import external CSS
- All colors via CSS custom properties (`var(--token)`) — never hardcode hex
