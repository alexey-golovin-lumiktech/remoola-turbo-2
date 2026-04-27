#!/usr/bin/env bash
set -euo pipefail
# No script in scripts/ runs on Vercel deploy
[[ -n "${VERCEL:-}" || -n "${VERCEL_ENV:-}" ]] && exit 0

# Sync dependency versions across the monorepo.
# Rule: use the max version found in any package.json; if any package uses
# a strict (exact) version, apply that version as strict everywhere.
# Requires: jq
# Optional env:
#   MONOREPO_ROOT=/abs/path/to/repo
#   DRY_RUN=1

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
START_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DRY_RUN="${DRY_RUN:-0}"

is_monorepo_root() {
  local candidate="$1"
  [[ -f "$candidate/package.json" ]] || return 1
  [[ -d "$candidate/apps" ]] || return 1
  [[ -d "$candidate/packages" ]] || return 1
}

ROOT="${MONOREPO_ROOT:-}"
if [[ -n "$ROOT" ]]; then
  ROOT="$(cd "$ROOT" && pwd)"
elif is_monorepo_root "$START_ROOT"; then
  ROOT="$START_ROOT"
else
  for candidate in "$START_ROOT"/*; do
    [[ -d "$candidate" ]] || continue
    if is_monorepo_root "$candidate"; then
      ROOT="$candidate"
      break
    fi
  done
fi

if [[ -z "$ROOT" ]]; then
  echo "error: could not locate monorepo root from: $START_ROOT" >&2
  exit 1
fi

cd "$ROOT"

if ! command -v jq &>/dev/null; then
  echo "error: jq is required. Install with: apt-get install jq / brew install jq" >&2
  exit 1
fi

# Normalize version to x.y.z (e.g. 1.2.3, 1.2 -> 1.2.0, 1 -> 1.0.0)
normalize_version() {
  local v="$1"
  v="${v%%-*}"   # strip prerelease
  v="${v%%+*}"  # strip metadata
  local major minor patch
  if [[ "$v" =~ ^([0-9]+)\.([0-9]+)\.([0-9]+)$ ]]; then
    echo "$v"
  elif [[ "$v" =~ ^([0-9]+)\.([0-9]+)$ ]]; then
    echo "${BASH_REMATCH[1]}.${BASH_REMATCH[2]}.0"
  elif [[ "$v" =~ ^([0-9]+)$ ]]; then
    echo "${BASH_REMATCH[1]}.0.0"
  else
    echo ""
  fi
}

# Return 0 if $1 > $2 (semver), 1 otherwise
semver_gt() {
  local a b
  a="$(normalize_version "$1")"
  b="$(normalize_version "$2")"
  [[ -z "$a" ]] && return 1
  [[ -z "$b" ]] && return 0
  local i
  for i in 0 1 2; do
    local na nb
    na=$(echo "$a" | cut -d. -f$((i+1)) || echo "0")
    nb=$(echo "$b" | cut -d. -f$((i+1)) || echo "0")
    na=${na:-0}
    nb=${nb:-0}
    if [[ "$na" -gt "$nb" ]]; then return 0; fi
    if [[ "$na" -lt "$nb" ]]; then return 1; fi
  done
  return 1
}

# Parse spec: output "baseVersion|strict|operator"
parse_spec() {
  local spec="$1"
  local trimmed="$spec"
  trimmed="${trimmed#"${trimmed%%[![:space:]]*}"}"
  local strict=1
  local operator="exact"
  if [[ "$trimmed" == ">="* ]]; then
    strict=0
    operator=">="
    trimmed="${trimmed#>=}"
  elif [[ "$trimmed" == "<="* ]]; then
    strict=0
    operator="<="
    trimmed="${trimmed#<=}"
  elif [[ "$trimmed" == '^'* ]]; then
    strict=0
    operator="^"
    trimmed="${trimmed#^}"
  elif [[ "$trimmed" == '~'* ]]; then
    strict=0
    operator="~"
    trimmed="${trimmed#~}"
  elif [[ "$trimmed" == '>'* ]]; then
    strict=0
    operator=">"
    trimmed="${trimmed#>}"
  elif [[ "$trimmed" == '<'* ]]; then
    strict=0
    operator="<"
    trimmed="${trimmed#<}"
  elif [[ "$trimmed" == '='* ]]; then
    operator="="
    trimmed="${trimmed#=}"
  fi
  trimmed="${trimmed#"${trimmed%%[![:space:]]*}"}"
  local base
  base="$(normalize_version "$trimmed")"
  [[ -z "$base" ]] && return 1
  echo "$base|$strict|$operator"
}

# Collect package.json paths
pkg_paths=("$ROOT/package.json")
for dir in apps packages; do
  [[ -d "$ROOT/$dir" ]] || continue
  for name in "$ROOT/$dir"/*; do
    [[ -d "$name" ]] || continue
    [[ -f "$name/package.json" ]] || continue
    pkg_paths+=("$name/package.json")
  done
done

# Collect install/runtime deps: name -> "baseVersion strict"
# Keep max version; if any package uses a strict version, apply that version as strict.
declare -A resolved_base
declare -A resolved_strict

# Collect peer deps separately so they preserve compatibility semantics.
declare -A resolved_peer_base
declare -A resolved_peer_has_range
declare -A resolved_peer_operator

for pkg_path in "${pkg_paths[@]}"; do
  while IFS= read -r line; do
    [[ -z "$line" ]] && continue
    name="${line%%|*}"
    spec="${line#*|}"
    [[ "$name" == @remoola/* ]] && continue
    parsed="$(parse_spec "$spec" 2>/dev/null)" || continue
    IFS='|' read -r base strict _operator <<<"$parsed"
    if [[ -z "${resolved_base[$name]:-}" ]]; then
      resolved_base[$name]="$base"
      resolved_strict[$name]="$strict"
    else
      if semver_gt "$base" "${resolved_base[$name]}"; then
        resolved_base[$name]="$base"
        resolved_strict[$name]="$strict"
      elif [[ "$base" == "${resolved_base[$name]}" ]]; then
        [[ "$strict" -eq 1 ]] && resolved_strict[$name]=1
      else
        [[ "$strict" -eq 1 ]] && resolved_strict[$name]=1
      fi
    fi
  done < <(jq -r '
    ((.dependencies // {})
    + (.devDependencies // {})
    + (.optionalDependencies // {}))
    | to_entries[]
    | select(.key | startswith("@remoola/") | not)
    | "\(.key)|\(.value)"
  ' "$pkg_path" 2>/dev/null || true)

  while IFS= read -r line; do
    [[ -z "$line" ]] && continue
    name="${line%%|*}"
    spec="${line#*|}"
    [[ "$name" == @remoola/* ]] && continue
    parsed="$(parse_spec "$spec" 2>/dev/null)" || continue
    IFS='|' read -r base _strict operator <<<"$parsed"

    if [[ -z "${resolved_peer_base[$name]:-}" ]] || semver_gt "$base" "${resolved_peer_base[$name]}"; then
      resolved_peer_base[$name]="$base"
    fi

    if [[ "$operator" != "exact" && "$operator" != "=" ]]; then
      resolved_peer_has_range[$name]=1
      if [[ -z "${resolved_peer_operator[$name]:-}" ]]; then
        resolved_peer_operator[$name]="$operator"
      fi
    fi
  done < <(jq -r '
    (.peerDependencies // {})
    | to_entries[]
    | select(.key | startswith("@remoola/") | not)
    | "\(.key)|\(.value)"
  ' "$pkg_path" 2>/dev/null || true)
done

count=0
for name in "${!resolved_base[@]}"; do
  ((count++)) || true
done
echo "Using monorepo root: $ROOT"
echo "Resolved $count package versions (max + strict rule)."

# Build resolved map as JSON for jq: {"name": "target", ...}
resolved_json="{"
first=1
for name in "${!resolved_base[@]}"; do
  base="${resolved_base[$name]}"
  strict="${resolved_strict[$name]:-0}"
  if [[ "$strict" -eq 1 ]]; then target="$base"; else target="^$base"; fi
  name_escaped="${name//\\/\\\\}"
  name_escaped="${name_escaped//\"/\\\"}"
  target_escaped="${target//\\/\\\\}"
  target_escaped="${target_escaped//\"/\\\"}"
  [[ $first -eq 0 ]] && resolved_json+=","
  first=0
  resolved_json+="\"$name_escaped\":\"$target_escaped\""
done
resolved_json+="}"

peer_base_json="{"
first=1
for name in "${!resolved_peer_base[@]}"; do
  base="${resolved_peer_base[$name]}"
  name_escaped="${name//\\/\\\\}"
  name_escaped="${name_escaped//\"/\\\"}"
  base_escaped="${base//\\/\\\\}"
  base_escaped="${base_escaped//\"/\\\"}"
  [[ $first -eq 0 ]] && peer_base_json+=","
  first=0
  peer_base_json+="\"$name_escaped\":\"$base_escaped\""
done
peer_base_json+="}"

peer_has_range_json="{"
first=1
for name in "${!resolved_peer_base[@]}"; do
  has_range=false
  [[ "${resolved_peer_has_range[$name]:-0}" == "1" ]] && has_range=true
  name_escaped="${name//\\/\\\\}"
  name_escaped="${name_escaped//\"/\\\"}"
  [[ $first -eq 0 ]] && peer_has_range_json+=","
  first=0
  peer_has_range_json+="\"$name_escaped\":$has_range"
done
peer_has_range_json+="}"

peer_operator_json="{"
first=1
for name in "${!resolved_peer_operator[@]}"; do
  operator="${resolved_peer_operator[$name]}"
  name_escaped="${name//\\/\\\\}"
  name_escaped="${name_escaped//\"/\\\"}"
  operator_escaped="${operator//\\/\\\\}"
  operator_escaped="${operator_escaped//\"/\\\"}"
  [[ $first -eq 0 ]] && peer_operator_json+=","
  first=0
  peer_operator_json+="\"$name_escaped\":\"$operator_escaped\""
done
peer_operator_json+="}"

# Apply resolved versions to each package.json with one jq run per file.
# Only touch existing external dependency sections and preserve missing sections.
for pkg_path in "${pkg_paths[@]}"; do
  updated=$(jq --indent 2 \
    --argjson resolved "$resolved_json" \
    --argjson peerBase "$peer_base_json" \
    --argjson peerHasRange "$peer_has_range_json" \
    --argjson peerOperator "$peer_operator_json" '
    def sync_section:
      with_entries(
        .key as $depName
        | if ($depName | startswith("@remoola/")) then .
        elif ($resolved | has($depName)) then .value = $resolved[$depName]
        else .
        end
      );

    def peer_prefix($spec):
      if ($spec | startswith(">=")) then ">="
      elif ($spec | startswith("<=")) then "<="
      elif ($spec | startswith("^")) then "^"
      elif ($spec | startswith("~")) then "~"
      elif ($spec | startswith(">")) then ">"
      elif ($spec | startswith("<")) then "<"
      elif ($spec | startswith("=")) then "="
      else "exact"
      end;

    def sync_peer_section:
      with_entries(
        .key as $depName
        | if ($depName | startswith("@remoola/")) then .
        elif ($peerBase | has($depName)) then
          .value = (
            if ($peerHasRange[$depName] // false) then
              (peer_prefix(.value) as $currentPrefix
              | if $currentPrefix == "exact" or $currentPrefix == "="
                then ($peerOperator[$depName] // "^") + $peerBase[$depName]
                else $currentPrefix + $peerBase[$depName]
                end)
            else $peerBase[$depName]
            end
          )
        else .
        end
      );

    (if has("dependencies") then .dependencies |= sync_section else . end)
    | (if has("devDependencies") then .devDependencies |= sync_section else . end)
    | (if has("peerDependencies") then .peerDependencies |= sync_peer_section else . end)
    | (if has("optionalDependencies") then .optionalDependencies |= sync_section else . end)
  ' "$pkg_path" 2>/dev/null)
  current="$(<"$pkg_path")"
  if [[ -n "$updated" && "$updated" != "$current" ]]; then
    if [[ "$DRY_RUN" == "1" ]]; then
      echo "Would update: ${pkg_path#$ROOT/}"
    else
      printf '%s\n' "$updated" > "$pkg_path.tmp" && mv "$pkg_path.tmp" "$pkg_path"
      echo "Updated: ${pkg_path#$ROOT/}"
    fi
  fi
done

