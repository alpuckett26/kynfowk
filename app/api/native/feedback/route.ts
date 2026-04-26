import {
  authenticateNativeRequest,
  nativeErrorResponse,
} from "@/lib/native-auth";
import { savePilotFeedback } from "@/lib/product-insights";
import { getViewerFamilyCircleWith } from "@/lib/data";

type Body = {
  category?: "bug" | "confusing" | "suggestion" | "positive";
  message?: string;
  pagePath?: string;
};

export async function POST(request: Request) {
  try {
    const { user, supabase } = await authenticateNativeRequest(request);
    const body = (await request.json().catch(() => ({}))) as Body;

    const category = body.category;
    const message = (body.message ?? "").trim();
    if (
      !category ||
      !["bug", "confusing", "suggestion", "positive"].includes(category) ||
      !message
    ) {
      return Response.json(
        { error: "Pick a category and write a message." },
        { status: 400 }
      );
    }

    const family = await getViewerFamilyCircleWith(supabase, user.id);
    const result = await savePilotFeedback(supabase, {
      userId: user.id,
      category,
      message,
      pagePath: (body.pagePath ?? "native").trim() || null,
      familyCircleId: family?.circle.id ?? null,
      callSessionId: null,
    });
    if (result.error) {
      return Response.json({ error: result.error }, { status: 400 });
    }

    return Response.json({ success: true });
  } catch (error) {
    return nativeErrorResponse(error);
  }
}
