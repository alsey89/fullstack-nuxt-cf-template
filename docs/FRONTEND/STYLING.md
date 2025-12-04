# Styling Conventions

Tailwind CSS patterns and best practices for Keystone.

## Overview

Keystone uses **Tailwind CSS exclusively** for all styling. No scoped CSS blocks are used anywhere in the codebase.

**Core Principles:**
- All styling via Tailwind utility classes
- Theme tokens for colors (never hardcode)
- Mobile-first responsive design
- No `<style scoped>` blocks
- Consistent spacing and typography

---

## Theme System

### Color Tokens

**Always use theme tokens** (never hardcoded colors):

**Background colors:**
- `bg-background` - Main background color
- `bg-foreground` - Inverted background
- `bg-card` - Card background
- `bg-muted` - Muted/subtle background
- `bg-muted/30` - Muted with 30% opacity
- `bg-primary` - Primary brand color
- `bg-secondary` - Secondary brand color
- `bg-destructive` - Error/danger color
- `bg-accent` - Accent color

**Text colors:**
- `text-foreground` - Main text color
- `text-muted-foreground` - Secondary/subtle text
- `text-primary` - Primary brand text
- `text-destructive` - Error text
- `text-card-foreground` - Text on card backgrounds

**Border colors:**
- `border-border` - Default border color
- `border-primary` - Primary brand border
- `border-destructive` - Error border
- `border-input` - Form input border

**Examples:**
```vue
<!-- Card with theme colors -->
<div class="rounded-lg border border-border bg-card p-6">
  <h2 class="mb-2 text-xl font-semibold text-card-foreground">Title</h2>
  <p class="text-muted-foreground">Description</p>
</div>

<!-- Primary button -->
<button class="bg-primary text-primary-foreground hover:bg-primary/90">
  Click me
</button>
```

---

## Layout Patterns

### Flexbox

```vue
<!-- Full-height vertical layout -->
<div class="flex h-screen flex-col overflow-hidden">
  <header class="shrink-0 border-b bg-background px-6 py-4">
    Header
  </header>
  <main class="flex-1 overflow-auto">
    Main content scrolls
  </main>
</div>

<!-- Horizontal bar with space-between -->
<div class="flex items-center justify-between">
  <div class="flex items-center gap-4">
    <Icon />
    <span>Title</span>
  </div>
  <Button>Action</Button>
</div>

<!-- Centered content -->
<div class="flex min-h-screen items-center justify-center">
  <Card>Content</Card>
</div>
```

### Grid

```vue
<!-- Responsive grid -->
<div class="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
  <div v-for="item in items" :key="item.id">
    {{ item }}
  </div>
</div>

<!-- Two-column layout (sidebar + main) -->
<div class="grid h-screen grid-cols-[250px_1fr]">
  <aside class="border-r bg-muted/30">Sidebar</aside>
  <main class="overflow-auto">Content</main>
</div>
```

---

## Spacing

### Use `gap` for Flex/Grid Spacing

```vue
<div class="flex gap-4">...</div>  <!-- 1rem spacing -->
<div class="flex gap-2">...</div>  <!-- 0.5rem spacing -->
<div class="grid gap-8">...</div>  <!-- 2rem spacing -->
```

### Use Padding for Internal Spacing

```vue
<!-- ✅ GOOD: Padding for internal spacing -->
<div class="rounded-lg bg-card p-6">
  <h2 class="mb-4">Title</h2>
  <p>Content</p>
</div>
```

### Common Spacing Scale

- `gap-1` / `p-1` = 0.25rem (4px)
- `gap-2` / `p-2` = 0.5rem (8px)
- `gap-4` / `p-4` = 1rem (16px)
- `gap-6` / `p-6` = 1.5rem (24px)
- `gap-8` / `p-8` = 2rem (32px)

---

## Responsive Design

### Mobile-First Approach

```vue
<!-- Base classes apply to mobile, breakpoints override for larger screens -->
<div class="grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
  <!-- 1 col on mobile, 2 cols on tablet, 3 cols on desktop -->
</div>

<h1 class="text-2xl md:text-3xl lg:text-4xl">
  <!-- Smaller text on mobile, larger on desktop -->
</h1>
```

### Breakpoints

- `sm:` - 640px (small tablets, large phones landscape)
- `md:` - 768px (tablets)
- `lg:` - 1024px (desktops)
- `xl:` - 1280px (large desktops)
- `2xl:` - 1536px (extra large desktops)

### Hide/Show at Breakpoints

```vue
<div class="hidden md:block">Desktop only</div>
<div class="block md:hidden">Mobile only</div>
```

---

## Typography

### Font Sizes

