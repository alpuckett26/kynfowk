create policy "invitees can view their pending memberships"
on public.family_memberships
for select
using (
  user_id is null
  and status = 'invited'
  and invite_email is not null
  and lower(invite_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
);

create policy "invitees can claim their pending memberships"
on public.family_memberships
for update
using (
  user_id is null
  and status = 'invited'
  and invite_email is not null
  and lower(invite_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
)
with check (
  user_id = auth.uid()
  and status = 'active'
  and invite_email is not null
  and lower(invite_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
);
