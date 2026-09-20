import type { ObjectId } from 'mongodb';

export type ConferenceStatus = 'created' | 'active' | 'completed' | 'expired' | 'failed';
export type ConferenceCallStatus = 'preparing' | 'registered' | 'ongoing' | 'ended' | 'error';

export interface ConferenceCall {
  attemptId: string;
  callId?: string;
  status: ConferenceCallStatus;
  requestedAt: Date;
  startTime?: Date;
  endTime?: Date;
  durationMs?: number;
  recordingUrl?: string;
  transcript?: string;
  summary?: string;
  disconnectReason?: string;
  analyzed?: boolean;
}

export interface Conference {
  _id?: ObjectId;
  sessionId: string;
  tokenHash: string;
  /** Hashed normalized email used only for the unique admission reservation. */
  emailKey?: string;
  email: string;
  companyDomain: string;
  companyName?: string;
  sessionStart: Date;
  sessionEnd?: Date;
  sessionDuration?: number;
  expiresAt: Date;
  status: ConferenceStatus;
  callId?: string;
  callStatus?: ConferenceCallStatus;
  conversationEndsAt?: Date;
  currentAttemptId?: string;
  calls: ConferenceCall[];
  agentId: string;
  consentAt: Date;
  consentVersion: 'conference-v1';
  nextActionAt?: Date;
  leaseUntil?: Date;
  leaseOwner?: string;
  stopRequested?: boolean;
  createdAt: Date;
  updatedAt: Date;
}
