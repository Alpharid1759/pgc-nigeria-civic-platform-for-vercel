CREATE TABLE IF NOT EXISTS schema_migrations (
  name        text PRIMARY KEY,
  applied_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE membership_applications (
  id                    bigserial PRIMARY KEY,
  application_no        varchar(32) NOT NULL UNIQUE,
  full_name             varchar(190) NOT NULL,
  date_of_birth         date,
  gender                varchar(20),
  phone                 varchar(32) NOT NULL,
  whatsapp              varchar(32),
  email                 varchar(190) NOT NULL,
  nationality           varchar(64) NOT NULL DEFAULT 'Nigerian',
  state_of_origin_slug  varchar(80),
  state_slug            varchar(80) NOT NULL,
  lga_slug              varchar(120) NOT NULL,
  ward_slug             varchar(120),
  community             varchar(190),
  address               text,
  category              varchar(48) NOT NULL,
  occupation            varchar(190),
  education             varchar(190),
  skills                text,
  interests             text,
  previous_civic        text,
  motivation            text,
  quarterly_monitoring  boolean NOT NULL DEFAULT false,
  volunteer_interest    boolean NOT NULL DEFAULT false,
  comm_preference       varchar(20) NOT NULL DEFAULT 'email',
  consent_data          boolean NOT NULL DEFAULT false,
  consent_newsletter    boolean NOT NULL DEFAULT false,
  consent_version       varchar(16) NOT NULL DEFAULT '',
  status                varchar(20) NOT NULL DEFAULT 'pending',
  reviewed_by           varchar(190),
  reviewed_at           timestamptz,
  review_notes          text,
  ip_hash               char(64),
  is_demo               boolean NOT NULL DEFAULT false,
  created_at            timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX membership_applications_email_idx ON membership_applications (lower(email));
CREATE INDEX membership_applications_status_idx ON membership_applications (status);
CREATE INDEX membership_applications_area_idx ON membership_applications (state_slug, lga_slug);

CREATE TABLE members (
  id              bigserial PRIMARY KEY,
  membership_no   varchar(40) NOT NULL UNIQUE,
  application_id  bigint NOT NULL UNIQUE REFERENCES membership_applications (id),
  category        varchar(48) NOT NULL,
  state_slug      varchar(80) NOT NULL,
  lga_slug        varchar(120) NOT NULL,
  ward_slug       varchar(120),
  status          varchar(20) NOT NULL DEFAULT 'active',
  approved_by     varchar(190),
  approved_at     timestamptz NOT NULL DEFAULT now(),
  is_demo         boolean NOT NULL DEFAULT false
);
CREATE INDEX members_area_idx ON members (state_slug, lga_slug, ward_slug);
CREATE INDEX members_status_idx ON members (status);

CREATE TABLE officials (
  id             bigserial PRIMARY KEY,
  name           varchar(190) NOT NULL,
  office_type    varchar(48) NOT NULL,
  party          varchar(190),
  constituency   varchar(190),
  state_slug     varchar(80),
  lga_slug       varchar(120),
  ward_slug      varchar(120),
  tenure_start   date,
  tenure_end     date,
  published      boolean NOT NULL DEFAULT false,
  is_demo        boolean NOT NULL DEFAULT false,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX officials_office_idx ON officials (office_type);

CREATE TABLE projects (
  id                      bigserial PRIMARY KEY,
  project_no              varchar(40) NOT NULL UNIQUE,
  title                   varchar(255) NOT NULL,
  status                  varchar(32) NOT NULL DEFAULT 'proposed',
  priority                varchar(16),
  verification_status     varchar(20) NOT NULL DEFAULT 'unverified',
  sector                  varchar(32),
  state_slug              varchar(80) NOT NULL,
  lga_slug                varchar(120),
  ward_slug               varchar(120),
  community               varchar(190),
  beneficiaries           varchar(190),
  estimated_cost          numeric(20, 2),
  funding_source          varchar(190),
  responsible_institution varchar(190),
  responsible_office      varchar(190),
  responsible_official_id bigint REFERENCES officials (id),
  contractor              varchar(190),
  problem                 text,
  solution                text,
  outcomes                text,
  procurement             text,
  source_references       text,
  start_date              date,
  end_date                date,
  published               boolean NOT NULL DEFAULT false,
  is_demo                 boolean NOT NULL DEFAULT false,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX projects_area_idx ON projects (state_slug, lga_slug);
CREATE INDEX projects_status_idx ON projects (status);
CREATE INDEX projects_sector_idx ON projects (sector);

CREATE TABLE project_milestones (
  id             bigserial PRIMARY KEY,
  project_id     bigint NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  title          varchar(190) NOT NULL,
  due_date       date,
  completed_date date,
  status         varchar(24) NOT NULL DEFAULT 'pending',
  evidence_url   varchar(255),
  sort_order     integer NOT NULL DEFAULT 0,
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX project_milestones_project_idx ON project_milestones (project_id);

CREATE TABLE scorecard_indicators (
  id           bigserial PRIMARY KEY,
  office_type  varchar(48) NOT NULL,
  category     char(1) NOT NULL,
  label        varchar(255) NOT NULL,
  description  text,
  weight       numeric(6, 3) NOT NULL DEFAULT 0,
  active       boolean NOT NULL DEFAULT true,
  UNIQUE (office_type, category)
);

CREATE TABLE scorecards (
  id                   bigserial PRIMARY KEY,
  official_id          bigint NOT NULL REFERENCES officials (id),
  year                 smallint NOT NULL,
  quarter              smallint NOT NULL CHECK (quarter BETWEEN 1 AND 4),
  status               varchar(16) NOT NULL DEFAULT 'draft',
  verification_status  varchar(20),
  citizen_feedback     text,
  evaluator_comments   text,
  official_response    text,
  published_on         timestamptz,
  is_demo              boolean NOT NULL DEFAULT false,
  created_at           timestamptz NOT NULL DEFAULT now(),
  UNIQUE (official_id, year, quarter)
);
CREATE INDEX scorecards_status_idx ON scorecards (status, year, quarter);

CREATE TABLE assessments (
  id            bigserial PRIMARY KEY,
  scorecard_id  bigint NOT NULL REFERENCES scorecards (id) ON DELETE CASCADE,
  indicator_id  bigint NOT NULL REFERENCES scorecard_indicators (id),
  score         numeric(5, 2) CHECK (score IS NULL OR (score >= 0 AND score <= 100)),
  evidence      text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (scorecard_id, indicator_id)
);

CREATE TABLE rate_limits (
  key           text PRIMARY KEY,
  count         integer NOT NULL,
  window_start  timestamptz NOT NULL
);

CREATE TABLE audit_log (
  id           bigserial PRIMARY KEY,
  actor        varchar(190) NOT NULL DEFAULT 'system',
  action       varchar(64) NOT NULL,
  object_type  varchar(64),
  object_id    bigint,
  context      jsonb,
  ip_hash      char(64),
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_log_action_idx ON audit_log (action);
CREATE INDEX audit_log_object_idx ON audit_log (object_type, object_id);

INSERT INTO scorecard_indicators (office_type, category, label, weight)
SELECT o.office_type, c.category, c.label, c.weight
FROM (VALUES ('president'), ('governor'), ('senator'), ('house_rep'), ('state_legislator'), ('lga_chair'), ('councillor')) AS o (office_type)
CROSS JOIN (VALUES
  ('A', 'Project Delivery', 30),
  ('B', 'Financial Transparency', 20),
  ('C', 'Policy and Programme Implementation', 15),
  ('D', 'Public Service Delivery', 15),
  ('E', 'Citizen Engagement and Responsiveness', 10),
  ('F', 'Institutional Accountability', 10)
) AS c (category, label, weight);
