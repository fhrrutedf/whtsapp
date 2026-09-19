-- Add CRM lead intelligence columns to contacts table
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS whatsapp_push_name TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS country_code TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS country_name TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS interest_level TEXT DEFAULT 'UNKNOWN';
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS interest_score INTEGER DEFAULT 0;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS interest_notes TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS last_interest_updated_at TIMESTAMPTZ;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS course_delivered_at TIMESTAMPTZ;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS lead_source TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS first_contact_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_contacts_interest_level ON contacts(tenant_id, interest_level);
