-- V3.6.1：兼容既有V3.6数据库的增量修正。迁移由脚本事务执行。
ALTER TABLE projects ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES clients(id) ON DELETE SET NULL;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS opportunity_id uuid REFERENCES opportunities(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_opportunity_id_client ON opportunities(id,client_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_version_id_project ON project_versions(id,project_id);
-- 既有异常记录应先人工核对，不能为迁移成功擅自重绑定正式版本。
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM projects p JOIN project_versions v ON v.id=p.current_version_id WHERE v.project_id<>p.id)
 THEN RAISE EXCEPTION '存在指向其他项目的有效版本；请先备份并核对项目及版本归属，再重新迁移';
 END IF;
END $$;

ALTER TABLE projects DROP CONSTRAINT IF EXISTS fk_projects_current_version;
-- 项目有效版本只能属于当前项目；禁止另一项目版本被错误设为本项目基线。
ALTER TABLE projects DROP CONSTRAINT IF EXISTS fk_projects_active_version_same_project;
ALTER TABLE projects ADD CONSTRAINT fk_projects_active_version_same_project
 FOREIGN KEY (current_version_id,id) REFERENCES project_versions(id,project_id) DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE projects DROP CONSTRAINT IF EXISTS chk_project_opportunity_needs_client;
ALTER TABLE projects ADD CONSTRAINT chk_project_opportunity_needs_client CHECK(opportunity_id IS NULL OR client_id IS NOT NULL);
ALTER TABLE projects DROP CONSTRAINT IF EXISTS fk_project_opp_same_client;
ALTER TABLE projects ADD CONSTRAINT fk_project_opp_same_client FOREIGN KEY (opportunity_id,client_id) REFERENCES opportunities(id,client_id);
CREATE INDEX IF NOT EXISTS idx_projects_client ON projects(client_id,updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_comms_client_time_id ON communications(client_id,happened_at DESC,id DESC);
CREATE INDEX IF NOT EXISTS idx_validation_followup ON validations(followup_communication_id);
-- 既有历史验证不删除；新增验证必须指向实际后续沟通。
CREATE OR REPLACE FUNCTION check_validation_followup() RETURNS trigger AS $$
DECLARE src record; nxt record;
BEGIN
 SELECT c.client_id,c.opportunity_id,c.happened_at INTO src
 FROM action_items a JOIN communications c ON c.id=a.communication_id WHERE a.id=NEW.action_id;
 SELECT client_id,opportunity_id,happened_at INTO nxt FROM communications WHERE id=NEW.followup_communication_id;
 IF NEW.followup_communication_id IS NULL OR src.client_id IS NULL OR nxt.client_id IS NULL
    OR src.client_id<>nxt.client_id OR nxt.happened_at<=src.happened_at
    OR (src.opportunity_id IS NOT NULL AND nxt.opportunity_id IS NOT NULL AND src.opportunity_id<>nxt.opportunity_id)
 THEN RAISE EXCEPTION '验证反馈必须关联同一客户、且晚于原沟通的有效后续沟通'; END IF;
 RETURN NEW;
END;$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_validation_source ON validations;
CREATE TRIGGER trg_validation_source BEFORE INSERT OR UPDATE OF action_id,followup_communication_id ON validations
 FOR EACH ROW EXECUTE FUNCTION check_validation_followup();
CREATE TABLE IF NOT EXISTS ability_observations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 analysis_id uuid NOT NULL UNIQUE REFERENCES analyses(id) ON DELETE CASCADE,
 communication_id uuid NOT NULL REFERENCES communications(id) ON DELETE CASCADE,
 dimension text NOT NULL,observation text NOT NULL,
 evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
 state text NOT NULL DEFAULT '待观察',
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ability_observations_dimension ON ability_observations(dimension,created_at DESC);
