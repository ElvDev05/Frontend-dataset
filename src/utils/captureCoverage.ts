import type { CaptureAngle, EvaluationImage } from "../types/api";

export type CaptureCoverage = "Incomplete" | "ThreeImages" | "FourImages";

export function verifiedImageCount(images: EvaluationImage[]): number {
  return images.filter((image) => image.uploadStatus === "Verified").length;
}

export function captureCoverage(images: EvaluationImage[]): CaptureCoverage {
  if (images.some((image) => image.uploadStatus !== "Verified"))
    return "Incomplete";

  const verified = new Set<CaptureAngle>(
    images
      .filter((image) => image.uploadStatus === "Verified")
      .map((image) => image.angle),
  );
  const hasRequiredAngles =
    verified.has("TopBack") &&
    verified.has("Rear") &&
    (verified.has("LeftLateral") || verified.has("RightLateral"));

  if (!hasRequiredAngles) return "Incomplete";
  if (verified.size === 4 && images.length === 4) return "FourImages";
  if (verified.size === 3 && images.length === 3) return "ThreeImages";
  return "Incomplete";
}

export function captureRequirementMessages(
  images: EvaluationImage[],
): string[] {
  const verified = new Set<CaptureAngle>(
    images
      .filter((image) => image.uploadStatus === "Verified")
      .map((image) => image.angle),
  );
  const messages: string[] = [];

  if (!verified.has("LeftLateral") && !verified.has("RightLateral"))
    messages.push("Verificar una vista lateral (izquierda o derecha).");
  if (!verified.has("TopBack"))
    messages.push("Verificar la vista superior del lomo.");
  if (!verified.has("Rear")) messages.push("Verificar la vista posterior.");

  if (
    messages.length === 0 &&
    images.some((image) => image.uploadStatus !== "Verified")
  )
    messages.push("Finalizar o retirar la fotografía que continúa pendiente.");

  return messages;
}
