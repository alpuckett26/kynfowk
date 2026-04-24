import { getCallSummary } from "@/lib/connections";
import { PostCallView } from "./PostCallView";

export default async function PostCallPage({
  params,
}: {
  params: { callId: string };
}) {
  const metrics = await getCallSummary(params.callId);

  return <PostCallView metrics={metrics} familyName="Henderson" />;
}
