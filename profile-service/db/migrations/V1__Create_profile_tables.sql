-- profile-service/db/migrations/V1__Create_profile_tables.sql
-- Auto-run by Node.js migrate.js on service startup.
-- This SQL is provided for manual inspection/recovery only.

CREATE TABLE IF NOT EXISTS user_profiles (
  id            VARCHAR(128) PRIMARY KEY,
  email         VARCHAR(255) UNIQUE NOT NULL,
  name          VARCHAR(255),
  phone         VARCHAR(30),
  date_of_birth DATE,
  gender        VARCHAR(20),
  avatar_url    TEXT,
  bio           TEXT,
  website       VARCHAR(255),
  company       VARCHAR(255),
  job_title     VARCHAR(255),
  newsletter    BOOLEAN DEFAULT FALSE,
  notifications BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_addresses (
  id          BIGSERIAL PRIMARY KEY,
  user_id     VARCHAR(128) NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  label       VARCHAR(50)  NOT NULL DEFAULT 'Home',
  full_name   VARCHAR(255) NOT NULL,
  line1       VARCHAR(255) NOT NULL,
  line2       VARCHAR(255),
  city        VARCHAR(100) NOT NULL,
  state       VARCHAR(100) NOT NULL,
  pin_code    VARCHAR(20)  NOT NULL,
  country     VARCHAR(100) NOT NULL DEFAULT 'India',
  phone       VARCHAR(30),
  is_default  BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_addresses_user_id ON user_addresses(user_id);
