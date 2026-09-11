import { test, expect, type Page, type Route } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import type { Bovine, Evaluation, Role, Specialist } from "../../src/types/api";

// Contract fixtures live only in tests; the delivered application always calls the real API.
const imageBytes = readFileSync("public/icons/icon-192.png");
async function fixture(page: Page, role: Role = "Administrator") {
  const bovine: Bovine = {
    id: 1,
    identificationCode: "PRUEBA-001",
    sex: "Male",
    predominantBreedId: 1,
    birthDate: "2023-01-01",
    estimatedAgeMonths: null,
    ageReferenceDate: null,
    notes: "",
    version: randomUUID(),
  };
  const evaluation: Evaluation = {
    id: 1,
    bovineId: 1,
    evaluationDate: "2026-01-01",
    ageMonths: 36,
    ageSource: "BirthDate",
    weightKg: 420,
    bodyConditionScore: 3.25,
    specialistId: 1,
    notes: "",
    status: "Draft",
    rejectionReason: null,
    completedAt: null,
    rejectedAt: null,
    version: randomUUID(),
    images: [],
  };
  const specialists: Specialist[] = [
    {
      id: 1,
      fullName: "Especialista de prueba",
      isActive: true,
      version: randomUUID(),
    },
  ];
  const breeds = [{ id: 1, name: "Raza de prueba", isActive: true }];
  const requests: {
    path: string;
    method: string;
    body: Record<string, unknown>;
    query: URLSearchParams;
  }[] = [];
  let stale = 0;
  let failConfirm = true;
  let failPut = false;
  let uploadCount = 0;
  let authFailure = false;
  let forceConflict = false;
  const attempts = new Map<string, string>();
  async function reply(route: Route, data: unknown, status = 200) {
    await route.fulfill({
      status,
      contentType: "application/json",
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
        "Cache-Control": "no-store",
      },
      body: JSON.stringify(data),
    });
  }
  await page.route("http://localhost:5080/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace("/api/v1", "");
    const method = request.method();
    if (method === "OPTIONS") return reply(route, {});
    const body = (request.postDataJSON() || {}) as Record<string, unknown>;
    requests.push({ path, method, body, query: url.searchParams });
    if (path === "/authentication/sign-in")
      return reply(route, {
        accessToken: "test-session-token",
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        userId: 1,
        displayName: "Usuario de prueba",
        role,
      });
    expect(request.headers().authorization).toBe("Bearer test-session-token");
    if (authFailure) return reply(route, { code: "http_401" }, 401);
    if (path === "/users/me")
      return reply(route, {
        id: 1,
        username: "PRUEBA",
        displayName: "Usuario de prueba",
        role,
        isActive: true,
      });
    if (path === "/breeds") {
      if (method === "POST")
        breeds.push({
          id: breeds.length + 1,
          name: String(body.name),
          isActive: true,
        });
      return reply(route, method === "POST" ? breeds.at(-1) : breeds);
    }
    if (path === "/specialists") {
      if (method === "POST")
        specialists.push({
          id: specialists.length + 1,
          fullName: String(body.fullName),
          isActive: true,
          version: randomUUID(),
        });
      return reply(route, method === "POST" ? specialists.at(-1) : specialists);
    }
    if (/^\/specialists\/\d+$/.test(path)) {
      const item = specialists.find(
        (s) => s.id === Number(path.split("/").at(-1)),
      )!;
      expect(body.version).toBe(item.version);
      Object.assign(item, body, { version: randomUUID() });
      return reply(route, item);
    }
    if (path === "/bovines") {
      if (method === "POST") {
        Object.assign(bovine, body, {
          version: randomUUID(),
          notes: body.notes || "",
        });
        return reply(route, bovine, 201);
      }
      return reply(route, {
        items: [bovine],
        total: 26,
        page: Number(url.searchParams.get("page") || 1),
        pageSize: Number(url.searchParams.get("pageSize") || 25),
      });
    }
    if (path === "/bovines/1") {
      if (method === "PUT") {
        if (forceConflict)
          return reply(route, { code: "concurrency_conflict" }, 409);
        expect(body.version).toBe(bovine.version);
        Object.assign(bovine, body, {
          version: randomUUID(),
          notes: body.notes || "",
        });
      }
      return reply(route, bovine);
    }
    if (path === "/evaluations" || path === "/bovines/1/evaluations") {
      if (method === "POST") {
        Object.assign(evaluation, body, {
          version: randomUUID(),
          notes: body.notes || "",
        });
        return reply(route, evaluation, 201);
      }
      return reply(route, {
        items: [evaluation],
        total: 1,
        page: 1,
        pageSize: 25,
      });
    }
    if (path === "/dataset/exports/csv") {
      const captureSet = url.searchParams.get("captureSet") || "All";
      const fileNames: Record<string, string> = {
        All: "bovine-dataset-all.csv",
        ThreeImages: "bovine-dataset-three-images.csv",
        FourImages: "bovine-dataset-four-images.csv",
      };
      return route.fulfill({
        status: 200,
        contentType: "text/csv",
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Expose-Headers": "Content-Disposition",
          "Content-Disposition": `attachment; filename=${fileNames[captureSet]}`,
        },
        body:
          "image_identifier,object_key,capture_set,capture_image_count,bovine_sex\n",
      });
    }
    if (path.startsWith("/evaluations/1")) {
      if (method === "GET") return reply(route, evaluation);
      const needsVersion =
        path.endsWith("/images") ||
        path.endsWith("/complete") ||
        path.endsWith("/reject") ||
        path.endsWith("/reopen") ||
        path === "/evaluations/1" ||
        method === "DELETE";
      if (
        needsVersion &&
        (body.version || url.searchParams.get("version")) !== evaluation.version
      ) {
        stale++;
        return reply(route, { code: "concurrency_conflict" }, 409);
      }
      if (path.endsWith("/images"))
        evaluation.images.push({
          imageIdentifier: randomUUID(),
          angle: body.angle as Evaluation["images"][number]["angle"],
          uploadStatus: "PendingUpload",
          contentType: null,
          objectKey: null,
          sizeBytes: null,
          checksumSha256: null,
          verifiedAt: null,
        });
      else if (path.endsWith("/upload-url")) {
        const attemptId = randomUUID();
        attempts.set(attemptId, path.split("/")[4]!);
        evaluation.version = randomUUID();
        return reply(route, {
          attemptId,
          url: `https://storage.example.test/${attemptId}`,
          expiresAt: new Date(Date.now() + 600000).toISOString(),
          headers: { "Content-Type": body.contentType },
        });
      } else if (path.endsWith("/confirm-upload")) {
        if (failConfirm) {
          failConfirm = false;
          return reply(route, { code: "http_429" }, 429);
        }
        const image = evaluation.images.find(
          (i) => i.imageIdentifier === attempts.get(String(body.attemptId)),
        )!;
        image.uploadStatus = "Verified";
        image.objectKey = `dataset/1/${image.imageIdentifier}`;
        image.contentType = "image/png";
        image.sizeBytes = imageBytes.length;
        image.verifiedAt = new Date().toISOString();
      } else if (path.endsWith("/download-url"))
        return reply(route, {
          url: "https://storage.example.test/photo.png",
          expiresAt: new Date(Date.now() + 300000).toISOString(),
        });
      else if (path.endsWith("/complete")) {
        const verified = evaluation.images.filter(
          (image) => image.uploadStatus === "Verified",
        );
        const verifiedAngles = new Set(verified.map((image) => image.angle));
        const validCoverage =
          evaluation.images.every(
            (image) => image.uploadStatus === "Verified",
          ) &&
          (verified.length === 3 || verified.length === 4) &&
          verifiedAngles.has("TopBack") &&
          verifiedAngles.has("Rear") &&
          (verifiedAngles.has("LeftLateral") ||
            verifiedAngles.has("RightLateral"));
        if (!validCoverage)
          return reply(
            route,
            {
              detail:
                "At least three verified images are required: top back, rear and one lateral side. A fourth image may contain the other lateral side.",
            },
            400,
          );
        evaluation.status = "Complete";
        evaluation.completedAt = new Date().toISOString();
      } else if (path.endsWith("/reject")) {
        evaluation.status = "Rejected";
        evaluation.rejectionReason = String(body.reason);
      } else if (path.endsWith("/reopen")) evaluation.status = "Draft";
      else if (method === "DELETE")
        evaluation.images = evaluation.images.filter(
          (i) => i.imageIdentifier !== path.split("/")[4],
        );
      else if (method === "PUT") Object.assign(evaluation, body);
      if (!["Complete", "Rejected"].includes(evaluation.status))
        evaluation.status = evaluation.images.some(
          (i) => i.uploadStatus !== "Verified",
        )
          ? "PendingUpload"
          : "Draft";
      evaluation.version = randomUUID();
      return reply(route, evaluation);
    }
    throw new Error(`Unexpected API endpoint: ${method} ${path}`);
  });
  await page.route("https://storage.example.test/**", async (route) => {
    const request = route.request();
    expect(request.headers().authorization).toBeUndefined();
    expect(request.headers().cookie).toBeUndefined();
    if (request.method() === "OPTIONS")
      return route.fulfill({
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Allow-Methods": "PUT,GET",
        },
      });
    if (request.method() === "PUT") {
      uploadCount++;
      expect(request.headers()["content-type"]).toBe("image/png");
      expect(request.postDataBuffer()).toEqual(imageBytes);
      if (failPut) {
        failPut = false;
        return route.abort("failed");
      }
      return route.fulfill({
        status: 200,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: "",
      });
    }
    return route.fulfill({
      status: 200,
      contentType: "image/png",
      body: imageBytes,
    });
  });
  const consoleErrors: string[] = [];
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  return {
    bovine,
    evaluation,
    requests,
    consoleErrors,
    get stale() {
      return stale;
    },
    get uploadCount() {
      return uploadCount;
    },
    expire() {
      authFailure = true;
    },
    conflict() {
      forceConflict = true;
    },
    failNextPut() {
      failPut = true;
    },
    allowConfirm() {
      failConfirm = false;
    },
  };
}
async function login(page: Page, destination = "/bovinos") {
  await page.goto(destination);
  await expect(page).toHaveURL(/ingresar/);
  await page.getByLabel("Usuario", { exact: true }).fill("prueba");
  await page.getByLabel("Contraseña", { exact: true }).fill(randomUUID());
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`${destination}$`));
}

