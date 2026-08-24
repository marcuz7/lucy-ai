export type DetailState = "loading" | "error" | "not-found" | "ready";

export function getDetailState(input: { isLoading: boolean; isError: boolean; hasData: boolean }): DetailState {
  if (input.isLoading) return "loading";
  if (input.isError) return "error";
  if (!input.hasData) return "not-found";
  return "ready";
}
