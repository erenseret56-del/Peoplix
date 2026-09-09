/**
 * Company Documents / Knowledge Base
 *
 * Companies can upload documents that the AI agent uses to answer questions.
 * All documents are strictly scoped to company_id.
 *
 * In this version we store text content directly.
 * File storage (S3/R2) can be added later as the storage_path field.
 */
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ObjectId } from 'mongodb';
import type { Document } from 'mongodb';
import { getCollection, Collections } from '../../infrastructure/database/index.js';
import { authenticateJWT } from '../../middleware/auth.js';
import { resolveTenant, getTenantId } from '../../middleware/tenant.js';
import { NotFoundError, ValidationError } from '../../middleware/errorHandler.js';
import { writeAuditLog } from '../audit/audit.logger.js';
import { OfficeParser } from 'officeparser';

interface DocumentDoc extends Document {
  _id?: ObjectId;
  company_id: string;
  title: string;
  type: string;
  description?: string;
  content_text?: string;
  file_name?: string;
  file_size?: number;
  file_type?: string;
  storage_path?: string;
  visibility: string;
  status: string;
  uploaded_by?: string;
  created_at: Date;
  updated_at: Date;
}

const createSchema = z.object({
  title:        z.string().min(1).max(255),
  type:         z.enum(['policy', 'handbook', 'procedure', 'form', 'faq', 'other']).default('other'),
  description:  z.string().optional(),
  content_text: z.string().optional(),   // text content (for AI search)
  file_name:    z.string().optional(),
  visibility:   z.enum(['private', 'public', 'restricted']).default('private'),
});

const updateSchema = createSchema.partial().extend({
  status: z.enum(['active', 'inactive']).optional(),
});