test("protected routes, search, pagination, session restore and logout", async ({
  page,
}) => {
  const state = await fixture(page);
  await login(page);
  await expect(page.getByText("PRUEBA-001", { exact: true })).toBeVisible();
  await expect(page.getByText("Macho", { exact: true })).toBeVisible();
  await page
    .getByLabel("Código de identificación", { exact: true })
    .fill("PRUEBA");
  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  await expect
    .poll(() =>
      state.requests
        .filter((r) => r.path === "/bovines")
        .at(-1)
        ?.query.get("code"),
    )
    .toBe("PRUEBA");
  await page.getByRole("combobox", { name: "Sexo", exact: true }).click();
  await page
    .getByRole("option", { name: "Hembra", exact: true })
    .click();
  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  await expect
    .poll(() =>
      state.requests
        .filter((r) => r.path === "/bovines")
        .at(-1)
        ?.query.get("sex"),
    )
    .toBe("Female");
  await page
    .getByRole("button", { name: "Página siguiente", exact: true })
    .click();
  await expect
    .poll(() =>
      state.requests
        .filter((r) => r.path === "/bovines")
        .at(-1)
        ?.query.get("page"),
    )
    .toBe("2");
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Bovinos", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Cerrar sesión", exact: true })
    .click();
  await expect(page).toHaveURL(/ingresar/);
  expect(
    await page.evaluate(() => sessionStorage.getItem("bovine-session")),
  ).toBeNull();
  expect(state.consoleErrors).toEqual([]);
});

