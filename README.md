# Registro Bovino · BovineDataset.Web

PWA independiente con Vue 3, Vite, TypeScript, Vue Router, Pinia, Axios, PrimeVue/PrimeIcons y `vite-plugin-pwa`. La interfaz está en español y se adapta a celulares.

Se implementó en `Frontend-Dataset-Bovinos`, el repositorio de trabajo existente y hermano de `Backend app de captura`. Puedes renombrar esta carpeta a `BovineDataset.Web` sin cambiar el código. No se modificó el backend.

## Ejecutar

Requiere Node.js 22.12 o posterior (verificado con Node.js 24).

```bash
npm install
```

Copia `.env.example` a `.env` y ajusta la dirección **sin** `/api/v1`:

```env
VITE_API_BASE_URL=http://localhost:5080
```

```bash
npm run dev
```

Abre `http://localhost:5173`. La API debe estar ejecutándose, conectada a MySQL y con una cuenta existente. La aplicación no incluye credenciales ni registros de demostración.

Después de actualizar el backend, aplica sus migraciones pendientes y reinícialo para cargar el sexo, la regla de tres fotografías y el filtro `captureSet` de exportación. Una instancia anterior puede seguir respondiendo aunque los archivos fuente ya estén actualizados.

## Compilar e instalar

```bash
npm run build
npm run preview
```

`build` comprueba TypeScript y genera `dist/`, el manifest y el service worker. Publica `dist/` con HTTPS y configura el servidor para devolver `index.html` en las rutas de Vue Router. No redirijas `/api` al HTML si compartes dominio con la API. Los valores `VITE_*` se incorporan al compilar; vuelve a compilar si cambia la URL.

La instalación aparece cuando el navegador la admite; también puede hacerse desde su menú. En Safari/iOS utiliza Compartir → Añadir a pantalla de inicio. El service worker se activa en producción, no en `npm run dev`. Solo almacena el shell y los archivos estáticos; los datos privados y las fotografías no se guardan en su caché. Una actualización pide confirmación antes de recargar.

Para trabajar desde otro dispositivo, `localhost` debe sustituirse por una dirección de API accesible desde ese dispositivo. Configura el origen real del frontend en `Cors:AllowedOrigins` del backend y en el CORS del bucket R2 (referencia: `docs/r2-cors.json` del backend). Para probar la instalación desde el celular necesitas HTTPS. API y R2 necesitan CORS independientes. Ninguna credencial de R2 pertenece al frontend.

## Pantallas y estructura

- Inicio y cierre de sesión, perfil básico y rutas protegidas.
- Bovinos: búsqueda por código, sexo y raza, paginación, registro, edición y detalle con historial. El sexo es obligatorio para los registros nuevos y las modificaciones.
- Evaluaciones: filtros, borrador, edición, detalle, finalización, rechazo y reapertura según rol y estado.
- Fotografías: cobertura mínima de un lateral, lomo y posterior; segundo lateral opcional para cobertura completa, con validación, previsualización, cargas independientes, reintentos, retiro y cambio a una vista libre.
- Razas: listado y creación administrativa. Especialistas: listado, creación y edición administrativa.
- Exportación CSV con sexo del bovino, filtros por fechas, número de bovino y cobertura fotográfica: tres imágenes, cuatro imágenes o ambas.

```text
src/
  assets/        Estilos
  components/    Selectores, tablas, imágenes y componentes compartidos
  layouts/       Navegación responsive
  router/        Rutas protegidas
  services/      Axios y operaciones por recurso
  stores/        Sesión de autenticación
  types/         Contratos REST y enums
  utils/         Fechas, errores, traducciones y cola de mutaciones
  views/         Pantallas y formularios con estado local
public/icons/    Iconos instalables
tests/          Pruebas de concurrencia y navegador
```

La sesión conserva solo el JWT y su vencimiento en `sessionStorage` para sobrevivir a recargas de la pestaña. Consulta `/users/me` al restaurarla; expira con el token y se borra ante `401` o al salir. No hay renovación de token porque la API no la implementa. Los permisos visibles proceden del rol devuelto por la API, que sigue autorizando cada petición.

Los errores `ProblemDetails` y `ValidationProblemDetails` se presentan en español. Un `409` no sobrescribe cambios automáticamente: ofrece recargar y volver a revisar. Los estados de formulario permanecen locales.

## Verificación

```bash
npm test
npm run build
npm run test:e2e
```

Las pruebas de navegador usan Microsoft Edge instalado y el build de producción en el puerto 4173 para no interferir con el servidor de desarrollo. Puedes cambiar `channel` en `playwright.config.ts` si utilizas otro navegador. Cubren autenticación, contratos de formularios, permisos, paginación, cargas y reintentos, concurrencia, CSV, diseño móvil y caché del shell. Las respuestas controladas existen exclusivamente en `tests/e2e`; las pruebas no escriben en el backend real.

Resultado de entrega (2026-09-10): compilación de producción correcta, 10 pruebas unitarias y 9 pruebas de navegador aprobadas. La revisión de `src/`, `public/` y `.env.example` no detectó secretos ni uso de `any`.

Se verificaron además `/health/live` (200), `/api/v1/bovines` sin JWT (401), CORS para `http://localhost:5173` y las rutas de OpenAPI del backend local. La carga real en R2 requiere una cuenta de la API y un bucket operativo: no se ejecutó una captura autenticada contra esos servicios durante esta entrega.

Los contratos y las limitaciones están detallados en [docs/backend-contracts.md](docs/backend-contracts.md). Configuración técnica consultada: [PrimeVue con Vite](https://primevue.org/vite/) y [service workers en Vite PWA](https://vite-pwa-org.netlify.app/guide/service-worker-strategies-and-behaviors).
