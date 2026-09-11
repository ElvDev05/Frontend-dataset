import axios from "axios";
import { http } from "./http";
import type {
  CaptureAngle,
  DownloadTicket,
  Evaluation,
  UploadTicket,
} from "../types/api";
const path = (evaluationId: number, imageIdentifier?: string) =>
  `/evaluations/${evaluationId}/images${imageIdentifier ? `/${imageIdentifier}` : ""}`;
// Independent Axios instance: no API interceptors, JWT, cookies or API cache headers.
const storageHttp = axios.create({ timeout: 300_000, withCredentials: false });
export const imagesService = {
  register: async (id: number, version: string, angle: CaptureAngle) =>
    (await http.post<Evaluation>(path(id), { version, angle })).data,
  changeAngle: async (
    id: number,
    image: string,
    version: string,
    angle: CaptureAngle,
  ) => (await http.put<Evaluation>(path(id, image), { version, angle })).data,
  remove: async (id: number, image: string, version: string) =>
    (await http.delete<Evaluation>(path(id, image), { params: { version } }))
      .data,
  requestUpload: async (id: number, image: string, file: File) =>
    (
      await http.post<UploadTicket>(`${path(id, image)}/upload-url`, {
        contentType: file.type,
        sizeBytes: file.size,
      })
    ).data,
  upload: async (
    ticket: UploadTicket,
    file: File,
    progress: (percent: number) => void,
    signal?: AbortSignal,
  ) => {
    const contentType = Object.entries(ticket.headers).find(
      ([key]) => key.toLowerCase() === "content-type",
    )?.[1];
    if (contentType !== file.type)
      throw new Error(
        "El formato autorizado no coincide con la fotografía seleccionada.",
      );
    await storageHttp.put(ticket.url, file, {
      headers: { "Content-Type": contentType },
      signal,
      onUploadProgress: (event) =>
        progress(
          Math.min(
            100,
            Math.round((event.loaded * 100) / (event.total || file.size)),
          ),
        ),
    });
  },
  confirm: async (id: number, image: string, attemptId: string) =>
    (
      await http.post<Evaluation>(`${path(id, image)}/confirm-upload`, {
        attemptId,
      })
    ).data,
  download: async (id: number, image: string) =>
    (await http.post<DownloadTicket>(`${path(id, image)}/download-url`)).data,
};