export async function documentsRoutes(fastify: FastifyInstance) {
  const preHandler = [authenticateJWT, resolveTenant];
  const col = () => getCollection<DocumentDoc>(Collections.DOCUMENTS);

  /** GET /api/documents */
  fastify.get('/', { preHandler }, async (request, reply) => {
    const tenantId = getTenantId(request);
    const q = request.query as any;
    const page  = Math.max(1, parseInt(q.page)  || 1);
    const limit = Math.min(100, parseInt(q.limit) || 20);
    const skip  = (page - 1) * limit;

    const filter: any = { company_id: tenantId, status: 'active' };
    if (q.type)   filter.type = q.type;
    if (q.search) {
      const rx = new RegExp(q.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ title: rx }, { description: rx }];
    }

    const [data, total] = await Promise.all([
      col().find(filter)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        // Don't return full content_text in list — only in single fetch
        .project({ content_text: 0 })
        .toArray(),
      col().countDocuments(filter),
    ]);

    return reply.send({
      success: true,
      data: data.map(d => ({ id: (d as any)._id?.toString(), ...d, _id: undefined })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  });

  /** POST /api/documents */
  fastify.post('/', { preHandler }, async (request, reply) => {
    const tenantId = getTenantId(request);
    const user = (request as any).user;
    const parsed = createSchema.safeParse(request.body);
    if (!parsed.success) throw new ValidationError('Invalid input', parsed.error.errors);

    const now = new Date();
    const result = await col().insertOne({
      company_id: tenantId,
      ...parsed.data,
      status: 'active',
      uploaded_by: user.id,
      created_at: now,
      updated_at: now,
    } as any);

    writeAuditLog({
      company_id: tenantId,
      user_id: user.id,
      action: 'document.uploaded',
      entity_type: 'document',
      entity_id: result.insertedId.toString(),
      description: `Document uploaded: ${parsed.data.title}`,
    });

    return reply.status(201).send({
      success: true,
      data: { id: result.insertedId.toString(), title: parsed.data.title, type: parsed.data.type },
      message: 'Document uploaded successfully',
    });
  });

  /** POST /api/documents/upload - extract text from office/PDF files and store it */
  fastify.post('/upload', { preHandler }, async (request, reply) => {
    const tenantId = getTenantId(request);
    const user = (request as any).user;
    const part = await request.file();
    if (!part) throw new ValidationError('A company data file is required');

    const buffer = await part.toBuffer();
    const extension = part.filename.toLowerCase().split('.').pop() || '';
    const plainTextExtensions = new Set(['txt', 'json']);
    const supportedOfficeExtensions = new Set([
      'docx', 'pptx', 'xlsx', 'odt', 'odp', 'ods', 'pdf', 'rtf',
      'md', 'html', 'csv', 'epub',
    ]);

    if (!plainTextExtensions.has(extension) && !supportedOfficeExtensions.has(extension)) {
      throw new ValidationError(
        'Unsupported file format. Use TXT, JSON, DOCX, PPTX, XLSX, PDF, CSV, Markdown, HTML, RTF, ODT, ODP, ODS, or EPUB.'
      );
    }

    const contentText = plainTextExtensions.has(extension)
      ? buffer.toString('utf8').slice(0, 10_000_000)
      : (await OfficeParser.parseOffice(buffer)).toText().slice(0, 10_000_000);
    const now = new Date();
    const result = await col().insertOne({
      company_id: tenantId,
      title: part.filename.replace(/\.[^.]+$/, ''),
      type: 'other',
      description: `Uploaded company knowledge file: ${part.filename}`,
      content_text: contentText,
      file_name: part.filename,
      file_size: buffer.length,
      file_type: part.mimetype,
      visibility: 'private',
      status: 'active',
      uploaded_by: user.id,
      created_at: now,
      updated_at: now,
    } as any);

    writeAuditLog({
      company_id: tenantId,
      user_id: user.id,
      action: 'document.uploaded',
      entity_type: 'document',
      entity_id: result.insertedId.toString(),
      description: `Document uploaded: ${part.filename}`,
    });

    return reply.status(201).send({
      success: true,
      data: { id: result.insertedId.toString(), title: part.filename, extracted_characters: contentText.length },
      message: 'Company file uploaded and text extracted successfully',
    });
  });

  /** GET /api/documents/:id — full content */
  fastify.get('/:id', { preHandler }, async (request, reply) => {
    const tenantId = getTenantId(request);
    const { id } = request.params as { id: string };

    const doc = await col().findOne({ _id: new ObjectId(id), company_id: tenantId });
    if (!doc) throw new NotFoundError('Document not found');

    return reply.send({ success: true, data: { id: doc._id!.toString(), ...doc, _id: undefined } });
  });

  /** PATCH /api/documents/:id */
  fastify.patch('/:id', { preHandler }, async (request, reply) => {
    const tenantId = getTenantId(request);
    const { id } = request.params as { id: string };
    const parsed = updateSchema.safeParse(request.body);
    if (!parsed.success) throw new ValidationError('Invalid input', parsed.error.errors);

    const doc = await col().findOneAndUpdate(
      { _id: new ObjectId(id), company_id: tenantId },
      { $set: { ...parsed.data, updated_at: new Date() } },
      { returnDocument: 'after' }
    );
    if (!doc) throw new NotFoundError('Document not found');

    return reply.send({ success: true, data: { id: doc._id!.toString(), title: doc.title, status: doc.status } });
  });

  /** DELETE /api/documents/:id */
  fastify.delete('/:id', { preHandler }, async (request, reply) => {
    const tenantId = getTenantId(request);
    const { id } = request.params as { id: string };
    const user = (request as any).user;

    const doc = await col().findOne({ _id: new ObjectId(id), company_id: tenantId });
    if (!doc) throw new NotFoundError('Document not found');

    await col().updateOne(
      { _id: new ObjectId(id), company_id: tenantId },
      { $set: { status: 'inactive', updated_at: new Date() } }
    );

    writeAuditLog({
      company_id: tenantId,
      user_id: user.id,
      action: 'document.deleted',
      entity_type: 'document',
      entity_id: id,
      description: `Document deleted: ${doc.title}`,
    });

    return reply.send({ success: true, message: 'Document deleted' });
  });

  /**
   * GET /api/documents/search?q=...
   * AI-search endpoint — used by Retell function call for document_search feature
   */
  fastify.get('/search/query', { preHandler }, async (request, reply) => {
    const tenantId = getTenantId(request);
    const q = request.query as any;
    if (!q.q) return reply.send({ success: true, data: [] });

    const regex = new RegExp(q.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

    const results = await col()
      .find({
        company_id: tenantId,   // TENANT ISOLATION
        status: 'active',
        $or: [
          { title: regex },
          { description: regex },
          { content_text: regex },
        ],
      })
      .limit(3)
      .project({ content_text: { $substr: ['$content_text', 0, 500] }, title: 1, type: 1, description: 1 })
      .toArray();

    return reply.send({ success: true, data: results });
  });
}
