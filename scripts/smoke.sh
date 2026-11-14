#!/usr/bin/env bash
# Packs this plugin against one @rizom/brain, composes it into a throwaway
# brain definition with use(), and runs `brain start --startup-check` on it.
# The proof is what the brain prints at debug level: it initialized the
# package and registered its recipe entity type.
set -euo pipefail

brain_spec="${BRAIN_SPEC:?Set BRAIN_SPEC to an @rizom/brain version or file: tarball}"
package_name="@rizom/brain-plugin-recipes"
plugin_id="$package_name:recipe"

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
brain_peer_range="$(bun -e "console.log(require('$repo_root/package.json').peerDependencies['@rizom/brain'])")"
work_dir="$(mktemp -d "${TMPDIR:-/tmp}/brain-plugin-recipes-smoke.XXXXXX")"
plugin_dir="$work_dir/plugin"
definition_dir="$work_dir/definition"
artifacts_dir="$work_dir/artifacts"
instance_dir="$work_dir/instance"
log_file="$instance_dir/brain-start.log"

cleanup() {
  rm -rf "$work_dir"
}
trap cleanup EXIT

mkdir -p "$plugin_dir" "$definition_dir" "$artifacts_dir" "$instance_dir"
for file in package.json tsconfig.json tsconfig.test.json README.md LICENSE; do
  cp "$repo_root/$file" "$plugin_dir/$file"
done
cp -R "$repo_root/src" "$plugin_dir/src"
cp -R "$repo_root/test" "$plugin_dir/test"

printf 'Checking and packing the plugin against @rizom/brain@%s...\n' "$brain_spec"
(
  cd "$plugin_dir"
  bun add --dev "@rizom/brain@$brain_spec"
  bun install
  bun run check
  bun pm pack --destination "$artifacts_dir"
)

plugin_tgz="$(find "$artifacts_dir" -maxdepth 1 -name 'rizom-brain-plugin-recipes-*.tgz' | sort | tail -n 1)"
if [[ -z "$plugin_tgz" ]]; then
  echo "Could not find packed recipes plugin tarball" >&2
  exit 1
fi

# A brain is a definition package that composes its plugins with use().
cat > "$definition_dir/package.json" <<EOF_DEFINITION_PACKAGE
{
  "name": "@smoke/recipes-brain",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": { ".": "./index.js" },
  "dependencies": { "$package_name": "file:$plugin_tgz" },
  "peerDependencies": { "@rizom/brain": "$brain_peer_range" }
}
EOF_DEFINITION_PACKAGE

cat > "$definition_dir/index.js" <<'EOF_DEFINITION'
import recipes from "@rizom/brain-plugin-recipes";
import { defineBrain, use } from "@rizom/brain";

export default defineBrain({
  name: "recipes-smoke",
  plugins: [use(recipes)],
});
EOF_DEFINITION

(
  cd "$definition_dir"
  bun pm pack --destination "$artifacts_dir"
)

definition_tgz="$(find "$artifacts_dir" -maxdepth 1 -name 'smoke-recipes-brain-*.tgz' | sort | tail -n 1)"

cat > "$instance_dir/package.json" <<EOF_INSTANCE_PACKAGE
{
  "name": "brain-recipes-instance-smoke",
  "private": true,
  "type": "module",
  "dependencies": {
    "@rizom/brain": "$brain_spec",
    "$package_name": "file:$plugin_tgz",
    "@smoke/recipes-brain": "file:$definition_tgz"
  }
}
EOF_INSTANCE_PACKAGE

cat > "$instance_dir/brain.yaml" <<'EOF_BRAIN_YAML'
brain: "@smoke/recipes-brain"
model: gpt-5.6-luna
database: "file:./brain.db"
embedding:
  enabled: false
EOF_BRAIN_YAML

printf 'Installing temporary brain instance in %s...\n' "$instance_dir"
(
  cd "$instance_dir"
  bun install
)

printf 'Running temporary brain instance startup check...\n'
if ! (
  cd "$instance_dir"
  LOG_LEVEL=debug OPENAI_API_KEY=startup-check \
    bun node_modules/.bin/brain start --startup-check > "$log_file" 2>&1
); then
  cat "$log_file" >&2
  exit 1
fi

for evidence in \
  "Initialized plugin: $plugin_id" \
  "Registered entity type: recipe"; do
  if ! grep -qF "$evidence" "$log_file"; then
    cat "$log_file" >&2
    echo "Missing startup evidence: $evidence" >&2
    exit 1
  fi
done

printf 'External recipes plugin smoke proof passed against @rizom/brain@%s.\n' "$brain_spec"
