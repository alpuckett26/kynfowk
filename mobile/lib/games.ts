import { apiFetch } from "@/lib/api";
import type {
  GameCatalogResponse,
  StartGameSessionBody,
  StartGameSessionResponse,
} from "@/types/api";

export function fetchGameCatalog(): Promise<GameCatalogResponse> {
  return apiFetch<GameCatalogResponse>("/api/native/games/catalog");
}

export function startGameSession(
  body: StartGameSessionBody
): Promise<StartGameSessionResponse> {
  return apiFetch("/api/native/games/sessions", { method: "POST", body });
}

export function endGameSession(
  sessionId: string,
  durationSeconds: number
): Promise<{ success: true }> {
  return apiFetch(`/api/native/games/sessions/${sessionId}/end`, {
    method: "POST",
    body: { durationSeconds },
  });
}
