import { config } from '../../config/env.js';
import { logger } from '../../config/logger.js';
import { RetellDynamicVariables } from '../ai-config/ai-config.types.js';

const RETELL_BASE_URL = 'https://api.retellai.com';

export interface RetellWebCallResponse {
  call_id: string;
  access_token: string;
  agent_id: string;
  call_status: string;
}

export interface RetellAgentResponse {
  agent_id: string;
  agent_name: string;
  llm_websocket_url?: string;
  voice_id?: string;
  response_engine?: { type: string; llm_id?: string };
  created_at: number;
  last_modification_timestamp: number;
}

export interface RetellCallInfo {
  call_id: string;
  call_status: string;
  agent_id: string;
  call_type?: string;
  from_number?: string;
  to_number?: string;
  start_timestamp?: number;
  end_timestamp?: number;
  duration_ms?: number;
  transcript?: string;
  call_analysis?: {
    call_summary?: string;
    user_sentiment?: string;
    call_successful?: boolean;
  };
  metadata?: Record<string, any>;
  recording_url?: string;
  recording_multi_channel_url?: string;
  scrubbed_recording_url?: string;
}

export interface RetellCallSummary {
  call_id: string;
  agent_id: string;
  call_status: string;
  call_type?: string;
  from_number?: string;
  to_number?: string;
  start_timestamp?: number;
  end_timestamp?: number;
  duration_ms?: number;
}

/**
 * Retell AI HTTP Client
 *
 * The API key NEVER leaves the backend.
 * All company-specific configuration is injected at call-creation time
 * via retell_dynamic_variables — not hardcoded.
 */
class RetellClient {
  private apiKey: string;

  constructor() {
    if (!config.retell.apiKey) {
      logger.warn('RETELL_API_KEY is not configured');
    }
    this.apiKey = config.retell.apiKey || '';
  }

  private get headers() {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  private async request<T>(method: string, path: string, body?: any): Promise<T> {
    const url = `${RETELL_BASE_URL}${path}`;
    const res = await fetch(url, {
      method,
      headers: this.headers,
      ...(body && { body: JSON.stringify(body) }),
    });

    if (!res.ok) {
      logger.error({ status: res.status, url }, `Retell API error: ${res.status}`);
      throw new Error(`Retell API error: ${res.status}`);
    }

    return res.json() as Promise<T>;
  }

  /**
   * Create a web call with company-specific dynamic variables.
   *
   * The agentId and dynamicVariables come from the company's AI config
   * in the database — never hardcoded.
   *
   * company_id is stored in metadata so webhooks can resolve the tenant.
   */
  async createWebCall(
    agentId: string,
    companyId: string,
    dynamicVariables?: RetellDynamicVariables,
    extraMetadata?: Record<string, any>
  ): Promise<RetellWebCallResponse> {
    return this.request<RetellWebCallResponse>('POST', '/v2/create-web-call', {
      agent_id: agentId,

      // Dynamic variables replace {{placeholders}} in the Retell LLM prompt
      // e.g. {{company_name}} → "Acme Corp", {{company_phone}} → "+1 800 123 4567"
      retell_llm_dynamic_variables: dynamicVariables || {},

      // Metadata is returned with every webhook — used to resolve tenant
      metadata: {
        company_id: companyId,  // CRITICAL: resolves tenant on webhook receipt
        ...extraMetadata,
      },
    });
  }

  async getAgent(agentId: string): Promise<RetellAgentResponse> {
    return this.request<RetellAgentResponse>('GET', `/get-agent/${agentId}`);
  }

  async listAgents(): Promise<RetellAgentResponse[]> {
    return this.request<RetellAgentResponse[]>('GET', '/list-agents');
  }

  async importPhoneNumber(phoneNumber: string, terminationUri: string, agentId: string, nickname: string, inboundWebhookUrl?: string): Promise<Record<string, unknown>> {
    return this.request<Record<string, unknown>>('POST', '/import-phone-number', {
      phone_number: phoneNumber,
      termination_uri: terminationUri,
      inbound_agents: [{ agent_id: agentId, weight: 1 }],
      outbound_agents: [{ agent_id: agentId, weight: 1 }],
      nickname,
      ...(inboundWebhookUrl ? { inbound_webhook_url: inboundWebhookUrl } : {}),
    });
  }

  async getCall(callId: string): Promise<RetellCallInfo> {
    return this.request<RetellCallInfo>('GET', `/v2/get-call/${callId}`);
  }

  async listCalls(limit = 100): Promise<RetellCallSummary[]> {
    const response = await this.request<{ items?: RetellCallSummary[] }>('POST', '/v3/list-calls', {
      limit,
      sort_order: 'descending',
    });
    return response.items || [];
  }

  async ping(): Promise<boolean> {
    try {
      await this.listAgents();
      return true;
    } catch {
      return false;
    }
  }
}

export const retellClient = new RetellClient();
