import { test } from "node:test";
import assert from "node:assert/strict";
import {
  captureCoverage,
  captureRequirementMessages,
} from "../src/utils/captureCoverage.ts";
import type {
  CaptureAngle,
  EvaluationImage,
  ImageUploadStatus,
} from "../src/types/api.ts";

function image(
  angle: CaptureAngle,
  uploadStatus: ImageUploadStatus = "Verified",
): EvaluationImage {
  return {
    imageIdentifier: angle,
    angle,
    uploadStatus,
    objectKey: uploadStatus === "Verified" ? `dataset/${angle}` : null,
    contentType: uploadStatus === "Verified" ? "image/jpeg" : null,
    sizeBytes: uploadStatus === "Verified" ? 100 : null,
    checksumSha256: null,
    verifiedAt: uploadStatus === "Verified" ? "2026-09-10T00:00:00Z" : null,
  };
}

test("accepts either lateral together with top and rear as minimum coverage", () => {
  for (const lateral of ["LeftLateral", "RightLateral"] as const) {
    const images = [image(lateral), image("TopBack"), image("Rear")];
    assert.equal(captureCoverage(images), "ThreeImages");
    assert.deepEqual(captureRequirementMessages(images), []);
  }
});

test("distinguishes four-image coverage from an invalid three-image set", () => {
  assert.equal(
    captureCoverage([
      image("LeftLateral"),
      image("RightLateral"),
      image("TopBack"),
      image("Rear"),
    ]),
    "FourImages",
  );

  const withoutRear = [
    image("LeftLateral"),
    image("RightLateral"),
    image("TopBack"),
  ];
  assert.equal(captureCoverage(withoutRear), "Incomplete");
  assert.deepEqual(captureRequirementMessages(withoutRear), [
    "Verificar la vista posterior.",
  ]);
});

test("blocks completion while an optional fourth photograph remains pending", () => {
  const images = [
    image("LeftLateral"),
    image("TopBack"),
    image("Rear"),
    image("RightLateral", "PendingUpload"),
  ];
  assert.equal(captureCoverage(images), "Incomplete");
  assert.deepEqual(captureRequirementMessages(images), [
    "Finalizar o retirar la fotografía que continúa pendiente.",
  ]);
});
