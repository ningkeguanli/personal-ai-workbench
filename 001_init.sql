-- V3.6 初始云端模型。所有更新均在服务端；不使用 localStorage 作为正式数据源。
CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK(length(trim(name)) > 0),
  industry text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT '培育中',
  background text NOT NULL DEFAULT '',
  next_action text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_clients_recent ON clients(updated_at DESC);
CREATE TABLE IF NOT EXISTS contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name text NOT NULL, role text NOT NULL DEFAULT '', notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  title text NOT NULL, stage text NOT NULL DEFAULT '需求发现与诊断',
  status text NOT NULL DEFAULT '待验证', value_amount numeric(14,2),
  confirmed_facts text NOT NULL DEFAULT '', risks text NOT NULL DEFAULT '',
  next_action text NOT NULL DEFAULT '', stage_evidence text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_opps_client ON opportunities(client_id, updated_at DESC);
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), title text NOT NULL,
  kind text NOT NULL DEFAULT '长期项目', status text NOT NULL DEFAULT '进行中',
  summary text NOT NULL DEFAULT '', next_action text NOT NULL DEFAULT '',
  current_version_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS project_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  label text NOT NULL, content text NOT NULL DEFAULT '', change_note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE projects DROP CONSTRAINT IF EXISTS fk_projects_current_version;
ALTER TABLE projects ADD CONSTRAINT fk_projects_current_version FOREIGN KEY (current_version_id) REFERENCES project_versions(id) ON DELETE SET NULL;
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), title text NOT NULL, status text NOT NULL DEFAULT '待执行',
  kind text NOT NULL DEFAULT '业务', client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  opportunity_id uuid REFERENCES opportunities(id) ON DELETE SET NULL,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  due_date date, result text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tasks_state ON tasks(status, due_date, updated_at DESC);
CREATE TABLE IF NOT EXISTS communications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  opportunity_id uuid REFERENCES opportunities(id) ON DELETE SET NULL,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  channel text NOT NULL DEFAULT '沟通', happened_at timestamptz NOT NULL DEFAULT now(),
  raw_content text NOT NULL, summary text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_comms_client ON communications(client_id, happened_at DESC);
CREATE TABLE IF NOT EXISTS analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), communication_id uuid NOT NULL REFERENCES communications(id) ON DELETE CASCADE,
  focus text NOT NULL CHECK(focus IN ('business','person','both')),
  source text NOT NULL DEFAULT 'real_ai', status text NOT NULL DEFAULT 'proposed' CHECK(status IN ('proposed','accepted','rejected')),
  business_summary text NOT NULL DEFAULT '', stage_suggestion text NOT NULL DEFAULT '',
  stage_evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  ability_dimension text NOT NULL DEFAULT '', ability_observation text NOT NULL DEFAULT '',
  ability_evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  external_constraints jsonb NOT NULL DEFAULT '[]'::jsonb,
  business_action text NOT NULL DEFAULT '', training_action text NOT NULL DEFAULT '',
  confidence text NOT NULL DEFAULT '不足以判断', limitations text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_analyses_comm ON analyses(communication_id, created_at DESC);
CREATE TABLE IF NOT EXISTS action_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), analysis_id uuid NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
  communication_id uuid NOT NULL REFERENCES communications(id) ON DELETE CASCADE,
  task_id uuid REFERENCES tasks(id) ON DELETE SET NULL,
  kind text NOT NULL CHECK(kind IN ('business','training')),
  title text NOT NULL, status text NOT NULL DEFAULT '待验证',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uniq_analysis_action_kind UNIQUE(analysis_id,kind)
);
CREATE TABLE IF NOT EXISTS validations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), action_id uuid NOT NULL REFERENCES action_items(id) ON DELETE CASCADE,
  followup_communication_id uuid REFERENCES communications(id) ON DELETE SET NULL,
  observed_behavior text NOT NULL, business_outcome text NOT NULL DEFAULT '',
  capability_outcome text NOT NULL DEFAULT '待验证',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS knowledge_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), title text NOT NULL, kind text NOT NULL DEFAULT '资料',
  storage_key text, extracted_text text NOT NULL DEFAULT '',
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
