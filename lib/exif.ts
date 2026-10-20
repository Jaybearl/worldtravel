import exifr from "exifr";

export async function readExifDate(file: File): Promise<string | null> {
  try {
    const data = await exifr.parse(file, { pick: ["DateTimeOriginal", "CreateDate"] });
    const d = data?.DateTimeOriginal || data?.CreateDate;
    if (!d) return null;
    const date = new Date(d);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString().slice(0, 10);
  } catch {
    return null;
  }
}
