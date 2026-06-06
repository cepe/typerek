-- Mirrors db/schema.rb for the tables the API uses. Loaded by Testcontainers before
-- the Spring context starts, so Hibernate `ddl-auto: validate` runs against a schema
-- identical to production (bigint PKs, integer FKs, double-precision odds, naive
-- timestamps). The unused comments/notifications/active_storage tables are omitted.

CREATE TABLE users (
    id                     BIGSERIAL PRIMARY KEY,
    username               VARCHAR(255) NOT NULL DEFAULT '',
    created_at             TIMESTAMP    NOT NULL,
    updated_at             TIMESTAMP    NOT NULL,
    admin                  BOOLEAN      DEFAULT FALSE,
    invitation_accepted_at TIMESTAMP,
    invited_by_id          INTEGER,
    invited_by_type        VARCHAR(255),
    fin                    BOOLEAN      DEFAULT FALSE,
    password_digest        VARCHAR
);
CREATE UNIQUE INDEX index_users_on_username ON users (username);

CREATE TABLE matches (
    id         BIGSERIAL PRIMARY KEY,
    team_a     VARCHAR(255),
    team_b     VARCHAR(255),
    start      TIMESTAMP,
    win_a      DOUBLE PRECISION,
    win_b      DOUBLE PRECISION,
    tie        DOUBLE PRECISION,
    win_tie_a  DOUBLE PRECISION,
    win_tie_b  DOUBLE PRECISION,
    not_tie    DOUBLE PRECISION,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    result_a   INTEGER,
    result_b   INTEGER
);

CREATE TABLE answers (
    id         BIGSERIAL PRIMARY KEY,
    match_id   INTEGER,
    user_id    INTEGER,
    result     INTEGER,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);
CREATE UNIQUE INDEX index_answers_on_match_id_and_user_id ON answers (match_id, user_id);
