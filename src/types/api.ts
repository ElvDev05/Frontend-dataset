export type Role = "Administrator" | "Collector";
export type AgeSource = "BirthDate" | "Estimated";
export type BovineSex = "Unspecified" | "Male" | "Female";
export type RegistrableBovineSex = Exclude<BovineSex, "Unspecified">;
export type EvaluationStatus =
  "Draft" | "PendingUpload" | "Complete" | "Rejected";
export type CaptureAngle = "LeftLateral" | "RightLateral" | "TopBack" | "Rear";
export type CaptureSet = "All" | "ThreeImages" | "FourImages";
export type ImageUploadStatus = "PendingUpload" | "Verified";
export interface PageResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
export interface User {
  id: number;
  username: string;
  displayName: string;
  role: Role;
  isActive: boolean;
}
export interface AuthenticatedUser {
  accessToken: string;
  expiresAt: string;
  userId: number;
  displayName: string;
  role: Role;
}
export interface SignIn {
  username: string;
  password: string;
}
export interface Breed {
  id: number;
  name: string;
  isActive: boolean;
}
export interface Specialist {
  id: number;
  fullName: string;
  isActive: boolean;
  version: string;
}
export interface BovineInput {
  identificationCode: string;
  sex: RegistrableBovineSex;
  predominantBreedId: number;
  birthDate: string | null;
  estimatedAgeMonths: number | null;
  ageReferenceDate: string | null;
  notes: string | null;
}
export interface Bovine extends Omit<BovineInput, "sex"> {
  id: number;
  sex: BovineSex;
  notes: string;
  version: string;
}
export interface EvaluationInput {
  evaluationDate: string;
  weightKg: number | null;
  bodyConditionScore: number | null;
  specialistId: number | null;
  notes: string | null;
}
export interface EvaluationImage {
  imageIdentifier: string;
  angle: CaptureAngle;
  uploadStatus: ImageUploadStatus;
  objectKey: string | null;
  contentType: string | null;
  sizeBytes: number | null;
  checksumSha256: string | null;
  verifiedAt: string | null;
}
export interface Evaluation extends EvaluationInput {
  id: number;
  bovineId: number;
  ageMonths: number;
  ageSource: AgeSource;
  notes: string;
  status: EvaluationStatus;
  rejectionReason: string | null;
  completedAt: string | null;
  rejectedAt: string | null;
  version: string;
  images: EvaluationImage[];
}
export interface UploadTicket {
  attemptId: string;
  url: string;
  expiresAt: string;
  headers: Record<string, string>;
}
export interface DownloadTicket {
  url: string;
  expiresAt: string;
}
export interface BovineQuery {
  code?: string;
  breedId?: number;
  sex?: RegistrableBovineSex;
  page?: number;
  pageSize?: number;
}
export interface EvaluationQuery {
  bovineId?: number;
  status?: EvaluationStatus;
  from?: string;
  to?: string;
  specialistId?: number;
  page?: number;
  pageSize?: number;
}
export interface ExportQuery {
  bovineId?: number;
  from?: string;
  to?: string;
  captureSet?: CaptureSet;
}
export interface ApiProblem {
  status?: number;
  title?: string;
  detail?: string;
  code?: string;
  traceId?: string;
  errors?: Record<string, string[]>;
}
