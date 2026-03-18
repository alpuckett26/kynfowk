-- Organic game preference poll questions (added to existing poll bank)
INSERT INTO family_polls (question, option_a, option_b, emoji_a, emoji_b, category) VALUES
  ('Trivia night or drawing challenge?', 'Trivia all day', 'Drawing challenge', '🎯', '🎨', 'games'),
  ('Playing for laughs or playing to win?', 'Just for laughs', 'Playing to win', '😂', '🏆', 'games'),
  ('Quick 5-min game or long session?', 'Quick round', 'Long session', '⚡', '🕐', 'games'),
  ('Word games or card games?', 'Word games', 'Card games', '📝', '🃏', 'games');

-- Game catalog (built-in games for v1)
CREATE TABLE IF NOT EXISTS game_catalog (
  id              text        PRIMARY KEY,
  name            text        NOT NULL,
  description     text,
  category        text        NOT NULL,
  min_players     int         NOT NULL DEFAULT 2,
  max_players     int         NOT NULL DEFAULT 8,
  duration_label  text        NOT NULL DEFAULT '~10 min',
  pace            text        NOT NULL DEFAULT 'quick',
  is_active       boolean     NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE game_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "game_catalog_select" ON game_catalog FOR SELECT USING (true);

INSERT INTO game_catalog (id, name, description, category, min_players, max_players, duration_label, pace) VALUES
  ('trivia',      'Family Trivia',  'Answer trivia questions together. First to buzz in gets the point!', 'trivia', 2, 6, '~10 min', 'quick'),
  ('word_chain',  'Word Chain',     'Each person says a word starting with the last letter of the previous one. How long can the chain go?', 'word', 2, 6, '~5 min', 'quick');

-- Game sessions (logged per call)
CREATE TABLE IF NOT EXISTS game_sessions (
  id                       uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  call_session_id          uuid        NOT NULL REFERENCES call_sessions(id) ON DELETE CASCADE,
  family_circle_id         uuid        NOT NULL REFERENCES family_circles(id) ON DELETE CASCADE,
  game_id                  text        NOT NULL REFERENCES game_catalog(id),
  started_by_membership_id uuid        NOT NULL REFERENCES family_memberships(id),
  participants             jsonb       NOT NULL DEFAULT '[]',
  started_at               timestamptz NOT NULL DEFAULT now(),
  ended_at                 timestamptz,
  duration_seconds         int,
  revenue_event_fired      boolean     NOT NULL DEFAULT false,
  created_at               timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "game_sessions_select" ON game_sessions FOR SELECT USING (
  family_circle_id IN (
    SELECT fm.family_circle_id FROM family_memberships fm
    WHERE fm.user_id = (SELECT auth.uid()) AND fm.status = 'active'
  )
);

CREATE POLICY "game_sessions_insert" ON game_sessions FOR INSERT WITH CHECK (
  family_circle_id IN (
    SELECT fm.family_circle_id FROM family_memberships fm
    WHERE fm.user_id = (SELECT auth.uid()) AND fm.status = 'active'
  )
);

CREATE POLICY "game_sessions_update" ON game_sessions FOR UPDATE USING (
  family_circle_id IN (
    SELECT fm.family_circle_id FROM family_memberships fm
    WHERE fm.user_id = (SELECT auth.uid()) AND fm.status = 'active'
  )
);
