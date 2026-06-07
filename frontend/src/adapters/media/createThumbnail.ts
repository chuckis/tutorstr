export async function createThumbnail(
  file: File,
  maxDimension = 256
): Promise<File | null> {
  if (!file.type.startsWith("image/")) return null;

  try {
    const img = await loadImage(file);
    let { width, height } = img;

    if (width <= maxDimension && height <= maxDimension) return null;

    if (width > height) {
      height = Math.round((height / width) * maxDimension);
      width = maxDimension;
    } else {
      width = Math.round((width / height) * maxDimension);
      height = maxDimension;
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(img, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, file.type)
    );
    if (!blob) return null;

    const dotIdx = file.name.lastIndexOf(".");
    const baseName = dotIdx > 0 ? file.name.slice(0, dotIdx) : file.name;
    const ext = dotIdx > 0 ? file.name.slice(dotIdx) : "";

    return new File([blob], `${baseName}_thumb${ext}`, { type: file.type });
  } catch {
    return null;
  }
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };
    img.src = url;
  });
}
