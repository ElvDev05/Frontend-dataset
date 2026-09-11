import { http } from "./http";
import type {
  Bovine,
  BovineInput,
  BovineQuery,
  PageResult,
} from "../types/api";
export const bovinesService = {
  list: async (params: BovineQuery = {}) =>
    (await http.get<PageResult<Bovine>>("/bovines", { params })).data,
  get: async (id: number) => (await http.get<Bovine>(`/bovines/${id}`)).data,
  create: async (body: BovineInput) =>
    (await http.post<Bovine>("/bovines", body)).data,
  update: async (id: number, body: BovineInput & { version: string }) =>
    (await http.put<Bovine>(`/bovines/${id}`, body)).data,
};
