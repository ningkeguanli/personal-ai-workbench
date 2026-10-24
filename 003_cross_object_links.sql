-- 仅补全长期工作记录的必要关系，不自动修正历史记录。
CREATE UNIQUE INDEX IF NOT EXISTS uq_projects_id_client ON projects(id,client_id);
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS chk_tasks_opp_requires_client;
ALTER TABLE tasks ADD CONSTRAINT chk_tasks_opp_requires_client CHECK(opportunity_id IS NULL OR client_id IS NOT NULL);
ALTER TABLE communications DROP CONSTRAINT IF EXISTS chk_comm_opp_requires_client;
ALTER TABLE communications ADD CONSTRAINT chk_comm_opp_requires_client CHECK(opportunity_id IS NULL OR client_id IS NOT NULL);
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS fk_tasks_opp_same_client;
ALTER TABLE tasks ADD CONSTRAINT fk_tasks_opp_same_client FOREIGN KEY (opportunity_id,client_id) REFERENCES opportunities(id,client_id);
ALTER TABLE communications DROP CONSTRAINT IF EXISTS fk_comms_opp_same_client;
ALTER TABLE communications ADD CONSTRAINT fk_comms_opp_same_client FOREIGN KEY (opportunity_id,client_id) REFERENCES opportunities(id,client_id);
-- 如果项目属于某个客户，关联它的任务/沟通必须属于同一客户。
-- 历史矛盾关系应阻止迁移，并由用户核实，不可静默修改。
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM tasks t JOIN projects p ON p.id=t.project_id
           WHERE p.client_id IS NOT NULL AND t.client_id IS DISTINCT FROM p.client_id)
    OR EXISTS(SELECT 1 FROM communications c JOIN projects p ON p.id=c.project_id
           WHERE p.client_id IS NOT NULL AND c.client_id IS DISTINCT FROM p.client_id)
 THEN RAISE EXCEPTION '既有任务或沟通与项目客户归属存在冲突，请先备份并人工核对'; END IF;
END $$;
CREATE OR REPLACE FUNCTION assert_work_project_client() RETURNS trigger AS $$
DECLARE linked_client uuid;linked_opp uuid;
BEGIN
 IF NEW.project_id IS NULL THEN RETURN NEW; END IF;
 SELECT client_id,opportunity_id INTO linked_client,linked_opp FROM projects WHERE id=NEW.project_id;
 IF linked_client IS NOT NULL AND (NEW.client_id IS NULL OR NEW.client_id<>linked_client)
 THEN RAISE EXCEPTION '工作记录与项目的客户不一致'; END IF;
 IF linked_opp IS NOT NULL AND NEW.opportunity_id IS NOT NULL AND NEW.opportunity_id<>linked_opp
 THEN RAISE EXCEPTION '工作记录与项目的商机不一致'; END IF;
 RETURN NEW;
END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_task_project_client ON tasks;
CREATE TRIGGER trg_task_project_client BEFORE INSERT OR UPDATE OF client_id,project_id,opportunity_id ON tasks FOR EACH ROW EXECUTE FUNCTION assert_work_project_client();
DROP TRIGGER IF EXISTS trg_comm_project_client ON communications;
CREATE TRIGGER trg_comm_project_client BEFORE INSERT OR UPDATE OF client_id,project_id,opportunity_id ON communications FOR EACH ROW EXECUTE FUNCTION assert_work_project_client();
CREATE INDEX IF NOT EXISTS idx_val_by_action ON validations(action_id,created_at DESC,id DESC);
