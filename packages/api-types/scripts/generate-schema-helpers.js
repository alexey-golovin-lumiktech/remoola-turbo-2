#!/usr/bin/env node
// Vercel-safe helper generation: this script only reads the checked-in Prisma
// schema and emits TypeScript. It does not require a live database connection.
const fs = require('node:fs');
const path = require('node:path');

const packageRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(packageRoot, '..', '..');
const schemaPath = path.join(repoRoot, 'packages', 'database-2', 'prisma', 'schema.prisma');
const outputPath = path.join(packageRoot, 'src', 'schema', 'models.ts');

function readSchema() {
  return fs.readFileSync(schemaPath, 'utf8');
}

function parseModels(schema) {
  const lines = schema.split(/\r?\n/);
  const models = [];
  let currentModel = null;

  for (const line of lines) {
    const modelMatch = line.match(/^model\s+(\w+)\s*\{$/);
    if (modelMatch) {
      currentModel = {
        name: modelMatch[1],
        bodyLines: [],
      };
      models.push(currentModel);
      continue;
    }

    if (currentModel && line.trim() === '}') {
      currentModel = null;
      continue;
    }

    if (currentModel) currentModel.bodyLines.push(line);
  }

  const modelNames = new Set(models.map((model) => model.name));

  return models.map((model) => {
    const relations = [];
    const compositeIdFields = [];

    for (const rawLine of model.bodyLines) {
      const line = rawLine.trim();
      if (!line || line.startsWith('//') || line.startsWith('///')) continue;

      const compositeIdMatch = line.match(/^@@id\(\[([^\]]+)\]/);
      if (compositeIdMatch) {
        const fields = compositeIdMatch[1]
          .split(',')
          .map((field) => field.trim())
          .filter(Boolean);
        if (fields.length > 1) compositeIdFields.push(...fields);
        continue;
      }

      if (line.startsWith('@@')) continue;
      if (line.startsWith('@')) continue;

      const sanitizedLine = line.split('//')[0].trim();
      if (!sanitizedLine) continue;

      const [fieldName, fieldType] = sanitizedLine.split(/\s+/, 3);
      if (!fieldName || !fieldType) continue;

      const normalizedType = fieldType.replace(/\?|\[\]/g, '');
      if (modelNames.has(normalizedType)) relations.push(fieldName);
    }

    return {
      name: model.name,
      relations,
      compositeIdFields,
    };
  });
}

function formatWithRelations(model) {
  if (model.relations.length === 0) {
    return `export type ${model.name}WithRelations = Prisma.${model.name}GetPayload<{}>;`;
  }

  const includeLines = model.relations.map((relation) => `    ${relation}: true;`);
  return [
    `export type ${model.name}WithRelations = Prisma.${model.name}GetPayload<{`,
    `  include: {`,
    ...includeLines,
    `  };`,
    `}>;`,
  ].join('\n');
}

function formatCompositeKey(model) {
  if (model.compositeIdFields.length === 0) return null;
  const pickFields = model.compositeIdFields.map((field) => `\`${field}\``).join(' | ');
  return `export type ${model.name}Key = Pick<Prisma.${model.name}GetPayload<{}>, ${pickFields}>;`;
}

function generateContent(models) {
  const blocks = [
    `import type { Prisma } from '@remoola/database-2';`,
    ``,
    `// This file is auto-generated from packages/database-2/prisma/schema.prisma.`,
    `// Run \`yarn schema:generate:helpers\` from the repo root to regenerate it.`,
    `/* eslint-disable @typescript-eslint/no-empty-object-type */`,
    ``,
  ];

  for (const model of models) {
    blocks.push(formatWithRelations(model));
    const compositeKey = formatCompositeKey(model);
    if (compositeKey) blocks.push(compositeKey);
    blocks.push(``);
  }

  return `${blocks.join('\n').trimEnd()}\n`;
}

function main() {
  const schema = readSchema();
  const models = parseModels(schema);
  const content = generateContent(models);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, content, 'utf8');
}

main();
