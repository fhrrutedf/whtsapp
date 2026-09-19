/**
 * Core type definitions for the OmniDesk Agentic Skills & Tools Architecture
 * Inspired by modular tool systems (e.g. claude-skills) adapted for Multi-Tenant Omnichannel SaaS.
 */

export type SkillCategory = 'sales' | 'support' | 'compliance' | 'lead_gen' | 'operations';

export interface JSONSchemaProperty {
  type: string;
  description: string;
  enum?: string[];
  items?: Record<string, any>;
  [key: string]: any;
}

export interface SkillParameterSchema {
  type: 'object';
  properties: Record<string, JSONSchemaProperty>;
  required?: string[];
}

export interface SkillExecutionContext {
  tenantId: string;
  conversationId: string;
  contactPhone: string;
  contactId?: string;
  customerName?: string;
  customerPhone?: string;
  extractedVariables?: Record<string, any>;
  agentConfig?: any;
  metadata?: Record<string, any>;
}

export interface SkillResult {
  success: boolean;
  actionTaken: string;
  data?: Record<string, any>;
  suggestedMessage?: string;
  error?: string;
}

export interface SkillDefinition {
  name: string;
  displayName: string;
  category: SkillCategory;
  description: string;
  systemPrompt: string;
  parameters: SkillParameterSchema;
}
