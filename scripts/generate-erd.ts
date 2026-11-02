import * as fs from 'fs';
import * as path from 'path';

interface RelationInfo {
  name?: string;
  targetModel: string;
  fields: string[];
  references: string[];
  onDelete?: string;
}

interface FieldInfo {
  name: string;
  type: string;
  isOptional: boolean;
  isArray: boolean;
  isId: boolean;
  isUnique: boolean;
  isUuid: boolean;
  isFk: boolean;
  relation?: RelationInfo;
}

interface ModelInfo {
  name: string;
  tableName?: string;
  fileName: string;
  fields: FieldInfo[];
  compoundPrimaryKeys: string[];
  compoundUniques: string[][];
}

interface EnumInfo {
  name: string;
  fileName: string;
  values: string[];
}

const SCHEMA_DIR = path.resolve(process.cwd(), 'prisma/schema');
const OUTPUT_FILE = path.resolve(process.cwd(), 'ERD.md');

function toSnakeCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .toLowerCase();
}

function parseSchemas(): { models: Map<string, ModelInfo>; enums: Map<string, EnumInfo> } {
  const models = new Map<string, ModelInfo>();
  const enums = new Map<string, EnumInfo>();

  if (!fs.existsSync(SCHEMA_DIR)) {
    throw new Error(`Schema directory not found at: ${SCHEMA_DIR}`);
  }

  const files = fs.readdirSync(SCHEMA_DIR).filter((f) => f.endsWith('.prisma'));

  for (const file of files) {
    const filePath = path.join(SCHEMA_DIR, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split(/\r?\n/);

    let currentModel: ModelInfo | null = null;
    let currentEnum: EnumInfo | null = null;

    for (const rawLine of lines) {
      const line = rawLine.trim();

      // Skip comments or empty lines
      if (!line || line.startsWith('//') || line.startsWith('///')) {
        continue;
      }

      // Check model start
      const modelMatch = line.match(/^model\s+(\w+)\s+\{/);
      if (modelMatch) {
        currentModel = {
          name: modelMatch[1],
          fileName: file,
          fields: [],
          compoundPrimaryKeys: [],
          compoundUniques: [],
        };
        models.set(currentModel.name, currentModel);
        continue;
      }

      // Check enum start
      const enumMatch = line.match(/^enum\s+(\w+)\s+\{/);
      if (enumMatch) {
        currentEnum = {
          name: enumMatch[1],
          fileName: file,
          values: [],
        };
        enums.set(currentEnum.name, currentEnum);
        continue;
      }

      // Check block end
      if (line === '}') {
        currentModel = null;
        currentEnum = null;
        continue;
      }

      // Parse Enum values
      if (currentEnum) {
        const valMatch = line.match(/^(\w+)/);
        if (valMatch) {
          currentEnum.values.push(valMatch[1]);
        }
        continue;
      }

      // Parse Model content
      if (currentModel) {
        // Table map: @@map("table_name")
        const mapMatch = line.match(/^@@map\("([^"]+)"\)/);
        if (mapMatch) {
          currentModel.tableName = mapMatch[1];
          continue;
        }

        // Compound PK: @@id([field1, field2])
        const idMatch = line.match(/^@@id\(\[([^\]]+)\]\)/);
        if (idMatch) {
          const keys = idMatch[1].split(',').map((k) => k.trim());
          currentModel.compoundPrimaryKeys.push(...keys);
          continue;
        }

        // Compound Unique: @@unique([field1, field2])
        const uniqueMatch = line.match(/^@@unique\(\[([^\]]+)\]\)/);
        if (uniqueMatch) {
          const keys = uniqueMatch[1].split(',').map((k) => k.trim());
          currentModel.compoundUniques.push(keys);
          continue;
        }

        // Ignore other @@ directives
        if (line.startsWith('@@')) {
          continue;
        }

        // Field match: name type? attributes
        const fieldMatch = line.match(/^(\w+)\s+(\w+)(\?|\[\])?(.*)$/);
        if (fieldMatch) {
          const [, name, type, modifier, rest] = fieldMatch;
          const isOptional = modifier === '?';
          const isArray = modifier === '[]';
          const isId = /@id\b/.test(rest);
          const isUnique = /@unique\b/.test(rest);
          const isUuid = /@db\.Uuid\b/.test(rest) || /@default\(uuid\(\)\)/.test(rest);

          let relation: RelationInfo | undefined = undefined;
          const relMatch = rest.match(/@relation\((.*)\)/);
          if (relMatch) {
            const relBody = relMatch[1];
            const nameMatch = relBody.match(/"([^"]+)"/);
            const fieldsMatch = relBody.match(/fields:\s*\[([^\]]+)\]/);
            const refMatch = relBody.match(/references:\s*\[([^\]]+)\]/);
            const onDeleteMatch = relBody.match(/onDelete:\s*(\w+)/);

            relation = {
              name: nameMatch ? nameMatch[1] : undefined,
              targetModel: type,
              fields: fieldsMatch ? fieldsMatch[1].split(',').map((f) => f.trim()) : [],
              references: refMatch ? refMatch[1].split(',').map((r) => r.trim()) : [],
              onDelete: onDeleteMatch ? onDeleteMatch[1] : undefined,
            };
          }

          currentModel.fields.push({
            name,
            type,
            isOptional,
            isArray,
            isId,
            isUnique,
            isUuid,
            isFk: false,
            relation,
          });
        }
      }
    }
  }

  // Second pass: Mark foreign keys, primary keys, and UUID status
  for (const model of models.values()) {
    // Mark compound primary keys
    for (const pkName of model.compoundPrimaryKeys) {
      const field = model.fields.find((f) => f.name === pkName);
      if (field) {
        field.isId = true;
      }
    }

    // Mark foreign key fields from relations
    for (const field of model.fields) {
      if (field.relation && field.relation.fields.length > 0) {
        for (const fkName of field.relation.fields) {
          const fkField = model.fields.find((f) => f.name === fkName);
          if (fkField) {
            fkField.isFk = true;
            // Target key check for UUID
            const targetModel = models.get(field.relation.targetModel);
            if (targetModel) {
              const targetPkField = targetModel.fields.find(
                (f) => f.isId || f.name === field.relation!.references[0]
              );
              if (targetPkField && (targetPkField.isUuid || targetPkField.name === 'id')) {
                fkField.isUuid = true;
              }
            }
          }
        }
      }
    }
  }

  return { models, enums };
}

