-- ============================================================
-- Migration: issue_credits + issue_credit_members
-- Purpose:   Store per-issue production team (制作团队) data
-- ============================================================

-- 1. Credits table (每期一条)
CREATE TABLE IF NOT EXISTS issue_credits (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    issue_id    uuid NOT NULL REFERENCES issues(id) ON DELETE CASCADE UNIQUE,
    title       text NOT NULL,
    message     text NOT NULL DEFAULT '',
    created_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  issue_credits IS '期刊制作团队信息，每期一条';
COMMENT ON COLUMN issue_credits.title   IS '制作团队标题，如"第三看《月经》制作团队"';
COMMENT ON COLUMN issue_credits.message IS '结尾寄语，如"感谢每一位读者与支持者！"';

CREATE INDEX IF NOT EXISTS idx_issue_credits_issue
    ON issue_credits (issue_id);

ALTER TABLE issue_credits ENABLE ROW LEVEL SECURITY;

-- Public read: anyone can read credits of published issues
CREATE POLICY "issue_credits: public read"
    ON issue_credits FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM issues
            WHERE issues.id = issue_credits.issue_id
              AND issues.published_at IS NOT NULL
              AND issues.published_at <= now()
        )
    );

-- 2. Credit members table (每期多条，对应各部门)
CREATE TABLE IF NOT EXISTS issue_credit_members (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    credit_id   uuid NOT NULL REFERENCES issue_credits(id) ON DELETE CASCADE,
    department  text NOT NULL,
    names       text NOT NULL DEFAULT '',
    sort_order  integer NOT NULL DEFAULT 0,
    created_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  issue_credit_members IS '制作团队部门成员列表';
COMMENT ON COLUMN issue_credit_members.department IS '部门名称，如"编辑部"';
COMMENT ON COLUMN issue_credit_members.names      IS '成员名单，如"Anna、Cyan、白英…"';

CREATE INDEX IF NOT EXISTS idx_issue_credit_members_credit
    ON issue_credit_members (credit_id, sort_order);

ALTER TABLE issue_credit_members ENABLE ROW LEVEL SECURITY;

-- Public read: anyone can read members whose parent credit is visible
CREATE POLICY "issue_credit_members: public read"
    ON issue_credit_members FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM issue_credits c
            JOIN issues i ON i.id = c.issue_id
            WHERE c.id = issue_credit_members.credit_id
              AND i.published_at IS NOT NULL
              AND i.published_at <= now()
        )
    );

-- ============================================================
-- Seed data: 第三看 (v3) 制作团队
-- ============================================================
DO $$
DECLARE
    v_issue_id  uuid;
    v_credit_id uuid;
BEGIN
    SELECT id INTO v_issue_id
      FROM issues
     WHERE slug = 'v3'
     LIMIT 1;

    IF v_issue_id IS NULL THEN
        RAISE NOTICE 'Issue v3 not found – skipping credits seed data.';
        RETURN;
    END IF;

    INSERT INTO issue_credits (issue_id, title, message)
    VALUES (v_issue_id, '第三看 《月经》制作团队', '感谢每一位读者与支持者！')
    RETURNING id INTO v_credit_id;

    INSERT INTO issue_credit_members (credit_id, department, names, sort_order) VALUES
        (v_credit_id, '站长',   'Ray', 1),
        (v_credit_id, '编辑部', 'Anna、Cyan、白英、冰淇淋、抽抽、蓝、GUAGUA、萧萧、新平小英俊、朱古力', 2),
        (v_credit_id, '技术部', '疯丫梨、Lsly、点点、eve', 3),
        (v_credit_id, '视觉部', '椰树、白木、夳羊', 4),
        (v_credit_id, '宣发部', '晕碳、不不、冬眠、叽叽、KK、母狮、特离谱', 5);

    RAISE NOTICE 'Credits seed data for v3 inserted successfully.';
END $$;
