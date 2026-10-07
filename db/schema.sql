-- Juni initial PostgreSQL schema (Phase 2). Mirrors src/lib/types.ts.
-- Privacy: only the passport *country* is stored — never passport or ID numbers.

CREATE TYPE lang AS ENUM ('en', 'es');
CREATE TYPE verification_status AS ENUM ('verified', 'unverified', 'risk');
CREATE TYPE check_result AS ENUM ('pass', 'fail', 'unknown');
CREATE TYPE trip_status AS ENUM ('saved', 'planning', 'applied', 'enrolled', 'completed');
CREATE TYPE program_level AS ENUM ('beginner', 'intermediate', 'advanced', 'all');
CREATE TYPE housing_type AS ENUM ('homestay', 'residence', 'apartment', 'hostel', 'none');

CREATE TABLE app_user (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text UNIQUE NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE profile (
  user_id       uuid PRIMARY KEY REFERENCES app_user(id) ON DELETE CASCADE,
  name          text,
  lang          lang NOT NULL DEFAULT 'en',
  home_city     text,
  passport_country char(2),            -- ISO 3166-1 alpha-2 (or 'EU'); never document numbers
  budget_min    integer,
  budget_max    integer,
  interests     text[] NOT NULL DEFAULT '{}',
  skills        jsonb NOT NULL DEFAULT '[]',   -- [{label, level}]
  housing       housing_type[] NOT NULL DEFAULT '{}',
  accessibility text[] NOT NULL DEFAULT '{}',
  dietary       text[] NOT NULL DEFAULT '{}',
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE destination (
  id            text PRIMARY KEY,
  name          text NOT NULL,
  country_code  char(2) NOT NULL,
  content       jsonb NOT NULL,          -- localized overview, seasons, safety, accessibility
  costs         jsonb NOT NULL,          -- weekly course/housing/living ranges (USD)
  lat           double precision,
  lng           double precision
);

CREATE TABLE school (
  id             text PRIMARY KEY,
  destination_id text NOT NULL REFERENCES destination(id),
  name           text NOT NULL,
  address        text,
  lat            double precision,
  lng            double precision,
  website        text NOT NULL,
  email          text,
  founded        integer,
  payment_methods text[] NOT NULL DEFAULT '{}',
  refund_policy  jsonb
);

CREATE TABLE verification_record (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id     text NOT NULL REFERENCES school(id) ON DELETE CASCADE,
  status        verification_status NOT NULL,
  checks        jsonb NOT NULL,          -- [{id, result, note}]
  sources       jsonb NOT NULL,          -- [{label, url}]
  last_checked  timestamptz NOT NULL
);
CREATE INDEX ON verification_record (school_id, last_checked DESC);

CREATE TABLE program (
  id               text PRIMARY KEY,
  school_id        text NOT NULL REFERENCES school(id),
  destination_id   text NOT NULL REFERENCES destination(id),
  category         text NOT NULL,
  content          jsonb NOT NULL,       -- localized title, summary, description, schedule, includes
  weeks_min        smallint NOT NULL,
  weeks_max        smallint NOT NULL,
  hours_per_week   smallint NOT NULL,
  level            program_level NOT NULL,
  instruction_languages text[] NOT NULL,
  certificate      boolean NOT NULL DEFAULT false,
  accessibility    text[] NOT NULL DEFAULT '{}',
  housing          jsonb NOT NULL DEFAULT '[]',
  application_deadline_days smallint NOT NULL,
  min_age          smallint,
  tags             text[] NOT NULL DEFAULT '{}',
  sponsored        boolean NOT NULL DEFAULT false   -- always labeled; never affects ranking
);

CREATE TABLE program_session (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id    text NOT NULL REFERENCES program(id) ON DELETE CASCADE,
  start_date    date NOT NULL,
  end_date      date NOT NULL,
  price_per_week integer NOT NULL,       -- USD
  registration_fee integer NOT NULL DEFAULT 0,
  seats_left    smallint,
  price_source_url text NOT NULL,
  last_checked  timestamptz NOT NULL
);

CREATE TABLE review (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id    text NOT NULL REFERENCES program(id),
  user_id       uuid REFERENCES app_user(id),
  lang          lang NOT NULL,
  rating        smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body          text NOT NULL,
  verified_participant boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE saved_item (
  user_id       uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  item_type     text NOT NULL CHECK (item_type IN ('program', 'destination')),
  item_id       text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, item_type, item_id)
);

CREATE TABLE trip (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  program_id    text NOT NULL REFERENCES program(id),
  session_id    uuid REFERENCES program_session(id),
  status        trip_status NOT NULL DEFAULT 'saved',
  weeks         smallint NOT NULL,
  housing_type  housing_type,
  checklist     jsonb NOT NULL DEFAULT '[]',
  budget        jsonb NOT NULL DEFAULT '[]',   -- [{label, planned, actual}]
  drafts        jsonb NOT NULL DEFAULT '[]',   -- drafted messages; never sent by Juni
  reminders     boolean NOT NULL DEFAULT true,
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE experience (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  program_id    text NOT NULL REFERENCES program(id),
  start_date    date NOT NULL,
  end_date      date NOT NULL,
  photos        jsonb NOT NULL DEFAULT '[]',
  certificate   jsonb,
  skills        text[] NOT NULL DEFAULT '{}',
  journal       jsonb NOT NULL DEFAULT '[]'
);

CREATE TABLE chat_session (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  shared_state  jsonb NOT NULL DEFAULT '{}',   -- Planner state (LangGraph checkpoint)
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE agent_message (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    uuid NOT NULL REFERENCES chat_session(id) ON DELETE CASCADE,
  role          text NOT NULL CHECK (role IN ('user', 'juni', 'planner', 'scout', 'fit', 'logistics', 'verifier', 'application')),
  parts         jsonb NOT NULL,                -- rich parts (text, results, cost, compare, proposal, draft)
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON agent_message (session_id, created_at);
