import type { Route } from "next";
import Link from "next/link";

import { AdSlot } from "@/components/ad-slot";
import { Card } from "@/components/card";
import { CarouselPhotoUpload } from "@/components/carousel-photo-upload";
import { FamilyManagementList } from "@/components/family-management-list";
import { InviteFamButton } from "@/components/invite-fam-button";

export interface FamilyPanelMember {
  id: string;
  display_name: string;
  relationship_label: string | null;
  invite_email: string | null;
  status: "active" | "invited" | "blocked";
  role: "owner" | "member";
  user_id: string | null;
  created_at: string;
  blocked_at: string | null;
  blocked_reason: string | null;
  is_placeholder: boolean;
  is_deceased: boolean;
  placeholder_notes: string | null;
  avatar_url: string | null;
  last_seen_at: string | null;
  phone_number: string | null;
}

export interface FamilyPanelProps {
  userId: string;
  familyCircleId: string;
  viewerMembershipId: string;
  canManage: boolean;
  members: FamilyPanelMember[];
  carouselPhotos: Array<{
    id: string;
    photoUrl: string;
    caption: string | null;
    membershipId: string;
    mediaType: "photo" | "video";
  }>;
}

export function FamilyPanel({
  userId,
  familyCircleId,
  viewerMembershipId,
  canManage,
  members,
  carouselPhotos,
}: FamilyPanelProps) {
  return (
    <>
      <header className="connect-greeting">
        <h1>Your family</h1>
      </header>

      <Card>
        <div className="stack-md">
          <div className="action-bar">
            <InviteFamButton />
            <Link className="button button-secondary" href={"/family/tree" as Route}>
              View family tree
            </Link>
          </div>
          <FamilyManagementList
            canManage={canManage}
            familyCircleId={familyCircleId}
            members={members}
            viewerMembershipId={viewerMembershipId}
          />
        </div>
      </Card>

      <Card>
        <div className="stack-md">
          <h2>Family photo reel</h2>
          <p className="meta">
            Share a photo with your circle — it shows up in the carousel on
            the home screen so everyone sees a little piece of family.
          </p>
          <CarouselPhotoUpload
            membershipId={viewerMembershipId}
            photos={carouselPhotos}
          />
        </div>
      </Card>

      <AdSlot userId={userId} placement="family-panel" size="leaderboard" />
    </>
  );
}
