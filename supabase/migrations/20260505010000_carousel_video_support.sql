-- M83: add media_type and duration_seconds to circle_carousel_photos
-- Allows short family videos (≤10 s) in the reel alongside photos.

ALTER TABLE circle_carousel_photos
  ADD COLUMN IF NOT EXISTS media_type      text NOT NULL DEFAULT 'photo'
    CHECK (media_type IN ('photo', 'video')),
  ADD COLUMN IF NOT EXISTS duration_seconds numeric(5, 2);
