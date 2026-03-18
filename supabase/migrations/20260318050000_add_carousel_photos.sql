CREATE TABLE IF NOT EXISTS circle_carousel_photos (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  family_circle_id uuid        NOT NULL REFERENCES family_circles(id) ON DELETE CASCADE,
  membership_id    uuid        NOT NULL REFERENCES family_memberships(id) ON DELETE CASCADE,
  photo_url        text        NOT NULL,
  caption          text,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS carousel_photos_circle_idx
  ON circle_carousel_photos (family_circle_id, created_at DESC);

ALTER TABLE circle_carousel_photos ENABLE ROW LEVEL SECURITY;

-- Circle members can view all carousel photos for their circle
CREATE POLICY "carousel_photos_select" ON circle_carousel_photos
  FOR SELECT USING (
    family_circle_id IN (
      SELECT fm.family_circle_id
      FROM family_memberships fm
      WHERE fm.user_id = (SELECT auth.uid())
        AND fm.status = 'active'
    )
  );

-- Active members can insert their own photos
CREATE POLICY "carousel_photos_insert" ON circle_carousel_photos
  FOR INSERT WITH CHECK (
    membership_id IN (
      SELECT fm.id
      FROM family_memberships fm
      WHERE fm.user_id = (SELECT auth.uid())
        AND fm.status = 'active'
    )
  );

-- Members can delete their own photos (circle owners can delete any)
CREATE POLICY "carousel_photos_delete" ON circle_carousel_photos
  FOR DELETE USING (
    membership_id IN (
      SELECT fm.id
      FROM family_memberships fm
      WHERE fm.user_id = (SELECT auth.uid())
        AND fm.status = 'active'
    )
    OR
    family_circle_id IN (
      SELECT fm.family_circle_id
      FROM family_memberships fm
      WHERE fm.user_id = (SELECT auth.uid())
        AND fm.role = 'owner'
        AND fm.status = 'active'
    )
  );
