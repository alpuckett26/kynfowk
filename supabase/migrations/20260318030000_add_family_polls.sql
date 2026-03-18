-- Family polls: "this or that" preference questions
create table if not exists family_polls (
  id          uuid        primary key default gen_random_uuid(),
  question    text        not null,
  option_a    text        not null,
  option_b    text        not null,
  emoji_a     text,
  emoji_b     text,
  category    text        not null default 'general',
  created_at  timestamptz not null default now()
);

-- Per-member answers
create table if not exists family_poll_responses (
  id                uuid        primary key default gen_random_uuid(),
  poll_id           uuid        not null references family_polls(id) on delete cascade,
  membership_id     uuid        not null references family_memberships(id) on delete cascade,
  family_circle_id  uuid        not null references family_circles(id) on delete cascade,
  choice            text        not null check (choice in ('a', 'b')),
  created_at        timestamptz not null default now(),
  unique (poll_id, membership_id)
);

create index if not exists family_poll_responses_circle_idx
  on family_poll_responses (family_circle_id, poll_id);

create index if not exists family_poll_responses_membership_idx
  on family_poll_responses (membership_id);

-- RLS
alter table family_polls enable row level security;
alter table family_poll_responses enable row level security;

-- Anyone can read the question bank
create policy "family_polls_select" on family_polls
  for select using (true);

-- Circle members can read their circle's responses
create policy "family_poll_responses_select" on family_poll_responses
  for select using (
    family_circle_id in (
      select fm.family_circle_id
      from family_memberships fm
      where fm.user_id = (select auth.uid())
        and fm.status = 'active'
    )
  );

-- Active members can insert their own answer
create policy "family_poll_responses_insert" on family_poll_responses
  for insert with check (
    membership_id in (
      select fm.id
      from family_memberships fm
      where fm.user_id = (select auth.uid())
        and fm.status = 'active'
    )
  );

-- Seed the question bank
insert into family_polls (question, option_a, option_b, emoji_a, emoji_b, category) values
  ('Sweet potato or pumpkin pie?',           'Sweet potato pie',  'Pumpkin pie',       '🍠', '🥧', 'food'),
  ('Cooking at home or ordering out?',       'Home cooked',       'Order in/out',      '🍳', '🛵', 'food'),
  ('Coffee or tea?',                         'Coffee',            'Tea',               '☕', '🫖', 'food'),
  ('Beach vacation or mountain getaway?',    'Beach',             'Mountains',         '🏖️', '⛰️', 'travel'),
  ('Road trip or fly there?',                'Road trip',         'Fly',               '🚗', '✈️', 'travel'),
  ('Night owl or early bird?',               'Night owl',         'Early bird',        '🦉', '🐦', 'lifestyle'),
  ('Phone call or text message?',            'Phone call',        'Text',              '📞', '💬', 'communication'),
  ('Movies at home or movie theater?',       'At home',           'Movie theater',     '🛋️', '🎬', 'entertainment'),
  ('Card games or board games?',             'Card games',        'Board games',       '🃏', '🎲', 'entertainment'),
  ('Summer or winter?',                      'Summer',            'Winter',            '☀️', '❄️', 'seasons'),
  ('Big family gathering or small dinner?',  'Big gathering',     'Intimate dinner',   '🎉', '🕯️', 'family'),
  ('Singing along or just listening?',       'Sing along',        'Just listen',       '🎤', '🎧', 'entertainment'),
  ('Morning person on holidays or sleep in?','Up early',          'Sleep in',          '🌅', '😴', 'lifestyle'),
  ('Mac and cheese or mashed potatoes?',     'Mac and cheese',    'Mashed potatoes',   '🧀', '🥔', 'food'),
  ('Surprise party or planned celebration?', 'Surprise me!',      'Planned party',     '🎊', '📅', 'family'),
  ('Old photos or new memories first?',      'Old photos',        'New moments',       '📷', '✨', 'family'),
  ('Sports fan or skip the game?',           'Love sports',       'Skip it',           '🏈', '🙅', 'entertainment'),
  ('Hugs or handshakes when greeting?',      'Big hug',           'Handshake/nod',     '🤗', '🤝', 'family'),
  ('Holiday music before or after Thanksgiving?', 'Before',       'After Turkey Day',  '🎵', '🦃', 'traditions'),
  ('Pie or cake for celebrations?',          'Pie',               'Cake',              '🥧', '🎂', 'food');
