import { NextRequest, NextResponse } from 'next/server';
import { executeQueryOne } from '@/lib/db';
import { EntityMetadata } from '@/lib/metadata/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const unwrappedParams = await params;
    const entityKey = decodeURIComponent(unwrappedParams.key).trim();

    const row = await executeQueryOne<{
      id: string;
      entity_key: string;
      table_name: string;
      schema_definition_json: string;
      version: number;
    }>(
      `SELECT id, entity_key, table_name, schema_definition_json, version
       FROM sys_entities
       WHERE entity_key = ?`,
      [entityKey]
    );

    if (!row) {
      return NextResponse.json(
        {
          success: false,
          error: `Dynamic entity metadata for "${entityKey}" not found in catalog.`,
        },
        { status: 404 }
      );
    }

    const schema: EntityMetadata = JSON.parse(row.schema_definition_json);

    return NextResponse.json({
      success: true,
      data: schema,
      metadata: {
        entityId: row.id,
        version: row.version,
        tableName: row.table_name,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    console.error('Failed to fetch entity metadata:', err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Internal server error while resolving metadata.',
      },
      { status: 500 }
    );
  }
}

