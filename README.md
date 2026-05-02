# @rizom/brain-plugin-recipes

[![CI](https://github.com/rizom-ai/brain-plugin-recipes/actions/workflows/ci.yml/badge.svg)](https://github.com/rizom-ai/brain-plugin-recipes/actions/workflows/ci.yml)

External entity plugin example for [`@rizom/brain`](https://github.com/rizom-ai/brains/tree/main/packages/brain-cli).

This package demonstrates the durable content path for external plugin authors:

- imports only public `@rizom/brain/*` APIs plus `zod`
- defines a `recipe` entity schema
- implements a markdown/frontmatter adapter
- loads from `brain.yaml plugins:`
- receives `onRegister` and `onReady` lifecycle calls

The domain is intentionally neutral and non-core: recipes are useful for showing structured markdown without implying a first-party knowledge-work entity.

## Install

```bash
bun add @rizom/brain-plugin-recipes
```

The plugin declares `@rizom/brain` as a peer dependency. The brain instance owns the actual `@rizom/brain` version.

## Configure

Add the package to your brain instance `package.json`:

```json
{
  "dependencies": {
    "@rizom/brain": "^0.2.0-alpha.47",
    "@rizom/brain-plugin-recipes": "^0.1.0"
  }
}
```

Declare the plugin in `brain.yaml`:

```yaml
brain: rover
preset: core

plugins:
  recipes:
    package: "@rizom/brain-plugin-recipes"
    config:
      embeddable: true
```

Then run:

```bash
bun install
brain start
```

For CI/smoke checks that only need to prove the plugin loads and reaches `onReady`, use:

```bash
brain start --startup-check
```

You should see lifecycle logs similar to:

```txt
[recipes] Recipe entity plugin registered
[recipes] Recipe entity plugin ready
```

## Markdown shape

Recipe entities serialize as frontmatter plus two body sections:

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

No tags are used.

## Smoke test

The CI path uses the published `@rizom/brain` package:

```bash
bun run smoke:published
```

The smoke test creates a temporary plugin copy and a temporary brain instance, installs tarballs, and runs `brain start --startup-check` to verify the recipe plugin registered and reached ready. Until the published `@rizom/brain` package includes `--startup-check`, the published-package smoke script falls back to the older dummy-key timed start.