function mapMermaidType(field: FieldInfo, enums: Map<string, EnumInfo>): string {
  if (field.isUuid) {
    return 'uuid';
  }
  switch (field.type) {
    case 'String':
      return 'string';
    case 'Int':
      return 'int';
    case 'BigInt':
      return 'bigint';
    case 'Float':
      return 'float';
    case 'Decimal':
      return 'decimal';
    case 'Boolean':
      return 'boolean';
    case 'DateTime':
      return 'datetime';
    case 'Json':
      return 'json';
    default:
      if (enums.has(field.type)) {
        return field.type;
      }
      return field.type.toLowerCase();
  }
}

function generateErdMarkdown(): string {
  const { models, enums } = parseSchemas();
  const modelNames = new Set(models.keys());

  interface MermaidRelation {
    from: string;
    to: string;
    cardinality: string;
    label: string;
    group: string;
  }

  const relations: MermaidRelation[] = [];

  for (const [modelName, model] of models.entries()) {
    for (const field of model.fields) {
      if (field.relation && field.relation.fields.length > 0 && modelNames.has(field.type)) {
        const targetModelName = field.type;
        const targetModel = models.get(targetModelName);
        const fkFieldName = field.relation.fields[0];
        const fkField = model.fields.find((f) => f.name === fkFieldName);

        // Check if 1-to-1: either fkField has @unique or is in single-column compoundUniques
        const isUniqueFk =
          (fkField && fkField.isUnique) ||
          model.compoundUniques.some((u) => u.length === 1 && u[0] === fkFieldName);

        let cardinality = '||--o{';
        if (isUniqueFk) {
          cardinality = fkField && fkField.isOptional ? '||--o|' : '||--||';
        } else {
          cardinality = fkField && !fkField.isOptional ? '||--|{' : '||--o{';
        }

        // Determine label:
        // 1. Explicit relation name: "OrderConfirmedBy" -> "confirmed_by"
        // 2. Parent's opposite field: e.g. Order has `items OrderItem[]` -> "items"
        // 3. Child's relation field: e.g. "order", "variant"
        let label = '';
        if (field.relation.name) {
          label = toSnakeCase(field.relation.name);
        } else if (targetModel) {
          // Find field on parent pointing to this child model
          const parentField = targetModel.fields.find(
            (f) => f.type === modelName || (f.isArray && f.type === modelName)
          );
          if (parentField) {
            label = toSnakeCase(parentField.name);
          } else {
            label = toSnakeCase(field.name);
          }
        } else {
          label = toSnakeCase(field.name);
        }

        relations.push({
          from: targetModelName,
          to: modelName,
          cardinality,
          label,
          group: model.fileName.replace('.prisma', ''),
        });
      }
    }
  }

  // Group models by schema file
  const fileGroups: { [file: string]: ModelInfo[] } = {};
  for (const model of models.values()) {
    if (!fileGroups[model.fileName]) {
      fileGroups[model.fileName] = [];
    }
    fileGroups[model.fileName].push(model);
  }

  // Preferred order of modules
  const preferredFileOrder = [
    'user.prisma',
    'product.prisma',
    'inventory.prisma',
    'order.prisma',
    'shipment.prisma',
    'payment.prisma',
    'cart_wishlist.prisma',
    'sales.prisma',
    'audit.prisma',
  ];

  const sortedFiles = Object.keys(fileGroups).sort((a, b) => {
    const idxA = preferredFileOrder.indexOf(a);
    const idxB = preferredFileOrder.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b);
  });

  // Calculate statistics
  let totalAttributes = 0;
  for (const m of models.values()) {
    for (const f of m.fields) {
      if (!modelNames.has(f.type) && !f.isArray) {
        totalAttributes++;
      }
    }
  }

  const lines: string[] = [];
  lines.push('# Database Entity-Relationship (ER) Diagram');
  lines.push('');
  lines.push(
    `> **Automated Architecture Artifact**: Generated automatically from \`prisma/schema/*.prisma\` via \`npm run erd:generate\`.`
  );
  lines.push(
    `> **Statistics**: **${models.size} Models**, **${totalAttributes} Attributes**, **${relations.length} Relationships**, **${enums.size} Enums**.`
  );
  lines.push('');
  lines.push('```mermaid');
  lines.push('erDiagram');
  lines.push('    %% ==========================================');
  lines.push('    %% RELATIONSHIPS');
  lines.push('    %% ==========================================');
  lines.push('');

  // Sort relations for consistent output
  relations.sort((a, b) => {
    if (a.from !== b.from) return a.from.localeCompare(b.from);
    if (a.to !== b.to) return a.to.localeCompare(b.to);
    return a.label.localeCompare(b.label);
  });

  let lastFrom = '';
  for (const rel of relations) {
    if (rel.from !== lastFrom) {
      lines.push(`    %% ${rel.from} relations`);
      lastFrom = rel.from;
    }
    lines.push(`    ${rel.from} ${rel.cardinality} ${rel.to} : "${rel.label}"`);
  }

  lines.push('');
  lines.push('    %% ==========================================');
  lines.push('    %% COMPLETE MODEL DEFINITIONS (ALL FIELDS)');
  lines.push('    %% ==========================================');

  for (const file of sortedFiles) {
    const groupModels = fileGroups[file];
    lines.push('');
    lines.push(`    %% ------------------------------------------`);
    lines.push(`    %% Module: ${file}`);
    lines.push(`    %% ------------------------------------------`);

    for (const model of groupModels) {
      lines.push('');
      lines.push(`    ${model.name} {`);

      const columnFields = model.fields.filter(
        (f) => !modelNames.has(f.type) && !f.isArray
      );

      for (const field of columnFields) {
        const typeStr = mapMermaidType(field, enums);
        let keyConstraint = '';
        if (field.isId) {
          keyConstraint = ' PK';
        } else if (field.isFk) {
          keyConstraint = ' FK';
        }
        lines.push(`        ${typeStr} ${field.name}${keyConstraint}`);
      }

      lines.push(`    }`);
    }
  }

  lines.push('```');
  lines.push('');

  // Append Models Directory Table
  lines.push('## Data Models Reference');
  lines.push('');
  lines.push('| Model | Module File | Attributes | Primary Key | Description / Remarks |');
  lines.push('| :--- | :--- | :---: | :--- | :--- |');

  for (const file of sortedFiles) {
    for (const model of fileGroups[file]) {
      const colCount = model.fields.filter((f) => !modelNames.has(f.type) && !f.isArray).length;
      const pks = model.compoundPrimaryKeys.length > 0 
        ? model.compoundPrimaryKeys.join(', ')
        : (model.fields.find((f) => f.isId)?.name || 'id');
      lines.push(`| **${model.name}** | \`${model.fileName}\` | ${colCount} | \`${pks}\` | ${model.tableName ? `Mapped to \`${model.tableName}\`` : 'Base entity'} |`);
    }
  }

  lines.push('');
  lines.push('## Enums Reference');
  lines.push('');
  lines.push('| Enum Name | Source Module | Permitted Values |');
  lines.push('| :--- | :--- | :--- |');

  const sortedEnums = Array.from(enums.values()).sort((a, b) => a.name.localeCompare(b.name));
  for (const e of sortedEnums) {
    lines.push(`| **${e.name}** | \`${e.fileName}\` | \`${e.values.join('`, `')}\` |`);
  }
  lines.push('');

  return lines.join('\n');
}

// Main execution
try {
  console.log('🔄 Parsing Prisma schemas from:', SCHEMA_DIR);
  const markdown = generateErdMarkdown();
  fs.writeFileSync(OUTPUT_FILE, markdown, 'utf-8');
  console.log('✅ Successfully generated ERD.md at:', OUTPUT_FILE);
} catch (err) {
  console.error('❌ Error generating ERD:', err);
  process.exit(1);
}
