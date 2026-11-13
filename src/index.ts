import {
  defineEntity,
  defineEntityPackage,
  z,
  type EntityOf,
} from "@rizom/brain/entities";

/**
 * A recipe: its frontmatter is the metadata below, and its body holds an
 * `## Ingredients` list and numbered `## Steps`.
 */
export const recipe = defineEntity({
  type: "recipe",
  purpose: "A recipe: what goes into a dish and the steps to cook it.",
  metadata: z.object({
    title: z.string(),
    servings: z.number().int().positive().optional(),
    prepTimeMinutes: z.number().int().nonnegative().optional(),
    cookTimeMinutes: z.number().int().nonnegative().optional(),
  }),
  // Recipes are found by meaning as well as by words.
  config: { embeddable: true },
});

/** A stored recipe, with the runtime's identity, content and timestamps. */
export type Recipe = EntityOf<typeof recipe>;

/** What a recipe's body says. */
export interface RecipeParts {
  ingredients: string[];
  steps: string[];
}

function extractSection(body: string, heading: string): string {
  const escapedHeading = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = body.match(
    new RegExp(`## ${escapedHeading}\\n([\\s\\S]*?)(?=\\n## |$)`, "i"),
  );
  return match?.[1]?.trim() ?? "";
}

function listItems(section: string, marker: RegExp): string[] {
  return section
    .split("\n")
    .map((line) => line.trim().replace(marker, ""))
    .filter((line) => line.length > 0);
}

/** Read the ingredients and steps from a recipe's body (`recipe.content`). */
export function parseRecipe(body: string): RecipeParts {
  return {
    ingredients: listItems(extractSection(body, "Ingredients"), /^[-*]\s+/),
    steps: listItems(extractSection(body, "Steps"), /^\d+[.)]\s+/),
  };
}

/** Write a recipe's body from its ingredients and steps. */
export function recipeBody({ ingredients, steps }: RecipeParts): string {
  const ingredientList = ingredients.length
    ? ingredients.map((ingredient) => `- ${ingredient}`).join("\n")
    : "- Add ingredients here";
  const stepList = steps.length
    ? steps.map((step, index) => `${index + 1}. ${step}`).join("\n")
    : "1. Add preparation steps here";

  return ["## Ingredients", ingredientList, "## Steps", stepList].join("\n\n");
}

/** The package the brain installs: the recipe type. */
export default defineEntityPackage({
  id: "recipes",
  entities: [recipe],
});
