import { http } from "./http";
import type {
  Evaluation,
  EvaluationInput,
  EvaluationQuery,
  PageResult,
} from "../types/api";
export const evaluationsService = {
  list: async (params: EvaluationQuery = {}) =>
    (await http.get<PageResult<Evaluation>>("/evaluations", { params })).data,
  history: async (bovineId: number, page = 1, pageSize = 25) =>
    (
      await http.get<PageResult<Evaluation>>(
        `/bovines/${bovineId}/evaluations`,
        { params: { page, pageSize } },
      )
    ).data,
  get: async (id: number) =>
    (await http.get<Evaluation>(`/evaluations/${id}`)).data,
  create: async (id: number, body: EvaluationInput) =>
    (await http.post<Evaluation>(`/bovines/${id}/evaluations`, body)).data,
  update: async (id: number, body: EvaluationInput & { version: string }) =>
    (await http.put<Evaluation>(`/evaluations/${id}`, body)).data,
  remove: async (id: number, version: string) => {
    await http.delete(`/evaluations/${id}`, { params: { version } });
  },
  complete: async (id: number, version: string) =>
    (await http.post<Evaluation>(`/evaluations/${id}/complete`, { version }))
      .data,
  reject: async (id: number, version: string, reason: string) =>
    (
      await http.post<Evaluation>(`/evaluations/${id}/reject`, {
        version,
        reason,
      })
    ).data,
  reopen: async (id: number, version: string) =>
    (await http.post<Evaluation>(`/evaluations/${id}/reopen`, { version }))
      .data,
};
