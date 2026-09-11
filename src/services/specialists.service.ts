import { http } from "./http";
import type { Specialist } from "../types/api";
export const specialistsService = {
  list: async () => (await http.get<Specialist[]>("/specialists")).data,
  create: async (fullName: string) =>
    (await http.post<Specialist>("/specialists", { fullName })).data,
  update: async (
    id: number,
    body: Pick<Specialist, "version" | "fullName" | "isActive">,
  ) => (await http.put<Specialist>(`/specialists/${id}`, body)).data,
};
