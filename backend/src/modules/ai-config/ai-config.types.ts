/**
 * Per-company AI configuration stored in MongoDB.
 * This is what makes one Retell agent behave differently for each company.
 * NO company-specific values are hardcoded anywhere in source code.
 */

import { ObjectId } from 'mongodb';
import type { Document } from 'mongodb';

export interface BusinessHours {
  timezone: string;
  schedule: {
    day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
    open: boolean;
    open_time?: string;   // "09:00"
    close_time?: string;  // "18:00"
  }[];
}

export interface RetellDynamicVariables {
  company_name: string;
  company_description?: string;
  company_phone?: string;
  company_email?: string;
  company_website?: string;
  company_address?: string;
  number_display_name?: string;
  number_description?: string;
  additional_instructions?: string;
  company_knowledge?: string;
  business_hours_text?: string;
  receptionist_name?: string;     // caller-facing identity, fixed app value
  greeting_name?: string;         // e.g. "Ava"
  [key: string]: string | undefined;  // custom variables
}

export interface CompanyAIConfigDocument extends Document {
  _id?: ObjectId;
  company_id: string;            // TENANT — always required

  // ── RETELL AGENT CONFIG ──────────────────────────────────
  retell_agent_id: string;       // Which Retell agent to use for this company
  retell_llm_id?: string;        // Optional: specific LLM

  // ── DYNAMIC VARIABLES ────────────────────────────────────
  // These get injected into the Retell agent at call creation time
  // e.g. {{company_name}} in prompts resolves to "Acme Corp"
  dynamic_variables: RetellDynamicVariables;

  // ── AI INSTRUCTIONS ──────────────────────────────────────
  // Additional system-level instructions specific to this company
  // Appended to the Retell LLM prompt at runtime
  ai_instructions?: string;

  // ── WELCOME MESSAGE ──────────────────────────────────────
  // "Hi, thanks for calling {{company_name}}. How can I help you?"
  welcome_message_template?: string;

  // ── BUSINESS HOURS ───────────────────────────────────────
  business_hours?: BusinessHours;

  // ── FEATURE FLAGS ────────────────────────────────────────
  features: {
    employee_lookup: boolean;
    department_lookup: boolean;
    faq_search: boolean;
    policy_search: boolean;
    document_search: boolean;
    after_hours_message: boolean;
  };

  // ── WEBHOOK CONFIG ───────────────────────────────────────
  webhook_url?: string;          // Company-specific webhook if needed
  webhook_secret?: string;       // Per-company webhook secret

  // ── STATUS ───────────────────────────────────────────────
  status: 'active' | 'inactive';

  created_at: Date;
  updated_at: Date;
}

export const AI_CONFIG_COLLECTION = 'company_ai_configs';
