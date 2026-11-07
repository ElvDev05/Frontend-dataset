import type { CaptureAngle, EvaluationImage } from "../types/api";

// The API completes an evaluation with exactly two verified photographs:
// the rear view and one lateral side (left or right).
export type CaptureCoverage = "Incomplete" | "TwoImages";

export const isLateral = (angle: CaptureAngle) =>
  angle === "LeftLateral" || angle === "RightLateral";

export function verifiedImageCount(images: EvaluationImage[]): number {
  return images.filter((image) => image.uploadStatus === "Verified").length;
}

export function captureCoverage(images: EvaluationImage[]): CaptureCoverage {
  if (images.length !== 2) return "Incomplete";
  if (images.some((image) => image.uploadStatus !== "Verified"))
    return "Incomplete";
  const angles = images.map((image) => image.angle);
  return angles.includes("Rear") && angles.some(isLateral)
    ? "TwoImages"
    : "Incomplete";
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
  if (!verified.has("Rear")) messages.push("Verificar la vista posterior.");
  if (images.some((image) => image.angle === "TopBack"))
    messages.push("Retirar la fotografía superior del lomo; ya no se utiliza.");
  if (images.filter((image) => isLateral(image.angle)).length > 1)
    messages.push("Retirar uno de los dos laterales; solo se admite uno.");

  if (
    messages.length === 0 &&
    images.some((image) => image.uploadStatus !== "Verified")
  )
    messages.push("Finalizar o retirar la fotografía que continúa pendiente.");

  return messages;
}