```vue
<h1 class="text-4xl font-bold">Main Heading</h1>
<h2 class="text-3xl font-semibold">Section Heading</h2>
<h3 class="text-2xl font-semibold">Subsection</h3>
<p class="text-base">Body text (default)</p>
<span class="text-sm">Small text</span>
<span class="text-xs">Extra small text</span>
```

### Font Weights

- `font-normal` - 400 (default)
- `font-medium` - 500
- `font-semibold` - 600
- `font-bold` - 700

---

## Borders and Effects

### Border Radius

```vue
<div class="rounded">Default (0.25rem)</div>
<div class="rounded-lg">Large (0.5rem)</div>
<div class="rounded-xl">Extra large (0.75rem)</div>
<div class="rounded-full">Fully rounded (circle/pill)</div>
```

### Borders

```vue
<!-- All sides -->
<div class="border">1px border</div>
<div class="border-2">2px border</div>

<!-- Specific sides -->
<div class="border-b">Bottom border only</div>
<div class="border-l-4">Left border 4px</div>

<!-- With color -->
<div class="border border-primary">Primary border</div>
```

### Shadows

```vue
<div class="shadow">Subtle shadow</div>
<div class="shadow-md">Medium shadow</div>
<div class="shadow-lg">Large shadow</div>
```

### Transitions

```vue
<div class="transition-all">Smooth all properties</div>
<div class="transition-colors">Color transitions only</div>

<button class="bg-primary transition-colors hover:bg-primary/90">
  Hover me
</button>
```

---

## Interactive States

### Hover, Focus, Disabled

```vue
<!-- Hover -->
<button class="bg-primary hover:bg-primary/90">Button</button>

<!-- Focus -->
<input class="border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary" />

<!-- Disabled -->
<button class="disabled:cursor-not-allowed disabled:opacity-50" :disabled="isLoading">
  Submit
</button>

<!-- Active/Selected -->
<div :class="{ 'bg-primary text-primary-foreground': isActive }">
  Item
</div>
```

---

## Common Patterns

### Card Component

```vue
<Card class="w-full max-w-md">
  <CardHeader>
    <CardTitle class="text-2xl">Title</CardTitle>
    <CardDescription>Description text</CardDescription>
  </CardHeader>
  <CardContent>
    <p class="text-muted-foreground">Content</p>
  </CardContent>
  <CardFooter class="flex gap-4">
    <Button>Action</Button>
  </CardFooter>
</Card>
```

### Button Variants

```vue
<!-- Primary -->
<Button>Primary</Button>

<!-- Outline -->
<Button variant="outline">Outline</Button>

<!-- Ghost -->
<Button variant="ghost">Ghost</Button>

<!-- Destructive -->
<Button variant="destructive">Delete</Button>
```

### Form Input

```vue
<FormField v-slot="{ field }" name="email">
  <FormItem>
    <FormLabel>Email</FormLabel>
    <FormControl>
      <Input type="email" v-bind="field" placeholder="you@example.com" />
    </FormControl>
    <FormMessage />
  </FormItem>
</FormField>
```

---

## Best Practices

### ✅ DO

- Use Tailwind utility classes exclusively
- Use theme tokens for all colors
- Use mobile-first responsive classes (`md:`, `lg:`)
- Use `gap` for spacing between items
- Group related utilities logically
- Use opacity modifiers (`bg-primary/90`)
- Follow shadcn-vue component patterns

### ❌ DON'T

- Don't add `<style scoped>` blocks
- Don't use hardcoded colors (`bg-[#667eea]`)
- Don't use arbitrary values excessively
- Don't use margins for internal component spacing
- Don't use `!important` (fix specificity instead)
- Don't mix Tailwind with custom CSS

---

## Class Organization

**Group classes logically:**

```vue
<!-- ✅ GOOD: Grouped by category -->
<div class="flex h-screen flex-col overflow-hidden">  <!-- Layout -->
  <header class="shrink-0 border-b bg-background px-6 py-4">  <!-- Box model, then styling -->
    <h1 class="text-xl font-semibold text-foreground">  <!-- Typography, then colors -->
      Title
    </h1>
  </header>
</div>

<!-- ❌ BAD: Random order -->
<div class="overflow-hidden flex flex-col h-screen">
  <header class="bg-background border-b px-6 shrink-0 py-4">
    <h1 class="text-foreground font-semibold text-xl">
      Title
    </h1>
  </header>
</div>
```

**Suggested order:**
1. Layout (flex, grid, display)
2. Positioning (relative, absolute, z-index)
3. Box model (w-, h-, p-, m-)
4. Borders and shadows
5. Colors (bg-, text-, border-)
6. Typography (text-, font-, leading-)
7. Effects (opacity, transition, transform)
8. Interactive states (hover:, focus:, disabled:)

---

**For component patterns, see:** [COMPONENTS.md](./COMPONENTS.md)
**For form styling, see:** [FORMS.md](./FORMS.md)
