#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
work_dir="$(mktemp -d "${TMPDIR:-/tmp}/brain-plugin-recipes-published-smoke.XXXXXX")"
plugin_dir="$work_dir/plugin"
artifacts_dir="$work_dir/artifacts"
instance_dir="$work_dir/instance"
log_file="$instance_dir/brain-start.log"
brain_version="${BRAIN_VERSION:-^0.2.0-alpha.48}"

cleanup() {
  rm -rf "$work_dir"
}
trap cleanup EXIT

mkdir -p "$plugin_dir" "$artifacts_dir" "$instance_dir"
cp "$repo_root/package.json" "$plugin_dir/package.json"
cp "$repo_root/tsconfig.json" "$plugin_dir/tsconfig.json"
cp "$repo_root/README.md" "$plugin_dir/README.md"
cp "$repo_root/LICENSE" "$plugin_dir/LICENSE"
cp -R "$repo_root/src" "$plugin_dir/src"

printf 'Installing plugin dependencies against @rizom/brain@%s...\n' "$brain_version"
(
  cd "$plugin_dir"
  bun add --dev "@rizom/brain@$brain_version"
  bun install
  bun run typecheck
  bun run build
  bun pm pack --destination "$artifacts_dir"
)

plugin_tgz="$(find "$artifacts_dir" -maxdepth 1 -name 'rizom-brain-plugin-recipes-*.tgz' | sort | tail -n 1)"
if [[ -z "$plugin_tgz" ]]; then
  echo "Could not find packed recipes plugin tarball" >&2
  exit 1
fi

cat > "$instance_dir/package.json" <<EOF_INSTANCE_PACKAGE
{
  "name": "brain-recipes-instance-published-smoke",
  "private": true,
  "type": "module",
  "dependencies": {
    "@rizom/brain": "$brain_version",
    "@rizom/brain-plugin-recipes": "file:$plugin_tgz",
    "zod": "^3.25.76"
  }
}
EOF_INSTANCE_PACKAGE

cat > "$instance_dir/brain.yaml" <<'EOF_BRAIN_YAML'
brain: rover
preset: core

plugins:
  recipes:
    package: "@rizom/brain-plugin-recipes"
    config:
      embeddable: true
EOF_BRAIN_YAML

printf 'Installing temporary brain instance in %s...\n' "$instance_dir"
(
  cd "$instance_dir"
  bun install
)

printf 'Running temporary brain instance startup check...\n'
if ! (
  cd "$instance_dir"
  bun node_modules/.bin/brain start --startup-check > "$log_file" 2>&1
); then
  cat "$log_file" >&2
  exit 1
fi

if ! grep -q "Recipe entity plugin registered" "$log_file"; then
  cat "$log_file" >&2
  echo "Missing recipe plugin registration log" >&2
  exit 1
fi

if ! grep -q "Recipe entity plugin ready" "$log_file"; then
  cat "$log_file" >&2
  echo "Missing recipe plugin ready log" >&2
  exit 1
fi

printf 'External recipe entity plugin published-package smoke proof passed.\n'
