import axios from "axios";
import type { ApiProblem } from "../types/api";

const messages: Record<string, string> = {
  "Invalid username or password.":
    "El usuario o la contraseña no son correctos.",
  "Bovine was modified. Reload before editing.":
    "Otro usuario modificó el bovino. Recarga el registro antes de guardar.",
  "Bovine was modified. Reload before deleting.":
    "Otro usuario modificó el bovino. Recarga su ficha antes de eliminarlo.",
  "Evaluation was modified. Reload before editing.":
    "La evaluación cambió. Recarga sus datos antes de continuar.",
  "Specialist was modified.":
    "El especialista cambió. Recarga la lista antes de editar.",
  "The record changed. Reload and retry.":
    "El registro cambió. Recarga los datos e inténtalo de nuevo.",
  "Identification code already exists.":
    "Ya existe un bovino con ese código de identificación.",
  "Username already exists.": "Ese nombre de usuario ya está registrado.",
  "Breed is inactive.": "La raza seleccionada está inactiva.",
  "Specialist is inactive.":
    "El especialista está inactivo. Selecciona uno activo.",
  "A predominant breed is required.": "Selecciona una raza predominante.",
  "Predominant breed must be a positive identifier when provided.":
    "La raza seleccionada no es válida. Elige otra o déjala vacía.",
  "Select a valid age range.": "Selecciona el rango de edad del bovino.",
  "Bovine sex must be Male or Female.":
    "Selecciona el sexo del bovino: macho o hembra.",
  "Bovine sex filter must be Male or Female.":
    "El filtro de sexo debe ser macho o hembra.",
  "Provide a non-future birth date OR estimated age (0-600 months) and its non-future reference date.":
    "Indica la fecha de nacimiento o una edad estimada entre 0 y 600 meses con fecha de referencia. Las fechas no pueden ser futuras.",
  "Evaluation cannot precede birth.":
    "La evaluación no puede ser anterior al nacimiento.",
  "Evaluation cannot precede the estimated age reference date.":
    "La evaluación no puede ser anterior a la fecha de referencia de la edad.",
  "Evaluation date cannot be in the future.":
    "La fecha de evaluación no puede estar en el futuro.",
  "Weight must be positive, at most 99999.99 kg, with up to two decimal places.":
    "El peso debe ser mayor que cero, hasta 99 999,99 kg, con un máximo de dos decimales.",
  "Body condition score must be between 1 and 5 in increments of 0.25.":
    "La condición corporal debe estar entre 1 y 5, en incrementos de 0,25.",
  "Notes must not exceed 4000 characters.":
    "Las notas no pueden superar los 4000 caracteres.",
  "This evaluation is locked. Reject and reopen it before editing.":
    "La evaluación está bloqueada. Un administrador debe rechazarla y reabrirla para permitir cambios.",
  "Exactly one image per angle is allowed, with four images per evaluation.":
    "Solo se permite una fotografía por vista y cuatro por evaluación.",
  "Exactly one rear image and one lateral image are allowed per evaluation.":
    "Cada evaluación admite una sola fotografía posterior y una lateral.",
  "Only rear and lateral images are allowed.":
    "Solo se admiten las vistas posterior y lateral.",
  "Body condition score and specialist are required to complete an evaluation.":
    "Registra la condición corporal y un especialista antes de completar.",
  "Exactly two verified images are required: rear and one lateral side.":
    "Se necesitan exactamente dos fotografías verificadas: la posterior y un lateral.",
  "This angle already exists.": "Ya existe una fotografía en esa vista.",
  "Weight, body condition score and specialist are required to complete an evaluation.":
    "Registra el peso, la condición corporal y un especialista antes de completar.",
  "All four capture angles must have verified images.":
    "Las cuatro vistas deben tener fotografías verificadas antes de completar.",
  "At least three verified images are required: top back, rear and one lateral side. A fourth image may contain the other lateral side.":
    "Se necesitan al menos tres fotografías verificadas: superior del lomo, posterior y uno de los dos laterales. El otro lateral es opcional.",
  "Only rejected evaluations can be reopened.":
    "Solo se pueden reabrir evaluaciones rechazadas.",
  "Remove the image before replacing its verified file.":
    "Retira la fotografía cargada antes de reemplazarla.",
  "Only JPEG and PNG images are supported.":
    "Selecciona una fotografía JPEG o PNG.",
  "Images must be between 1 byte and 15 MB.":
    "La fotografía debe pesar entre 1 byte y 15 MiB.",
  "Too many upload attempts for this image. Retry later.":
    "Se alcanzó el límite de intentos para esta fotografía. Inténtalo más tarde.",
  "Upload attempt does not belong to this image.":
    "El intento de carga no corresponde a esta fotografía.",
  "Another upload already verified this image.":
    "La fotografía ya se verificó en otra carga. Recarga los datos.",
  "Upload attempt is too old. Request a new upload URL.":
    "El intento de carga venció. Vuelve a seleccionar la fotografía y súbela de nuevo.",
  "Uploaded file size does not match the declared size.":
    "El tamaño del archivo subido no coincide con el seleccionado.",
  "Uploaded file exceeds the allowed size.":
    "El archivo supera el tamaño permitido.",
  "Upload is incomplete.":
    "La carga está incompleta. Vuelve a subir la fotografía.",
  "File is not a supported image.": "El archivo no es una imagen compatible.",
  "Image dimensions exceed the 40 megapixel limit.":
    "La imagen supera el límite de 40 megapíxeles.",
  "File content does not match its declared image format.":
    "El contenido no corresponde al formato JPEG o PNG indicado.",
  "Animated images are not supported.": "No se admiten imágenes animadas.",
  "Image content is corrupt or incomplete.":
    "La fotografía está dañada o incompleta. Selecciona otro archivo.",
  "The uploaded object was not found. Upload it before confirming.":
    "No se encontró el archivo subido. Vuelve a seleccionar la fotografía para subirla de nuevo.",
  "Image has not been verified.": "La fotografía todavía no está verificada.",
  "From date must not exceed to date.":
    "La fecha inicial no puede ser posterior a la fecha final.",
};
const codes: Record<string, string> = {
  invalid_credentials: "El usuario o la contraseña no son correctos.",
  concurrency_conflict:
    "El registro cambió. Recarga los datos antes de continuar.",
  duplicate: "Ya existe un registro con ese valor. Revisa los datos.",
  reference_conflict:
    "Un registro relacionado cambió o sigue en uso. Recarga los datos.",
  storage_unavailable:
    "El servicio de fotografías no está disponible temporalmente. Reintenta más tarde.",
  storage_unconfigured:
    "El almacenamiento de fotografías aún no está configurado en el servidor.",
  database_unavailable:
    "La base de datos no está disponible. Inténtalo más tarde.",
  operation_timeout:
    "La operación tardó demasiado. Comprueba el resultado antes de reintentar.",
  internal_error:
    "El servidor no pudo procesar la solicitud. Inténtalo más tarde.",
  not_found: "No se encontró el registro solicitado.",
};
const fieldLabels: Record<string, string> = {
  IdentificationCode: "Código de identificación",
  PredominantBreedId: "Raza predominante",
  Sex: "Sexo",
  AgeRange: "Rango de edad",
  EvaluationDate: "Fecha de evaluación",
  WeightKg: "Peso",
  BodyConditionScore: "Condición corporal",
  SpecialistId: "Especialista",
  Notes: "Notas",
  Name: "Nombre de raza",
  FullName: "Nombre del especialista",
  Username: "Usuario",
  Password: "Contraseña",
  Reason: "Motivo",
  Version: "Versión del registro",
  Angle: "Vista fotográfica",
  ContentType: "Formato de imagen",
  SizeBytes: "Tamaño del archivo",
};
function translate(message: string): string | undefined {
  if (messages[message]) return messages[message];
  const required = message.match(
    /^(.+) is required and must not exceed (\d+) characters\.$/,
  );
  if (required)
    return `Completa el campo requerido con un máximo de ${required[2]} caracteres.`;
  return undefined;
}
export function isConflict(error: unknown) {
  return axios.isAxiosError(error) && error.response?.status === 409;
}
export function isReferenceConflict(error: unknown) {
  return axios.isAxiosError<ApiProblem>(error) && error.response?.status === 409 && error.response.data?.code === "reference_conflict";
}
export async function errorMessage(error: unknown): Promise<string> {
  if (!axios.isAxiosError<ApiProblem>(error))
    return error instanceof Error
      ? error.message
      : "No se pudo completar la operación.";
  if (!error.response)
    return "No se pudo conectar con el servicio. Revisa tu conexión e inténtalo de nuevo.";
  let problem = error.response.data;
  if (problem instanceof Blob) {
    try {
      problem = JSON.parse(await problem.text()) as ApiProblem;
    } catch {
      problem = {};
    }
  }
  if (!problem || typeof problem !== "object") problem = {};
  if (problem.detail && translate(problem.detail))
    return translate(problem.detail)!;
  if (problem.code && codes[problem.code]) return codes[problem.code]!;
  if (problem.errors) {
    return Object.entries(problem.errors)
      .map(([field, details]) => {
        const clean = field.replace(/^\$\./, "");
        const key = clean.charAt(0).toUpperCase() + clean.slice(1);
        return `${fieldLabels[key] || "Datos de la solicitud"}: ${details.map((d) => translate(d) || "revisa el valor; es obligatorio y debe tener el formato indicado.").join(" ")}`;
      })
      .join(" ");
  }
  const statusMessages: Record<number, string> = {
    400: "Revisa los campos y las condiciones indicadas antes de continuar.",
    401: "Tu sesión venció o dejó de ser válida. Inicia sesión de nuevo.",
    403: "Tu cuenta no tiene permiso para realizar esta acción.",
    404: "No se encontró el registro solicitado.",
    409: "El registro cambió o la operación entra en conflicto con sus datos. Recarga antes de continuar.",
    429: "Hay demasiadas solicitudes en curso. Espera un momento y vuelve a intentarlo.",
  };
  return (
    statusMessages[error.response.status] ||
    "El servicio no está disponible temporalmente. Inténtalo más tarde."
  );
}
