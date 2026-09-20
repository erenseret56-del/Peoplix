import { getCollection } from '../../infrastructure/database/index.js';
import { config } from '../../config/env.js';
import { logger } from '../../config/logger.js';
import { retellClient } from '../retell/retell.client.js';

interface PublicKnowledgeDocument {
  title?: string;
  description?: string;
  content_text?: string;
}

/**
 * The one server-side creator for Ava's public/demo web calls. Both the
 * homepage and Conference use this deliberately: Conference adds only its
 * isolated session metadata and timing policy, never a second Retell setup.
 */
export async function createPublicDemoWebCall(metadata?: Record<string, string>) {
  const agentId = config.retell.agentId;
  if (!agentId) throw new Error('Public demo agent is not configured');

  const cfg = await getCollection<{ knowledge_documents?: PublicKnowledgeDocument[] }>('site_config')
    .findOne({ _id: 'global' } as never);
  const publicDocs = cfg?.knowledge_documents || [];
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

  const webCall = await retellClient.createWebCall(agentId, 'public-demo', {
    company_name: 'Peoplix',
    company_description: 'AI voice agents for enterprise HR operations. We help HR teams resolve employee requests instantly using conversational AI.',
    receptionist_name: config.app.receptionistName,
    greeting_name: config.app.receptionistName,
    company_email: '', company_phone: '', company_website: 'https://peoplix.ai', company_address: '',
    company_knowledge: knowledgeContext,
  }, metadata);

  return { webCall, agentId, agentName, documents: publicDocs.length };
}
