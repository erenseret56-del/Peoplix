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

export interface RetellCallOverrides {
  agent: {
    max_call_duration_ms: number;
    webhook_url: string;
    webhook_events: string[];
    data_storage_setting: 'everything';
    opt_in_signed_url: boolean;
  };
  retell_llm?: { knowledge_base_ids: string[]; begin_message: string };
}

export interface RetellCallInfo {
  call_id: string;
  call_status: string;
  agent_id: string;
  call_type?: string;
  disconnection_reason?: string;
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

export interface RetellPhoneNumberResponse {
  phone_number: string;
  inbound_agents?: Array<{ agent_id: string; weight: number }>;
  outbound_agents?: Array<{ agent_id: string; weight: number }>;
  [key: string]: unknown;
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

  private async request<T>(method: string, path: string, body?: any, timeoutMs?: number): Promise<T> {
    const url = `${RETELL_BASE_URL}${path}`;
    const res = await fetch(url, {
      method,
      headers: this.headers,
      ...(timeoutMs ? { signal: AbortSignal.timeout(timeoutMs) } : {}),
      ...(body && { body: JSON.stringify(body) }),
    });

    if (!res.ok) {
      const responseText = await res.text();
      let message = responseText;
      try {
        const responseBody = JSON.parse(responseText) as { message?: string; error?: string };
        message = responseBody.message || responseBody.error || responseText;
      } catch {
      }
      const detail = message.trim() || res.statusText;
      logger.error({ status: res.status, url, message: detail }, `Retell API error: ${res.status}`);
      throw new Error(`Retell API error: ${res.status} - ${detail}`);
    }

    // Retell returns 204 No Content for successful delete operations.
    if (res.status === 204) return undefined as T;

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
    companyId: string | null,
    dynamicVariables?: RetellDynamicVariables,
    extraMetadata?: Record<string, any>,
    overrides?: RetellCallOverrides
  ): Promise<RetellWebCallResponse> {
    return this.request<RetellWebCallResponse>('POST', '/v2/create-web-call', {
      agent_id: agentId,
      ...(overrides ? { agent_override: overrides } : {}),

      // Dynamic variables replace {{placeholders}} in the Retell LLM prompt
      // e.g. {{company_name}} → "Acme Corp", {{company_phone}} → "+1 800 123 4567"
      retell_llm_dynamic_variables: dynamicVariables || {},

      // Metadata is returned with every webhook — used to resolve tenant
      metadata: {
        ...(companyId ? { company_id: companyId } : {}),
        ...extraMetadata,
      },
    }, overrides ? 12_000 : undefined);
  }

  async stopCall(callId: string): Promise<void> {
    await this.request<void>('POST', `/v2/stop-call/${encodeURIComponent(callId)}`, undefined, 8_000);
  }

  async getAgent(agentId: string, timeoutMs?: number): Promise<RetellAgentResponse> {
    return this.request<RetellAgentResponse>('GET', `/get-agent/${encodeURIComponent(agentId)}`, undefined, timeoutMs);
  }

  async getLlm(llmId: string): Promise<{
    general_prompt?: string;
    general_tools?: Array<{ type: string }>;
    states?: unknown[];
    knowledge_base_ids?: string[];
  }> {
    return this.request('GET', `/get-retell-llm/${encodeURIComponent(llmId)}`, undefined, 8_000);
  }

  async listAgents(): Promise<RetellAgentResponse[]> {
    return this.request<RetellAgentResponse[]>('GET', '/list-agents');
  }

  async listPhoneNumbers(): Promise<RetellPhoneNumberResponse[]> {
    const phoneNumbers: RetellPhoneNumberResponse[] = [];
    let paginationKey: string | undefined;

    do {
      const query = new URLSearchParams({ limit: '1000' });
      if (paginationKey) query.set('pagination_key', paginationKey);
      const response = await this.request<{
        items?: RetellPhoneNumberResponse[];
        has_more?: boolean;
        pagination_key?: string;
      }>('GET', `/v2/list-phone-numbers?${query.toString()}`);
      phoneNumbers.push(...(response.items || []));
      paginationKey = response.has_more ? response.pagination_key : undefined;
    } while (paginationKey);

    return phoneNumbers;
  }

  async getPhoneNumber(phoneNumber: string): Promise<RetellPhoneNumberResponse | null> {
    const phoneNumbers = await this.listPhoneNumbers();
    return phoneNumbers.find((number) => number.phone_number === phoneNumber) || null;
  }

  async updatePhoneNumber(
    phoneNumber: string,
    terminationUri: string,
    agentId: string,
    nickname: string,
    inboundWebhookUrl?: string,
  ): Promise<RetellPhoneNumberResponse> {
    return this.request<RetellPhoneNumberResponse>('PATCH', `/update-phone-number/${encodeURIComponent(phoneNumber)}`, {
      termination_uri: terminationUri,
      inbound_agents: [{ agent_id: agentId, weight: 1 }],
      outbound_agents: [{ agent_id: agentId, weight: 1 }],
      nickname,
      ...(inboundWebhookUrl ? { inbound_webhook_url: inboundWebhookUrl } : {}),
    });
  }

  isPhoneNumberAlreadyExistsError(error: unknown): boolean {
    return error instanceof Error
      && /^Retell API error:\s*400\s*-\s*Phone number already exists\.?$/i.test(error.message.trim());
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

  async deletePhoneNumber(phoneNumber: string): Promise<void> {
    await this.request<void>('DELETE', `/delete-phone-number/${encodeURIComponent(phoneNumber)}`);
  }

  isNotFoundError(error: unknown): boolean {
    return error instanceof Error && /Retell API error:\s*404\b/i.test(error.message);
  }

  async getCall(callId: string, timeoutMs?: number): Promise<RetellCallInfo> {
    return this.request<RetellCallInfo>('GET', `/v2/get-call/${encodeURIComponent(callId)}`, undefined, timeoutMs);
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
