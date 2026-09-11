import { http } from "./http";
import type { AuthenticatedUser, SignIn, User } from "../types/api";
export const authenticationService = {
  signIn: async (body: SignIn) =>
    (await http.post<AuthenticatedUser>("/authentication/sign-in", body)).data,
  me: async () => (await http.get<User>("/users/me")).data,
};
