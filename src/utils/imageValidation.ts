export const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
export const MAX_IMAGE_PIXELS = 40_000_000;
export async function validateImage(file: File): Promise<void> {
  if (!["image/jpeg", "image/png"].includes(file.type))
    throw new Error(
      "Selecciona una fotografía JPEG o PNG. No se admiten HEIC ni otros formatos.",
    );
  if (file.size < 1 || file.size > MAX_IMAGE_BYTES)
    throw new Error("La fotografía debe pesar entre 1 byte y 15 MiB.");
  // Validate PNG signature/chunks to reject animated PNG before upload; server remains authoritative.
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (file.type === "image/png") {
    if (
      ![137, 80, 78, 71, 13, 10, 26, 10].every((byte, i) => bytes[i] === byte)
    )
      throw new Error(
        "El contenido del archivo no corresponde a una imagen PNG.",
      );
    const view = new DataView(bytes.buffer);
    for (let offset = 8; offset + 12 <= bytes.length;) {
      const size = view.getUint32(offset);
      const type = String.fromCharCode(
        ...bytes.subarray(offset + 4, offset + 8),
      );
      if (type === "acTL") throw new Error("No se admiten imágenes animadas.");
      if (
        type === "IHDR" &&
        size >= 8 &&
        offset + 16 <= bytes.length &&
        view.getUint32(offset + 8) * view.getUint32(offset + 12) >
          MAX_IMAGE_PIXELS
      )
        throw new Error("La imagen supera el límite de 40 megapíxeles.");
      offset += size + 12;
    }
  } else if (bytes[0] !== 255 || bytes[1] !== 216 || bytes[2] !== 255)
    throw new Error(
      "El contenido del archivo no corresponde a una imagen JPEG.",
    );
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode().catch(() => {
      throw new Error(
        "La fotografía está dañada o no puede abrirse. Selecciona otro archivo.",
      );
    });
    if (
      !image.naturalWidth ||
      !image.naturalHeight ||
      image.naturalWidth * image.naturalHeight > MAX_IMAGE_PIXELS
    )
      throw new Error("La imagen supera el límite de 40 megapíxeles.");
  } finally {
    URL.revokeObjectURL(url);
  }
}