test("exclusive age alternatives, DateOnly payload and stale version protection", async ({
  page,
}) => {
  const state = await fixture(page);
  await login(page, "/bovinos/nuevo");
  await page
    .getByLabel("Código de identificación *", { exact: true })
    .fill("CAMPO-002");
  await page.getByRole("button", { name: "Macho", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Raza predominante *", exact: true })
    .click();
  await page.getByRole("option", { name: "Raza de prueba" }).click();
  await page
    .getByRole("button", { name: "Edad estimada", exact: true })
    .click();
  await page.getByLabel("Edad estimada en meses *", { exact: true }).fill("24");
  await page
    .getByLabel("Fecha de referencia de la edad *", { exact: true })
    .fill("2026-01-01");
  await page
    .getByRole("button", { name: "Guardar bovino", exact: true })
    .click();
  await expect(page).toHaveURL(/bovinos\/1$/);
  const body = state.requests.find(
    (r) => r.path === "/bovines" && r.method === "POST",
  )!.body;
  expect(body).toMatchObject({
    sex: "Male",
    birthDate: null,
    estimatedAgeMonths: 24,
    ageReferenceDate: "2026-01-01",
  });
  await expect(page.getByText("Macho", { exact: true }).first()).toBeVisible();
  await page.getByRole("button", { name: "Editar", exact: true }).click();
  await page.getByRole("button", { name: "Hembra", exact: true }).click();
  await page
    .getByRole("button", { name: "Fecha de nacimiento", exact: true })
    .click();
  await page
    .getByLabel("Fecha de nacimiento *", { exact: true })
    .fill("2023-02-01");
  state.conflict();
  await page
    .getByRole("button", { name: "Guardar bovino", exact: true })
    .click();
  await expect(
    page.getByRole("alert").filter({ hasText: "El registro cambió. Recarga los datos antes de continuar." }),
  ).toBeVisible();
  expect(
    state.requests.find((r) => r.path === "/bovines/1" && r.method === "PUT")!
      .body,
  ).toMatchObject({
    sex: "Female",
    birthDate: "2023-02-01",
    estimatedAgeMonths: null,
    ageReferenceDate: null,
  });
  await expect(
    page.getByRole("button", { name: "Guardar bovino", exact: true }),
  ).toBeDisabled();
  expect(state.consoleErrors).toEqual([]);
});

test("evaluation form permits drafts and uses the exact endpoint", async ({
  page,
}) => {
  const state = await fixture(page);
  await login(page, "/bovinos/1/evaluaciones/nueva");
  await page
    .getByLabel("Fecha de evaluación *", { exact: true })
    .fill("2026-01-02");
  await page
    .getByRole("button", { name: "Guardar evaluación", exact: true })
    .click();
  await expect(page).toHaveURL(/evaluaciones\/1$/);
  expect(
    state.requests.find(
      (r) => r.path === "/bovines/1/evaluations" && r.method === "POST",
    )!.body,
  ).toEqual({
    evaluationDate: "2026-01-02",
    weightKg: null,
    bodyConditionScore: null,
    specialistId: null,
    notes: null,
  });
  await expect(
    page.getByRole("button", { name: "Completar evaluación", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByText("Registrar el peso.", { exact: true }),
  ).toBeVisible();
});

test("four independent image uploads, idempotent confirmation retry, completion and rejection", async ({
  page,
}) => {
  const state = await fixture(page);
  await login(page, "/evaluaciones/1");
  const cards = page.locator(".image-card");
  await expect(cards).toHaveCount(4);
  for (let i = 0; i < 4; i++) {
    await cards
      .nth(i)
      .locator("input[type=file]")
      .setInputFiles({
        name: `foto-${i}.png`,
        mimeType: "image/png",
        buffer: imageBytes,
      });
    await cards
      .nth(i)
      .getByRole("button", { name: "Subir", exact: true })
      .click();
  }
  await expect(
    page.getByText("3 fotos · cobertura pendiente", { exact: true }),
  ).toBeVisible();
  const retryCard = page
    .locator(".image-card")
    .filter({
      has: page.getByRole("button", { name: "Reintentar", exact: true }),
    });
  await retryCard
    .getByRole("button", { name: "Reintentar", exact: true })
    .click();
  await expect(
    page.getByText("Cobertura completa · 4 fotos", { exact: true }),
  ).toBeVisible();
  expect(state.uploadCount).toBe(4);
  expect(state.stale).toBe(0);
  await page
    .getByRole("button", { name: "Completar evaluación", exact: true })
    .click();
  await page.getByRole("button", { name: "Completar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Evaluación completada", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Editar datos", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Rechazar", exact: true }).click();
  await page.getByLabel("Motivo del rechazo *").fill("Revisar las mediciones.");
  await page
    .getByRole("button", { name: "Confirmar rechazo", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Evaluación rechazada", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Reabrir evaluación", exact: true })
    .click();
  await page.getByRole("button", { name: "Reabrir", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Editar datos", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Retirar", exact: true })
    .first()
    .click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Retirar", exact: true })
    .click();
  await expect(
    page.getByText("Cobertura mínima · 3 fotos", { exact: true }),
  ).toBeVisible();
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([]);
  expect(state.consoleErrors).toEqual([]);
});

test("an evaluation can be completed with right lateral, top and rear photographs", async ({
  page,
}) => {
  const state = await fixture(page);
  state.allowConfirm();
  await login(page, "/evaluaciones/1");
  const cards = page.locator(".image-card");

  for (const [position, count] of [
    [1, 1],
    [2, 2],
    [3, 3],
  ] as const) {
    await cards
      .nth(position)
      .locator("input[type=file]")
      .setInputFiles({
        name: `foto-${position}.png`,
        mimeType: "image/png",
        buffer: imageBytes,
      });
    await cards
      .nth(position)
      .getByRole("button", { name: "Subir", exact: true })
      .click();
    await expect(
      page.getByText(
        count === 3 ? "Cobertura mínima · 3 fotos" : `${count} de 3 mínimas`,
        { exact: true },
      ),
    ).toBeVisible();
  }

  const complete = page.getByRole("button", {
    name: "Completar evaluación",
    exact: true,
  });
  await expect(complete).toBeEnabled();
  await complete.click();
  await expect(
    page
      .getByRole("alertdialog")
      .getByText(/cobertura mínima de tres fotografías/i),
  ).toBeVisible();
  await page.getByRole("button", { name: "Completar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Evaluación completada", exact: true }),
  ).toBeVisible();
  expect(
    state.requests.filter((request) => request.path.endsWith("/complete")),
  ).toHaveLength(1);
  expect(state.consoleErrors).toEqual([]);
});

test("failed binary PUT preserves preview and allows a new upload attempt", async ({
  page,
}) => {
  const state = await fixture(page);
  state.failNextPut();
  state.allowConfirm();
  await login(page, "/evaluaciones/1");
  const card = page.locator(".image-card").first();
  await card
    .locator("input[type=file]")
    .setInputFiles({
      name: "foto.png",
      mimeType: "image/png",
      buffer: imageBytes,
    });
  await card.getByRole("button", { name: "Subir", exact: true }).click();
  await expect(
    card.getByRole("button", { name: "Reintentar", exact: true }),
  ).toBeVisible();
  await expect(card.locator("img")).toHaveAttribute("src", /^blob:/);
  await card.getByRole("button", { name: "Reintentar", exact: true }).click();
  await expect(
    page.getByText("1 de 3 mínimas", { exact: true }),
  ).toBeVisible();
  expect(state.uploadCount).toBe(2);
  expect(state.stale).toBe(0);
});

test("collector permissions, mobile layout and expired session", async ({
  page,
}) => {
  const state = await fixture(page, "Collector");
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, "/razas");
  await expect(
    page.getByRole("button", { name: "Registrar raza", exact: true }),
  ).toHaveCount(0);
  await page.goto("/especialistas");
  await expect(
    page.getByRole("button", { name: "Registrar especialista", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Editar", exact: true }),
  ).toHaveCount(0);
  await page.goto("/evaluaciones/1");
  await expect(
    page.getByRole("heading", { name: "Evaluación #1", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Rechazar", exact: true }),
  ).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/evaluation-mobile.png",
    fullPage: true,
  });
  state.expire();
  await page
    .getByRole("button", { name: "Recargar evaluación", exact: true })
    .click();
  await expect(page).toHaveURL(/ingresar/);
  await expect(
    page.getByText(
      "Tu sesión venció o dejó de ser válida. Inicia sesión de nuevo.",
      { exact: true },
    ),
  ).toBeVisible();
});

test("catalog creation, administration, CSV download and unknown route", async ({
  page,
}) => {
  const state = await fixture(page);
  await login(page, "/razas");
  await page
    .getByRole("button", { name: "Registrar raza", exact: true })
    .click();
  await page
    .getByLabel("Nombre de la raza *", { exact: true })
    .fill("Nueva raza");
  await page.getByRole("button", { name: "Guardar raza", exact: true }).click();
  await expect(
    page.getByRole("cell", { name: "Nueva raza", exact: true }),
  ).toBeVisible();
  await page.goto("/especialistas");
  await page
    .getByRole("button", { name: "Registrar especialista", exact: true })
    .click();
  await page.getByLabel("Nombre completo *").fill("Nuevo especialista");
  await page
    .getByRole("button", { name: "Guardar especialista", exact: true })
    .click();
  await expect(
    page.getByRole("cell", { name: "Nuevo especialista", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("row")
    .filter({ hasText: "Nuevo especialista" })
    .getByRole("button", { name: "Editar", exact: true })
    .click();
  await page
    .getByRole("switch", { name: "Especialista activo", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Guardar especialista", exact: true })
    .click();
  await page.getByRole("button", { name: "Desactivar", exact: true }).click();
  await expect(
    page
      .getByRole("row")
      .filter({ hasText: "Nuevo especialista" })
      .getByText("Inactivo", { exact: true }),
  ).toBeVisible();
  await page.goto("/exportacion");
  const allDownload = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Descargar CSV", exact: true })
    .click();
  expect((await allDownload).suggestedFilename()).toBe(
    "bovine-dataset-all.csv",
  );
  expect(
    state.requests
      .filter((request) => request.path === "/dataset/exports/csv")
      .at(-1)
      ?.query.get("captureSet"),
  ).toBe("All");

  const captureSet = page.getByRole("combobox", {
    name: "Cobertura fotográfica",
    exact: true,
  });
  await captureSet.click();
  await page
    .getByRole("option", {
      name: "Solo cobertura mínima (3 fotografías)",
      exact: true,
    })
    .click();
  const threeDownload = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Descargar CSV", exact: true })
    .click();
  expect((await threeDownload).suggestedFilename()).toBe(
    "bovine-dataset-three-images.csv",
  );
  expect(
    state.requests
      .filter((request) => request.path === "/dataset/exports/csv")
      .at(-1)
      ?.query.get("captureSet"),
  ).toBe("ThreeImages");

  await captureSet.click();
  await page
    .getByRole("option", {
      name: "Solo cobertura completa (4 fotografías)",
      exact: true,
    })
    .click();
  const fourDownload = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Descargar CSV", exact: true })
    .click();
  expect((await fourDownload).suggestedFilename()).toBe(
    "bovine-dataset-four-images.csv",
  );
  expect(
    state.requests
      .filter((request) => request.path === "/dataset/exports/csv")
      .at(-1)
      ?.query.get("captureSet"),
  ).toBe("FourImages");
  await page.goto("/no-existe");
  await expect(
    page.getByRole("heading", { name: "Página no encontrada", exact: true }),
  ).toBeVisible();
  expect(state.consoleErrors).toEqual([]);
});

test("shell manifest is installable and worker does not cache API or R2", async ({
  browser,
}) => {
  const context = await browser.newContext({ serviceWorkers: "allow" });
  const page = await context.newPage();
  await page.goto("/ingresar");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  const manifest = await (
    await page.request.get("/manifest.webmanifest")
  ).json();
  expect(manifest.lang).toBe("es");
  expect(manifest.display).toBe("standalone");
  expect(
    manifest.icons.some(
      (icon: { sizes: string; purpose: string }) =>
        icon.sizes === "512x512" && icon.purpose === "maskable",
    ),
  ).toBe(true);
  const cached = await page.evaluate(async () => {
    const urls: string[] = [];
    for (const name of await caches.keys())
      for (const request of await (await caches.open(name)).keys())
        urls.push(request.url);
    return urls;
  });
  expect(cached.length).toBeGreaterThan(5);
  expect(
    cached.every(
      (url) => !url.includes("/api/") && !url.includes("storage.example.test"),
    ),
  ).toBe(true);
  await page.reload();
  await context.setOffline(true);
  await page.reload();
  // Edge's transport emulation on Windows leaves navigator.onLine true.
  // Check the network really is blocked, then supply the browser connectivity event.
  expect(await page.evaluate(async () => {
    try { await fetch('/api/offline-check', { cache: 'no-store' }); return false; }
    catch { return true; }
  })).toBe(true);
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => false });
    window.dispatchEvent(new Event('offline'));
  });
  await expect(
    page.getByRole("heading", { name: "Iniciar sesión", exact: true }),
  ).toBeVisible();
  await expect(page.getByText(/Sin conexión\. Conéctate/)).toBeVisible();
  await context.close();
});
