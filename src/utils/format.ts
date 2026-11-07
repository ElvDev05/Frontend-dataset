import type {
  AgeRange,
  BovineSex,
  CaptureAngle,
  EvaluationStatus,
  RegistrableAgeRange,
  RegistrableBovineSex,
  Role,
} from "../types/api";

export const roleLabels: Record<Role, string> = {
  Administrator: "Administrador",
  Collector: "Recolector",
};
export const statusLabels: Record<EvaluationStatus, string> = {
  Draft: "Borrador",
  PendingUpload: "Carga pendiente",
  Complete: "Completada",
  Rejected: "Rechazada",
};
export const ageRangeLabels: Record<AgeRange, string> = {
  Unspecified: "Sin especificar",
  UnderOneYear: "Menos de 1 año",
  OneToTwoYears: "De 1 a 2 años",
  TwoToFourYears: "De 2 a 4 años",
  FourYearsOrMore: "4 años o más",
};
export const formatAgeRange = (value: AgeRange | null | undefined) =>
  ageRangeLabels[value ?? "Unspecified"];
export const ageRangeOptions: {
  value: RegistrableAgeRange;
  label: string;
}[] = (
  ["UnderOneYear", "OneToTwoYears", "TwoToFourYears", "FourYearsOrMore"] as const
).map((value) => ({ value, label: ageRangeLabels[value] }));
export const sexLabels: Record<BovineSex, string> = {
  Unspecified: "Sin especificar",
  Male: "Macho",
  Female: "Hembra",
};
export const formatSex = (value: BovineSex | null | undefined) =>
  sexLabels[value ?? "Unspecified"];
export const bovineSexOptions: {
  value: RegistrableBovineSex;
  label: string;
}[] = [
  { value: "Male", label: sexLabels.Male },
  { value: "Female", label: sexLabels.Female },
];
export const angles: {
  value: CaptureAngle;
  label: string;
  hint: string;
  icon: string;
}[] = [
  {
    value: "LeftLateral",
    label: "Lateral izquierdo",
    hint: "Costado izquierdo completo del bovino.",
    icon: "pi pi-arrow-left",
  },
  {
    value: "RightLateral",
    label: "Lateral derecho",
    hint: "Costado derecho completo del bovino.",
    icon: "pi pi-arrow-right",
  },
  {
    value: "TopBack",
    label: "Superior del lomo",
    hint: "Vista desde arriba, centrada en el lomo.",
    icon: "pi pi-arrow-down",
  },
  {
    value: "Rear",
    label: "Posterior",
    hint: "Vista desde atrás, centrada en el bovino.",
    icon: "pi pi-arrow-up",
  },
];
export const utcToday = () => new Date().toISOString().slice(0, 10);
export function formatDate(value: string | null | undefined): string {
  if (!value) return "Sin registrar";
  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(value.length === 10 ? `${value}T00:00:00Z` : value));
}
export const formatNumber = (value: number | null | undefined) =>
  value == null
    ? "Sin registrar"
    : new Intl.NumberFormat("es-PE", { maximumFractionDigits: 2 }).format(
        value,
      );
export const editable = (status: EvaluationStatus) =>
  status === "Draft" || status === "PendingUpload";
