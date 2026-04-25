import { apiFetch } from "@/lib/api";
import type { DashboardResponse } from "@/types/api";

export async function fetchDashboard(): Promise<DashboardResponse> {
  return apiFetch<DashboardResponse>("/api/native/dashboard");
}
