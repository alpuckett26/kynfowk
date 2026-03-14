create unique index if not exists availability_windows_unique_slot_idx
  on public.availability_windows (family_circle_id, membership_id, weekday, start_hour, end_hour);

create policy "members can delete their own availability"
on public.availability_windows
for delete
using (
  user_id = auth.uid()
  and exists (
    select 1
    from public.family_memberships membership
    where membership.id = membership_id
      and membership.user_id = auth.uid()
      and membership.family_circle_id = family_circle_id
  )
);
