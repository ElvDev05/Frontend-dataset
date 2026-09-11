# Contratos comprobados de BovineDataset.API

Fuente de verdad inspeccionada: `../Backend app de captura/BovineDataset.API`, controladores, recursos, assemblers, servicios de comandos y consultas, agregados, enums, repositorios EF, configuración HTTP/JWT, manejador de excepciones y almacenamiento R2. Se contrastó con sus pruebas. Fecha: 2026-09-10 (hora de Lima). El repositorio del backend aún no tenía un commit para referenciar.

Todos los endpoints funcionales usan `/api/v1`. JSON usa camelCase, enums de texto (no números), fechas `DateOnly` como `YYYY-MM-DD` y versiones UUID. No hay cabeceras ETag ni `If-Match`: `version` se envía en el cuerpo o query correspondiente.

## Endpoints y permisos

| Método y ruta (sin prefijo) | Contrato de solicitud | Acceso |
| --- | --- | --- |
| POST `/authentication/sign-in` | `{ username, password }` | Anónimo |
| GET `/users/me` | — | Autenticado |
| GET `/breeds` | — | Autenticado |
| POST `/breeds` | `{ name }` | Administrator |
| GET `/specialists` | — | Autenticado |
| POST `/specialists` | `{ fullName }` | Autenticado |
| PUT `/specialists/{id}` | `{ version, fullName, isActive }` | Administrator |
| GET `/bovines` | Query: `code`, `breedId`, `sex` (`Male`, `Female`), `page`, `pageSize` | Autenticado |
| POST `/bovines` | `BovineInput` | Autenticado |
| GET `/bovines/{id}` | — | Autenticado |
| PUT `/bovines/{id}` | `BovineInput` + `version` | Autenticado |
| GET `/bovines/{id}/evaluations` | Query: `page`, `pageSize` | Autenticado |
| POST `/bovines/{id}/evaluations` | `EvaluationInput` | Autenticado |
| GET `/evaluations` | Query: `bovineId`, `status`, `from`, `to`, `specialistId`, `page`, `pageSize` | Autenticado |
| GET `/evaluations/{id}` | — | Autenticado |
| PUT `/evaluations/{id}` | `EvaluationInput` + `version` | Autenticado |
| POST `/evaluations/{id}/complete` | `{ version }` | Autenticado |
| POST `/evaluations/{id}/reject` | `{ version, reason }` | Administrator |
| POST `/evaluations/{id}/reopen` | `{ version }` | Administrator |
| POST `/evaluations/{id}/images` | `{ version, angle }` | Autenticado |
| PUT `/evaluations/{id}/images/{imageIdentifier}` | `{ version, angle }` | Autenticado |
| DELETE `/evaluations/{id}/images/{imageIdentifier}` | Query: `version` | Autenticado |
| POST `…/images/{imageIdentifier}/upload-url` | `{ contentType, sizeBytes }` | Autenticado |
| POST `…/images/{imageIdentifier}/confirm-upload` | `{ attemptId }` | Autenticado |
| POST `…/images/{imageIdentifier}/download-url` | Sin cuerpo | Autenticado |
| GET `/dataset/exports/csv` | Query: `from`, `to`, `bovineId`, `captureSet` (`All`, `ThreeImages`, `FourImages`) | Autenticado |

La API también dispone de POST `/users` para administradores (`username`, `password`, `displayName`, `role`); no se agregó gestión de cuentas al alcance solicitado. No hay listado general ni edición de usuarios. Los roles exactos son `Administrator` y `Collector`.

## Recursos

Los tipos completos se mantienen en `src/types/api.ts`.

- Login devuelve `{ accessToken, expiresAt, userId, displayName, role }`. `/users/me` devuelve `{ id, username, displayName, role, isActive }`.
- Raza: `{ id, name, isActive }`. Especialista: `{ id, fullName, isActive, version }`.
- `BovineInput`: `{ identificationCode, sex, predominantBreedId, birthDate, estimatedAgeMonths, ageReferenceDate, notes }`. Para crear o editar, `sex` es obligatorio y admite `Male` o `Female`. La respuesta agrega `id`, `version`; los registros migrados pueden devolver temporalmente `Unspecified` hasta que se corrijan y `notes` es texto no nulo.
- `EvaluationInput`: `{ evaluationDate, weightKg, bodyConditionScore, specialistId, notes }`. Respuesta agrega `id`, `bovineId`, `ageMonths`, `ageSource`, `status`, `rejectionReason`, `completedAt`, `rejectedAt`, `version`, `images`.
- Imagen: `{ imageIdentifier, angle, uploadStatus, objectKey, contentType, sizeBytes, checksumSha256, verifiedAt }`. `imageIdentifier` lo genera el servidor. **No existen `imageId` ni `assetIdentifier` en este contrato.**
- Ticket de carga: `{ attemptId, url, expiresAt, headers }`. Ticket de descarga: `{ url, expiresAt }`.
- Las listas paginadas devuelven `{ items, total, page, pageSize }`. Página desde 1 hasta 1 000 000, tamaño de 1 a 100, predeterminado 25. Razas y especialistas devuelven arrays sin paginación ni búsqueda de servidor.

## Validaciones y estados

