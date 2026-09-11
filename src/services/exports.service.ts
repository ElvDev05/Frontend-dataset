import { http } from "./http";
import type { CaptureSet, ExportQuery } from "../types/api";

const fallbackFileNames: Record<CaptureSet, string> = {
  All: "bovine-dataset-all.csv",
  ThreeImages: "bovine-dataset-three-images.csv",
  FourImages: "bovine-dataset-four-images.csv",
};

function downloadFileName(
  contentDisposition: string | undefined,
  captureSet: CaptureSet,
) {
  const match = contentDisposition?.match(/filename="?([^";]+)"?/i);
  const serverName = match?.[1]?.trim();
  return serverName?.replace(/[\\/:*?"<>|]/g, "") || fallbackFileNames[captureSet];
}

export async function downloadDataset(params: ExportQuery = {}) {
  const captureSet = params.captureSet ?? "All";
  const response = await http.get<Blob>("/dataset/exports/csv", {
    params: { ...params, captureSet },
    responseType: "blob",
    headers: { Accept: "text/csv" },
  });
  const csvHeader = await response.data.slice(0, 2048).text();
  const columns = csvHeader.split(/\r?\n/, 1)[0]?.split(",") ?? [];
  if (
    !columns.includes("capture_set") ||
    !columns.includes("capture_image_count") ||
    !columns.includes("bovine_sex")
  )
    throw new Error(
      "La API en ejecución todavía no admite la exportación por cobertura fotográfica y sexo. Reinicia el backend actualizado e inténtalo de nuevo.",
    );
  const url = URL.createObjectURL(response.data);
  const link = document.createElement("a");
  link.href = url;
  link.download = downloadFileName(
    response.headers["content-disposition"],
    captureSet,
  );
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
