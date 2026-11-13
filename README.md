# @rizom/brain-plugin-recipes

[![CI](https://github.com/rizom-ai/brain-plugin-recipes/actions/workflows/ci.yml/badge.svg)](https://github.com/rizom-ai/brain-plugin-recipes/actions/workflows/ci.yml)

External entity plugin example for [`@rizom/brain`](https://github.com/rizom-ai/brains/tree/main/packages/brain-cli).

This package demonstrates the durable content path for external plugin authors:

- imports only public `@rizom/brain/*` APIs
- declares a `recipe` entity type with `defineEntity` and installs it with `defineEntityPackage`
- keeps a recipe as markdown: typed frontmatter plus a structured body
- tests itself on `@rizom/brain/testing`

The domain is intentionally neutral and non-core: recipes are useful for showing structured markdown without implying a first-party knowledge-work entity.

## Install

```bash
bun add @rizom/brain-plugin-recipes
```

The plugin declares `@rizom/brain` as a peer dependency. The brain owns the actual `@rizom/brain` version.

## Compose it into a brain

A brain is a definition package that composes its plugins with `use()`:

```ts
import recipes from "@rizom/brain-plugin-recipes";
import { defineBrain, use } from "@rizom/brain";

export default defineBrain({
  name: "my-brain",
  plugins: [use(recipes)],
});
```

The brain's `brain.yaml` names that definition package:

```yaml
brain: "@my-org/my-brain"
```

Then run:

```bash
bun install
brain start
```

The brain installs the `recipe` type under the installed package's name, `@rizom/brain-plugin-recipes:recipe`. The type takes no config; recipes are embedded for search by meaning.

## Markdown shape

A recipe's frontmatter is its metadata, and its body has two sections:

```md
---
title: Pancakes
servings: 4
prepTimeMinutes: 10
cookTimeMinutes: 15
---

## Ingredients

- Flour
- Milk
- Eggs

## Steps

1. Mix ingredients.
2. Cook on a hot pan.
```

`title` is required; `servings`, `prepTimeMinutes` and `cookTimeMinutes` are optional. No tags are used.

`parseRecipe(recipe.content)` reads the ingredients and steps from a stored recipe's body, and `recipeBody({ ingredients, steps })` writes a body in this shape. `Recipe` is the stored record's type.

## Develop

```bash
bun install
bun run check
```

`check` typechecks the source and tests and runs the tests, which install the package in a test brain from `@rizom/brain/testing`.

## Smoke test

The CI path uses the published `@rizom/brain` version pinned in `devDependencies` (override with `BRAIN_VERSION`):

```bash
bun run smoke:published
```

The smoke test packs a copy of the plugin, composes it into a temporary brain definition with `use()`, installs both into a temporary brain instance, and runs `brain start --startup-check` at debug log level. It passes when the brain reports that it initialized `@rizom/brain-plugin-recipes:recipe` and registered the `recipe` entity type.
