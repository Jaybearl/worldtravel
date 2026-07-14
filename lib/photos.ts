import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { deleteObject, ref } from "firebase/storage";
import { db, storage } from "@/lib/firebase";

export type Photo = {
  id: string;
  imageUrl: string;
  storagePath: string;
  countryCode: string; // ISO alpha-3
  countryNameKo: string;
  countryNameEn: string;
  city: string;
  lat: number | null;
  lng: number | null;
  caption: string;
  takenAt: string; // ISO date string (yyyy-mm-dd)
  contentHash: string | null; // SHA-256 of the original file, for duplicate detection
};

export async function hashFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

const PHOTOS_COLLECTION = "photos";

export async function getAllPhotos(): Promise<Photo[]> {
  const snapshot = await getDocs(
    query(collection(db, PHOTOS_COLLECTION), orderBy("takenAt", "desc"))
  );
  return snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Photo, "id">) }));
}

export async function addPhoto(data: Omit<Photo, "id">) {
  await addDoc(collection(db, PHOTOS_COLLECTION), {
    ...data,
    createdAt: serverTimestamp(),
  });
}

export async function updatePhoto(id: string, data: Partial<Omit<Photo, "id">>) {
  await updateDoc(doc(db, PHOTOS_COLLECTION, id), data);
}

export async function deletePhoto(photo: Pick<Photo, "id" | "storagePath">) {
  await deleteDoc(doc(db, PHOTOS_COLLECTION, photo.id));
  await deleteObject(ref(storage, photo.storagePath));
}
