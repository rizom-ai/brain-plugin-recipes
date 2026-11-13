#!/usr/bin/env bash
# Smoke-test the plugin against a published @rizom/brain: BRAIN_VERSION, or
# the exact development version package.json pins.
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
default_version="$(bun -e "console.log(require('$repo_root/package.json').devDependencies['@rizom/brain'])")"

BRAIN_SPEC="${BRAIN_VERSION:-$default_version}" exec "$repo_root/scripts/smoke.sh"
