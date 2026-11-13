import { describe, expect, it } from "bun:test";
import { use } from "@rizom/brain";
import { startTestBrain } from "@rizom/brain/testing";
import recipes, { parseRecipe, recipe, recipeBody } from "../src/index";

const pancakes = `## Ingredients

- Flour
- Milk
* Eggs

## Steps

1. Mix ingredients.
2) Cook on a hot pan.`;

describe("the recipes package", () => {
  it("is one entity package that installs the recipe type", () => {
    expect(recipes.family).toBe("entity");
    expect(recipes.id).toBe("recipes");
    expect(recipe.type).toBe("recipe");
  });

  it("reads the ingredients and steps from a recipe's body", () => {
    expect(parseRecipe(pancakes)).toEqual({
      ingredients: ["Flour", "Milk", "Eggs"],
      steps: ["Mix ingredients.", "Cook on a hot pan."],
    });
  });

  it("reads a body without sections as an empty recipe", () => {
    expect(parseRecipe("Just a note")).toEqual({ ingredients: [], steps: [] });
  });

  it("writes a body its reader reads back", () => {
    const parts = {
      ingredients: ["Flour", "Milk"],
      steps: ["Mix.", "Cook."],
    };
    expect(parseRecipe(recipeBody(parts))).toEqual(parts);
  });

  it("validates a recipe's frontmatter", () => {
    expect(
      recipe.metadata.safeParse({ title: "Pancakes", servings: 4 }).success,
    ).toBe(true);
    expect(
      recipe.metadata.safeParse({ title: "Pancakes", servings: 0 }).success,
    ).toBe(false);
  });

  it("installs the recipe type in a brain", async () => {
    const brain = await startTestBrain({ plugins: [use(recipes)] });
    try {
      // A test brain cannot approve a create; reaching the approval shows the
      // brain accepts a recipe, where one without the package refuses the type.
      expect(
        await brain.tool("system_create", {
          entityType: "recipe",
          title: "Pancakes",
          fields: { servings: 4 },
          source: { kind: "text", content: pancakes },
        }),
      ).toEqual({ needsConfirmation: true, summary: 'Create "Pancakes"?' });
    } finally {
      await brain.stop();
    }
  });
});
