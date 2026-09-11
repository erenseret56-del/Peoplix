/**
 * Site Configuration Module
 *
 * Super-admin can manage:
 *  - Website logo (uploaded as multipart, stored as base64 data URL in MongoDB)
 *  - Demo video URL (YouTube, Vimeo, or direct URL)
 *  - Knowledge documents for the public demo AI (re-uses /api/documents upload)
 *
 * Public endpoint serves logo + video URL to the landing page without auth.
 * The landing page "Start Live Demo Call" creates a Retell web call using
 * the global agent — no company tenant required for the public demo.
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getCollection } from '../../infrastructure/database/index.js';
import { authenticateJWT, requireSuperAdmin } from '../../middleware/auth.js';
import { ValidationError } from '../../middleware/errorHandler.js';
import { logger } from '../../config/logger.js';
import { config } from '../../config/env.js';
import { retellClient } from '../retell/retell.client.js';
import { OfficeParser } from 'officeparser';

const COLLECTION = 'site_config';
const CONFIG_ID  = 'global';

interface SiteKnowledgeDocument {
  id: string;
  title: string;
  description?: string;
  content_text: string;
  file_name?: string;
  file_type?: string;
  file_size?: number;
  created_at: Date;
}

interface SiteConfigDoc {
  _id: string;
  logo_data_url: string | null;   // base64 data URL e.g. "data:image/png;base64,..."
  logo_filename: string | null;
  video_url: string | null;       // external video URL or data URL
  video_filename: string | null;
  knowledge_documents: SiteKnowledgeDocument[];
  updated_at: Date;
  updated_by: string;
}

const updateVideoSchema = z.object({
  video_url: z.string().url('Must be a valid URL').or(z.literal('')),
});

// ── helpers ──────────────────────────────────────────────────────────────────

async function getConfig(): Promise<SiteConfigDoc> {
  const col = getCollection<SiteConfigDoc>(COLLECTION);
  const doc = await col.findOne({ _id: CONFIG_ID } as any);
  return doc || {
    _id: CONFIG_ID,
    logo_data_url: null,
    logo_filename: null,
    video_url: null,
    video_filename: null,
    knowledge_documents: [],
    updated_at: new Date(),
    updated_by: 'system',
  };
}

async function extractKnowledgeText(fileName: string, buffer: Buffer): Promise<string> {
  const extension = fileName.toLowerCase().split('.').pop() || '';
  const plainTextExtensions = new Set(['txt', 'json', 'md', 'csv', 'html', 'rtf']);
  const supportedOfficeExtensions = new Set([
    'docx', 'pptx', 'xlsx', 'odt', 'odp', 'ods', 'pdf', 'epub',
  ]);

  if (!plainTextExtensions.has(extension) && !supportedOfficeExtensions.has(extension)) {
    throw new ValidationError('Unsupported file format. Use TXT, JSON, DOCX, PPTX, XLSX, PDF, CSV, Markdown, HTML, RTF, ODT, ODP, ODS, or EPUB.');
  }

  if (plainTextExtensions.has(extension)) {
    return buffer.toString('utf8').slice(0, 10_000_000);
  }

  return (await OfficeParser.parseOffice(buffer)).toText().slice(0, 10_000_000);
}

// ── routes ───────────────────────────────────────────────────────────────────

export async function siteConfigRoutes(fastify: FastifyInstance) {

  // ─────────────────────────────────────────────────────────────────────────
  // PUBLIC — landing page fetches these without auth
  // ─────────────────────────────────────────────────────────────────────────

  /** GET /api/site-config/public */
  fastify.get('/public', async (_request, reply) => {
    const cfg = await getConfig();
    return reply.send({
      success: true,
      data: {
        logo_data_url: cfg.logo_data_url,
        video_url:     cfg.video_url,
      },
    });
  });

  /**
   * POST /api/site-config/public/start-call
   *
   * Landing page "Start Live Demo Call" — no auth required.
   * Uses the global RETELL_AGENT_ID from env vars.
   * Returns only the access_token to the frontend.
   */
  fastify.post('/public/start-call', { config: { rateLimit: { max: 3, timeWindow: 10 * 60 * 1000 } } }, async (_request, reply) => {
    const agentId = config.retell.agentId;
    if (!agentId) {
      return reply.status(503).send({
        success: false,
        error: { code: 'NOT_CONFIGURED', message: 'Demo call is not configured yet. Please contact support.' },
      });
    }

    try {
      const cfg = await getConfig();
      const publicDocs = cfg.knowledge_documents || [];
      const knowledgeContext = [
        'Public demo knowledge base:',
        ...publicDocs.map(doc => [
          `Document: ${doc.title || 'Untitled'}`,
          doc.description || '',
          doc.content_text || '',
        ].filter(Boolean).join('\n')),
      ].join('\n\n').slice(0, 100000);

      let agentName = 'Peoplix AI Agent';
      try {
        const agent = await retellClient.getAgent(agentId);
        if (agent?.agent_name) agentName = agent.agent_name;
      } catch (err) {
        logger.warn({ err, agentId }, 'Failed to load Retell agent name; using fallback demo label');
      }

      const webCall = await retellClient.createWebCall(
        agentId,
        'public-demo',
        {
          company_name: 'Peoplix',
          company_description: 'AI voice agents for enterprise HR operations. We help HR teams resolve employee requests instantly using conversational AI.',
          receptionist_name: config.app.receptionistName,
          greeting_name: config.app.receptionistName,
          company_email: '',
          company_phone: '',
          company_website: 'https://peoplix.ai',
          company_address: '',
          company_knowledge: knowledgeContext,
        }
      );

      logger.info({ callId: webCall.call_id, agentId, receptionistName: config.app.receptionistName, docs: publicDocs.length }, 'Public demo web call created');

      return reply.send({
        success: true,
        data: {
          access_token: webCall.access_token,
          call_id: webCall.call_id,
          agent_id: agentId,
          agent_name: agentName,
        },
      });
    } catch (err) {
      logger.error({ err }, 'Failed to create public demo web call');
      return reply.status(500).send({
        success: false,
        error: { code: 'CALL_FAILED', message: 'Failed to start demo call. Please try again.' },
      });
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // SUPER ADMIN — protected routes
  // ─────────────────────────────────────────────────────────────────────────

  const adminHandler = [authenticateJWT, requireSuperAdmin];

  /** GET /api/site-config — full config for admin panel */
  fastify.get('/', { preHandler: adminHandler }, async (_request, reply) => {
    const cfg = await getConfig();
    return reply.send({ success: true, data: cfg });
  });

  /** GET /api/site-config/documents — public knowledge docs for landing-page demo */
  fastify.get('/documents', { preHandler: adminHandler }, async (_request, reply) => {
    const cfg = await getConfig();
    return reply.send({ success: true, data: cfg.knowledge_documents || [] });
  });

  /** POST /api/site-config/documents/upload */
  fastify.post('/documents/upload', { preHandler: adminHandler }, async (request, reply) => {
    const user = (request as any).user;
    const part = await request.file();
    if (!part) throw new ValidationError('A document file is required');

    const extension = (part.filename.split('.').pop() || '').toLowerCase();
    const valid = new Set(['pdf', 'docx', 'pptx', 'xlsx', 'txt', 'csv', 'md', 'html', 'rtf', 'odt', 'odp', 'ods', 'epub']);
    if (!valid.has(extension)) {
      throw new ValidationError('Unsupported file format. Use PDF, DOCX, PPTX, XLSX, TXT, CSV, Markdown, HTML, RTF, ODT, ODP, ODS, or EPUB.');
    }

    const buffer = await part.toBuffer();
    const contentText = await extractKnowledgeText(part.filename, buffer);
    const doc: SiteKnowledgeDocument = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: part.filename.replace(/\.[^.]+$/, ''),
      description: `Uploaded demo knowledge file: ${part.filename}`,
      content_text: contentText,
      file_name: part.filename,
      file_type: part.mimetype,
      file_size: buffer.length,
      created_at: new Date(),
    };

    const col = getCollection<SiteConfigDoc>(COLLECTION);
    const cfg = await getConfig();
    const docs = cfg.knowledge_documents || [];
    await col.updateOne(
      { _id: CONFIG_ID } as any,
      { $set: {
        knowledge_documents: [doc, ...docs],
        updated_at: new Date(),
        updated_by: user.id,
      } },
      { upsert: true }
    );

    logger.info({ filename: part.filename, size: buffer.length, userId: user.id }, 'Public demo knowledge document uploaded');
    return reply.send({ success: true, data: { id: doc.id, title: doc.title, extracted_characters: contentText.length }, message: 'Document uploaded successfully' });
  });

  /** DELETE /api/site-config/documents/:id */
  fastify.delete('/documents/:id', { preHandler: adminHandler }, async (request, reply) => {
    const user = (request as any).user;
    const { id } = request.params as { id: string };
    const col = getCollection<SiteConfigDoc>(COLLECTION);
    const cfg = await getConfig();
    const existingDocs = cfg.knowledge_documents || [];
    const docs = existingDocs.filter(doc => {
      const document = doc as SiteKnowledgeDocument & { _id?: string };
      return document.id !== id && String(document._id || '') !== id;
    });
    if (docs.length === existingDocs.length) {
      throw new ValidationError('Knowledge document not found');
    }
    await col.updateOne(
      { _id: CONFIG_ID } as any,
      { $set: { knowledge_documents: docs, updated_at: new Date(), updated_by: user.id } },
      { upsert: true }
    );
    return reply.send({ success: true, message: 'Document deleted' });
  });

  /**
   * POST /api/site-config/logo
   * Upload new logo (multipart/form-data, field: "logo")
   * Converts to base64 data URL and stores in MongoDB.
   */
  fastify.post('/logo', { preHandler: adminHandler }, async (request, reply) => {
    const user = (request as any).user;
    const part = await request.file();
    if (!part) throw new ValidationError('Logo file is required');

    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'image/gif'];
    if (!allowedTypes.includes(part.mimetype)) {
      throw new ValidationError('Logo must be PNG, JPEG, WebP, SVG, or GIF');
    }

    const buffer = await part.toBuffer();
    if (buffer.length > 2 * 1024 * 1024) {
      throw new ValidationError('Logo file must be under 2MB');
    }

    const base64   = buffer.toString('base64');
    const dataUrl  = `data:${part.mimetype};base64,${base64}`;

    const col = getCollection<SiteConfigDoc>(COLLECTION);
    await col.updateOne(
      { _id: CONFIG_ID } as any,
      {
        $set: {
          logo_data_url: dataUrl,
          logo_filename: part.filename,
          updated_at:    new Date(),
          updated_by:    user.id,
        },
      },
      { upsert: true }
    );

    logger.info({ filename: part.filename, size: buffer.length, userId: user.id }, 'Site logo updated');

    return reply.send({
      success: true,
      data:    { logo_data_url: dataUrl, filename: part.filename },
      message: 'Logo updated successfully',
    });
  });

  /** DELETE /api/site-config/logo — revert to default bundled logo */
  fastify.delete('/logo', { preHandler: adminHandler }, async (request, reply) => {
    const user = (request as any).user;
    const col  = getCollection<SiteConfigDoc>(COLLECTION);
    await col.updateOne(
      { _id: CONFIG_ID } as any,
      { $set: { logo_data_url: null, logo_filename: null, updated_at: new Date(), updated_by: user.id } },
      { upsert: true }
    );
    return reply.send({ success: true, message: 'Logo reset to default' });
  });

  /**
   * PUT /api/site-config/video
   * Set demo video URL (YouTube, Vimeo, direct MP4 URL, or empty to remove)
   */
  fastify.put('/video', { preHandler: adminHandler }, async (request, reply) => {
    const user   = (request as any).user;
    const parsed = updateVideoSchema.safeParse(request.body);
    if (!parsed.success) throw new ValidationError('Invalid input', parsed.error.errors);

    const col = getCollection<SiteConfigDoc>(COLLECTION);
    await col.updateOne(
      { _id: CONFIG_ID } as any,
      { $set: { video_url: parsed.data.video_url || null, updated_at: new Date(), updated_by: user.id } },
      { upsert: true }
    );

    return reply.send({
      success: true,
      data:    { video_url: parsed.data.video_url || null },
      message: 'Video URL updated',
    });
  });

  /** DELETE /api/site-config/video */
  fastify.delete('/video', { preHandler: adminHandler }, async (request, reply) => {
    const user = (request as any).user;
    const col  = getCollection<SiteConfigDoc>(COLLECTION);
    await col.updateOne(
      { _id: CONFIG_ID } as any,
      { $set: { video_url: null, updated_at: new Date(), updated_by: user.id } },
      { upsert: true }
    );
    return reply.send({ success: true, message: 'Video removed' });
  });
}
