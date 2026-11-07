import { http } from "./http";
import type { Breed } from "../types/api";
export const breedsService = {
  list: async () => (await http.get<Breed[]>("/breeds")).data,
  create: async (name: string) =>
    (await http.post<Breed>("/breeds", { name })).data,
  remove: async (id: number, version: string) => {
    await http.delete(`/breeds/${id}`, { params: { version } });
  },
};
