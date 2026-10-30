import { NextRequest, NextResponse } from 'next/server';
import { executeQueryOne, executeRun } from '@/lib/db';
import { EntityMetadata } from '@/lib/metadata/types';
import { authenticateRequest } from '@/lib/api/rbac';
import { problemResponse, successResponse } from '@/lib/api/errors';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const unwrappedParams = await params;
    const entityKey = decodeURIComponent(unwrappedParams.key).trim();

    // Check Cloudflare KV cache first
    const kv = (globalThis as any).METADATA_KV;
    if (kv && typeof kv.get === 'function') {
      try {
        const cached = await kv.get(`meta:${entityKey}`, 'json');
        if (cached) {
          return successResponse(cached.data, {
            ...cached.metadata,
            source: 'KV_CACHE',
          });
        }
      } catch (e) {}
    }

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
      return problemResponse({
        status: 404,
        type: 'https://api.akspropertychecklist.in/errors/METADATA_NOT_FOUND',
        title: 'Metadata Entity Not Found',
        detail: `Dynamic entity metadata for "${entityKey}" not found in catalog.`,
        req: request,
      });
    }

    const schema: EntityMetadata = JSON.parse(row.schema_definition_json);

    const payload = {
      data: schema,
      metadata: {
        entityId: row.id,
        version: row.version,
        tableName: row.table_name,
        timestamp: new Date().toISOString(),
        source: 'D1_PRIMARY',
      },
    };

    // Cache in Cloudflare KV if binding exists
    if (kv && typeof kv.put === 'function') {
      try {
        await kv.put(`meta:${entityKey}`, JSON.stringify(payload), {
          expirationTtl: 86400, // 24 hours
        });
      } catch (e) {}
    }

    return successResponse(payload.data, payload.metadata);
  } catch (err: any) {
    console.error('Failed to fetch entity metadata:', err);
    return problemResponse({
      status: 500,
      type: 'https://api.akspropertychecklist.in/errors/METADATA_ERROR',
      title: 'Metadata Resolution Error',
      detail: err.message || 'Internal server error while resolving metadata.',
      req: request,
    });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    // Requires SUPER_ADMIN capability 'meta:configure'
    const { response } = await authenticateRequest(request, 'meta:configure');
    if (response) return response;

    const unwrappedParams = await params;
    const entityKey = decodeURIComponent(unwrappedParams.key).trim();
    const body = await request.json().catch(() => null);

    if (!body || !body.fields) {
      return problemResponse({
        status: 400,
        type: 'https://api.akspropertychecklist.in/errors/INVALID_SCHEMA',
        title: 'Invalid Schema Payload',
        detail: 'Metadata schema must include a valid "fields" dictionary.',
        req: request,
      });
    }

    const schemaJson = JSON.stringify(body);

    const updated = await executeRun(
      `UPDATE sys_entities
       SET schema_definition_json = ?, version = version + 1, updated_at = CURRENT_TIMESTAMP
       WHERE entity_key = ?;`,
      [schemaJson, entityKey]
    );

    if (!updated) {
      return problemResponse({
        status: 404,
        type: 'https://api.akspropertychecklist.in/errors/METADATA_NOT_FOUND',
        title: 'Entity Not Found',
        detail: `Cannot update. Dynamic entity "${entityKey}" not found.`,
        req: request,
      });
    }

    // Instant KV Cache Invalidation
    const kv = (globalThis as any).METADATA_KV;
    if (kv && typeof kv.delete === 'function') {
      try {
        await kv.delete(`meta:${entityKey}`);
      } catch (e) {}
    }

    return successResponse({
      entityKey,
      message: `Metadata schema for "${entityKey}" updated and cache invalidated.`,
    });
  } catch (err: any) {
    console.error('Failed to update entity metadata:', err);
    return problemResponse({
      status: 500,
      type: 'https://api.akspropertychecklist.in/errors/METADATA_UPDATE_FAILED',
      title: 'Update Failed',
      detail: err.message || 'An unexpected error occurred during metadata update.',
      req: request,
    });
  }
}
