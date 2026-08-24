export function mediaPreviewKind(contentType: string) {
  if (contentType.startsWith("image/")) return "image" as const;
  if (contentType.startsWith("audio/")) return "audio" as const;
  return "link" as const;
}
