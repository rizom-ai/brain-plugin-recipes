import {
  EntityPlugin,
  type EntityPluginContext,
  type PluginFactory,
} from "@rizom/brain/plugins";
import {
  generateFrontmatter,
  generateMarkdownWithFrontmatter,
  type BaseEntity,
  type EntityAdapter,
  type EntityTypeConfig,
} from "@rizom/brain/entities";
import { z } from "zod";

const packageInfo = {
  name: "@rizom/brain-plugin-recipes",
  version: "0.1.0",
  description: "External entity plugin example for @rizom/brain.",
};

const RecipePluginConfigSchema = z.object({
  embeddable: z.boolean().default(true),
});

export type RecipePluginConfig = z.input<typeof RecipePluginConfigSchema>;

type ResolvedRecipePluginConfig = z.output<typeof RecipePluginConfigSchema>;

export const recipeMetadataSchema = z.object({
  title: z.string(),
  servings: z.number().int().positive().optional(),
  prepTimeMinutes: z.number().int().nonnegative().optional(),
  cookTimeMinutes: z.number().int().nonnegative().optional(),
});

export type RecipeMetadata = z.infer<typeof recipeMetadataSchema>;

export const recipeSchema = z.object({
  id: z.string(),
  entityType: z.literal("recipe"),
  content: z.string(),
  created: z.string(),
  updated: z.string(),
  contentHash: z.string(),
  metadata: recipeMetadataSchema,
  ingredients: z.array(z.string()),
  steps: z.array(z.string()),
});

export type RecipeEntity = BaseEntity & z.infer<typeof recipeSchema>;

function parseBullets(section: string): string[] {
  return section
    .split("\n")
    .map((line) => line.trim())
    .map((line) => line.replace(/^[-*]\s+/, ""))
    .filter((line) => line.length > 0);
}

function parseNumbered(section: string): string[] {
  return section
    .split("\n")
    .map((line) => line.trim())
    .map((line) => line.replace(/^\d+[.)]\s+/, ""))
    .filter((line) => line.length > 0);
}

function parseFrontmatterValue(value: string): unknown {
  const trimmed = value.trim();
  if (/^-?\d+$/.test(trimmed)) {
    return Number(trimmed);
  }
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseMarkdown(markdown: string): {
  content: string;
  metadata: Record<string, unknown>;
} {
  if (!markdown.startsWith("---\n")) {
    return { content: markdown.trim(), metadata: {} };
  }

  const closeIndex = markdown.indexOf("\n---", 4);
  if (closeIndex === -1) {
    return { content: markdown.trim(), metadata: {} };
  }

  const frontmatter = markdown.slice(4, closeIndex);
  const content = markdown.slice(closeIndex + 4).trim();
  const metadata: Record<string, unknown> = {};

  for (const line of frontmatter.split("\n")) {
    const separator = line.indexOf(":");
    if (separator === -1) {
      continue;
    }
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1);
    if (key) {
      metadata[key] = parseFrontmatterValue(value);
    }
  }

  return { content, metadata };
}

function extractSection(markdown: string, heading: string): string {
  const escapedHeading = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = markdown.match(
    new RegExp(`## ${escapedHeading}\\n([\\s\\S]*?)(?=\\n## |$)`, "i"),
  );
  return match?.[1]?.trim() ?? "";
}

function renderRecipeBody(
  entity: Pick<RecipeEntity, "ingredients" | "steps">,
): string {
  const ingredients = entity.ingredients.length
    ? entity.ingredients
        .map((ingredient: string) => `- ${ingredient}`)
        .join("\n")
    : "- Add ingredients here";
  const steps = entity.steps.length
    ? entity.steps
        .map((step: string, index: number) => `${index + 1}. ${step}`)
        .join("\n")
    : "1. Add preparation steps here";

  return [`## Ingredients`, ingredients, `## Steps`, steps].join("\n\n");
}

export class RecipeAdapter implements EntityAdapter<RecipeEntity> {
  readonly entityType = "recipe";
  readonly schema = recipeSchema;
  readonly frontmatterSchema = recipeMetadataSchema;
  readonly hasBody = true;

  toMarkdown(entity: RecipeEntity): string {
    return generateMarkdownWithFrontmatter(
      renderRecipeBody(entity),
      entity.metadata,
    );
  }

  fromMarkdown(markdown: string, id = "recipe"): RecipeEntity {
    const parsed = parseMarkdown(markdown);
    const metadata = recipeMetadataSchema.parse(parsed.metadata);
    const ingredients = parseBullets(
      extractSection(parsed.content, "Ingredients"),
    );
    const steps = parseNumbered(extractSection(parsed.content, "Steps"));
    const now = new Date().toISOString();

    return {
      id,
      entityType: "recipe",
      metadata,
      content: markdown,
      created: now,
      updated: now,
      contentHash: "",
      ingredients,
      steps,
    };
  }

  extractMetadata(entity: RecipeEntity): RecipeMetadata {
    return entity.metadata;
  }

  parseFrontMatter<TFrontmatter>(
    markdown: string,
    schema: z.ZodSchema<TFrontmatter>,
  ): TFrontmatter {
    return schema.parse(parseMarkdown(markdown).metadata);
  }

  generateFrontMatter(entity: RecipeEntity): string {
    return generateFrontmatter(entity.metadata);
  }

  getBodyTemplate(): string {
    return renderRecipeBody({ ingredients: [], steps: [] });
  }
}

export class RecipeEntityPlugin extends EntityPlugin<
  RecipeEntity,
  ResolvedRecipePluginConfig
> {
  override readonly entityType = "recipe";
  override readonly schema = recipeSchema;
  override readonly adapter = new RecipeAdapter();
  private readonly config: ResolvedRecipePluginConfig;

  constructor(config: RecipePluginConfig = {}) {
    const parsedConfig = RecipePluginConfigSchema.parse(config);
    super("recipes", packageInfo, parsedConfig, RecipePluginConfigSchema);
    this.config = parsedConfig;
  }

  protected override async onRegister(
    context: EntityPluginContext,
  ): Promise<void> {
    context.logger.info("Recipe entity plugin registered", {
      entityType: this.entityType,
    });
  }

  protected override async onReady(
    context: EntityPluginContext,
  ): Promise<void> {
    context.logger.info("Recipe entity plugin ready", {
      entityType: this.entityType,
      knownEntityTypes: context.entityService.getEntityTypes(),
    });
  }

  protected override getEntityTypeConfig(): EntityTypeConfig {
    return {
      embeddable: this.config.embeddable,
    };
  }
}

export const plugin: PluginFactory = (config) => new RecipeEntityPlugin(config);
export default plugin;
