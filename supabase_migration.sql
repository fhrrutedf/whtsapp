-- ==============================================================================
-- Supabase Migration: AI Memory, Escalation Rules, Guardrails & Knowledge Items
-- ==============================================================================

-- 1. إضافة حقول الذاكرة لجدول جهات الاتصال (contacts)
ALTER TABLE "contacts" 
ADD COLUMN IF NOT EXISTS "notes" TEXT,
ADD COLUMN IF NOT EXISTS "memory_facts" TEXT[] DEFAULT '{}';

-- 2. إضافة إعدادات اللهجة، التصعيد، حواجز الأمان، والتأخيرات لجدول الذكاء الاصطناعي (ai_agent_configs)
ALTER TABLE "ai_agent_configs"
ADD COLUMN IF NOT EXISTS "model_name" TEXT DEFAULT 'gemini-2.5-flash',
ADD COLUMN IF NOT EXISTS "dialect" TEXT DEFAULT 'syrian',
ADD COLUMN IF NOT EXISTS "tone" TEXT DEFAULT 'friendly',
ADD COLUMN IF NOT EXISTS "custom_dialect_prompt" TEXT,
ADD COLUMN IF NOT EXISTS "auto_reply_delay_seconds" INTEGER DEFAULT 30,
ADD COLUMN IF NOT EXISTS "inter_message_delay_seconds" INTEGER DEFAULT 15,
ADD COLUMN IF NOT EXISTS "send_read_receipts" BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS "excluded_phone_numbers" TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS "handoff_keywords" TEXT[] DEFAULT '{"موظف", "بشري", "شكوى", "مدير", "اتصال", "تحويل", "إلغاء", "دفع"}',
ADD COLUMN IF NOT EXISTS "handoff_max_turns" INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS "handoff_stop_notification" TEXT,
ADD COLUMN IF NOT EXISTS "user_memory_enabled" BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS "user_memory_prompt" TEXT,
ADD COLUMN IF NOT EXISTS "safety_guardrails" TEXT,
ADD COLUMN IF NOT EXISTS "error_recovery" TEXT,
ADD COLUMN IF NOT EXISTS "escalation_enabled" BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS "escalation_rules" TEXT,
ADD COLUMN IF NOT EXISTS "escalation_pre_actions" TEXT;

-- 3. إنشاء جدول قاعدة المعرفة (knowledge_items)
CREATE TABLE IF NOT EXISTS "knowledge_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'text',
    "content" TEXT NOT NULL,
    "source" TEXT,
    "char_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "knowledge_items_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "knowledge_items_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "knowledge_items_tenant_id_idx" ON "knowledge_items"("tenant_id");