- Código de bovino: requerido, máximo 80 caracteres; el servidor recorta y convierte a mayúsculas, y verifica unicidad. Sexo `Male` o `Female` y raza activa obligatorios.
- Exclusivamente una opción: fecha de nacimiento no futura; o edad estimada de 0–600 meses junto con fecha de referencia no futura. La alternativa no usada se envía como `null`.
- Fecha de evaluación no futura, ni anterior al nacimiento o a la referencia. La edad la calcula la API y su origen es `BirthDate` o `Estimated`. Editar el bovino no recalcula retroactivamente las edades registradas.
- Peso nullable: mayor que cero, máximo 99 999,99 kg, hasta dos decimales. Condición corporal nullable: 1–5 en incrementos de 0,25. Especialista nullable, activo si se asigna. Notas: hasta 4000 caracteres.
- Nombre de raza: 120 caracteres. Nombre de especialista: 160. Motivo de rechazo: requerido, 1000 caracteres.
- Estados exactos: `Draft`, `PendingUpload`, `Complete`, `Rejected`. `PendingUpload` significa que existe al menos una imagen pendiente, no necesariamente una transferencia activa. Todas verificadas devuelve `Draft` hasta completar explícitamente.
- Solo `Draft` y `PendingUpload` son editables. Completar exige peso, condición, especialista activo y tres o cuatro imágenes verificadas. Las vistas obligatorias son `TopBack`, `Rear` y al menos una entre `LeftLateral` o `RightLateral`; el otro lateral es opcional. Si existe una cuarta imagen registrada, también debe estar verificada. Rechazar es administrativo; reabrir solo se permite desde `Rejected`. El backend conserva el último motivo de rechazo al reabrir.

## Flujo de fotografías y concurrencia

Ángulos exactos: `LeftLateral`, `RightLateral`, `TopBack`, `Rear`. Estados de imagen: `PendingUpload`, `Verified`.

1. Seleccionar y validar JPEG/PNG, 1 byte–15 × 1024 × 1024 bytes, hasta 40 000 000 píxeles, sin animación. La verificación autoritativa de formato, tamaño, integridad y checksum ocurre en el servidor.
2. Registrar la vista con `version`. Conservar el `imageIdentifier` de la evaluación devuelta.
3. Pedir el ticket de carga: firma válida por 10 minutos, `headers['Content-Type']` exacto. **Este endpoint cambia la versión de la evaluación, pero su respuesta no la incluye.** El frontend hace GET del detalle antes de la siguiente mutación versionada.
4. PUT del archivo binario directamente a la URL, con una instancia Axios independiente sin JWT ni cookies. No usar multipart.
5. Confirmar usando únicamente `attemptId`; devuelve la evaluación con versión y estado actualizados. Una confirmación ya exitosa es idempotente. Si falla después de un PUT exitoso, reintentar confirma el mismo intento sin volver a subir bytes. Si falla el PUT, reintentar pide un ticket nuevo.
6. Descargar la previsualización con una URL temporal de 5 minutos, renovada mientras se mantiene visible el componente. Los tickets viven solo en memoria de la vista; nunca en Pinia, localStorage ni sessionStorage.

Una cola por evaluación serializa **solo las mutaciones de metadatos** (registrar, pedir ticket, confirmar, retirar, cambiar vista). Las transferencias PUT pueden coexistir y una falla no cancela las otras. La API limita las verificaciones a dos concurrentes globales; un `429` permite reintentar manualmente. Hay hasta 60 tickets/minuto por usuario y 20 intentos/hora por imagen. Los intentos pueden confirmarse durante 24 horas; después es necesario seleccionar de nuevo y solicitar otra carga.

Para reemplazar un archivo verificado hay que retirarlo primero. La UI confirma esa acción. El cambio de ángulo permite únicamente una vista libre porque la API exige unicidad. Un `409` recupera la versión actual para las otras operaciones, muestra el conflicto y no repite escrituras de forma ciega.

## Errores, exportación y límites

`ProblemDetails`: `status`, `title`, `detail`, `code`, `traceId`; la validación de modelo añade `errors` por campo. El frontend contempla 400, 401, 403, 404, 409, 429, 5xx y ausencia de respuesta de red, incluidos errores JSON recibidos como Blob al descargar CSV. Las traducciones de los mensajes conocidos están centralizadas.

CSV: solo evaluaciones `Complete` e imágenes verificadas; una fila por fotografía, sin URLs temporales. `captureSet=ThreeImages` incluye evaluaciones de tres imágenes, `FourImages` las de cuatro y `All` combina ambas. Las columnas `capture_set`, `capture_image_count` y `bovine_sex` identifican la cobertura y el sexo del bovino. El servidor entrega `text/csv; charset=utf-8`, `Cache-Control: no-store` y los nombres `bovine-dataset-three-images.csv`, `bovine-dataset-four-images.csv` o `bovine-dataset-all.csv` según el filtro.

No hay endpoints de edición/eliminación de razas, borrado de bovinos o evaluaciones, recuperación de contraseña, refresh token, sincronización offline ni agregados de estadísticas. Por eso no se añadieron esas funciones. Razas y especialistas no tienen endpoint de detalle individual. R2 sin configurar devuelve `503 storage_unconfigured`; la UI comunica el impedimento sin afectar los demás módulos. La integración real requiere JWT válido, MySQL, configuración R2 y CORS de ambos servicios.
