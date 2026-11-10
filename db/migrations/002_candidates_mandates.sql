-- Party candidates and their Governance Mandates (predetermined development projects).

CREATE TABLE candidates (
  id                 bigserial PRIMARY KEY,
  member_id          bigint NOT NULL REFERENCES members (id),
  office_type        varchar(48) NOT NULL,
  state_slug         varchar(80),
  lga_slug           varchar(120),
  constituency       varchar(190),
  election_year      integer NOT NULL,
  status             varchar(20) NOT NULL DEFAULT 'aspirant',
  declared_at        timestamptz NOT NULL DEFAULT now(),
  mandate_signed_at  timestamptz,
  screening_notes    text,
  cleared_by         varchar(190),
  cleared_at         timestamptz,
  published          boolean NOT NULL DEFAULT false,
  is_demo            boolean NOT NULL DEFAULT false,
  created_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (member_id, office_type, election_year)
);
CREATE INDEX candidates_status_idx ON candidates (status);
CREATE INDEX candidates_area_idx ON candidates (state_slug, lga_slug);

CREATE TABLE mandate_items (
  id             bigserial PRIMARY KEY,
  candidate_id   bigint NOT NULL REFERENCES candidates (id) ON DELETE CASCADE,
  project_id     bigint NOT NULL REFERENCES projects (id),
  target_date    date NOT NULL,
  added_at       timestamptz NOT NULL DEFAULT now(),
  added_by       varchar(190),
  removed_at     timestamptz,
  removed_reason text,
  removed_by     varchar(190),
  UNIQUE (candidate_id, project_id)
);
CREATE INDEX mandate_items_candidate_idx ON mandate_items (candidate_id);
