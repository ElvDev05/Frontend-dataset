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

test("accepts rear plus either lateral as the two required photographs", () => {
  for (const lateral of ["LeftLateral", "RightLateral"] as const) {
    const images = [image(lateral), image("Rear")];
    assert.equal(captureCoverage(images), "TwoImages");
    assert.deepEqual(captureRequirementMessages(images), []);
  }
});

test("rejects sets without rear, with a top-back photo or with both laterals", () => {
  const withoutRear = [image("LeftLateral")];
  assert.equal(captureCoverage(withoutRear), "Incomplete");
  assert.deepEqual(captureRequirementMessages(withoutRear), [
    "Verificar la vista posterior.",
  ]);

  const withTopBack = [image("RightLateral"), image("TopBack"), image("Rear")];
  assert.equal(captureCoverage(withTopBack), "Incomplete");
  assert.deepEqual(captureRequirementMessages(withTopBack), [
    "Retirar la fotografía superior del lomo; ya no se utiliza.",
  ]);

  const bothLaterals = [
    image("LeftLateral"),
    image("RightLateral"),
    image("Rear"),
  ];
  assert.equal(captureCoverage(bothLaterals), "Incomplete");
  assert.deepEqual(captureRequirementMessages(bothLaterals), [
    "Retirar uno de los dos laterales; solo se admite uno.",
  ]);
});

test("blocks completion while a photograph remains pending", () => {
  const images = [image("RightLateral"), image("Rear", "PendingUpload")];
  assert.equal(captureCoverage(images), "Incomplete");
  assert.deepEqual(captureRequirementMessages(images), [
    "Verificar la vista posterior.",
  ]);
});
