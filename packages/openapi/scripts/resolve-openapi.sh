#!/usr/bin/env bash
set -e

TARGET="src/openapi.json"
LOCAL_API_JSON="../../apps/api/dist/api-json/v1.json"
DEFAULT_URL=${OPENAPI_URL:-http://127.0.0.1:3333/api-json/v1}

mkdir -p src

# Priority 1: use local NestJS build artifact
if [ -f "$LOCAL_API_JSON" ]; then
  echo "📘 Using local API schema from $LOCAL_API_JSON"
  cp "$LOCAL_API_JSON" "$TARGET"
  exit 0
fi

# Priority 2: try fetching from running API
echo "🌐 Fetching $DEFAULT_URL"
if curl -fsSLo "$TARGET" "$DEFAULT_URL"; then
  echo "✅ Downloaded OpenAPI schema from running API"
  exit 0
else
  echo "⚠️ Skipping OpenAPI fetch (server unavailable)"
  exit 0
fi
