import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase/firebase.utils";

export const validUploadedAvatar = (value) => typeof value === "string"
  && value.length <= 100000 && /^data:image\/(?:jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value);

export const loadUploadedAvatar = async (uid) => {
  if (auth?.currentUser?.uid !== uid) return "";
  const snapshot = await getDoc(doc(db, "users", uid));
  const value = snapshot.data()?.uploadedAvatar;
  return auth.currentUser?.uid === uid && validUploadedAvatar(value) ? value : "";
};

export const saveUploadedAvatar = async (uid, value) => {
  if (auth?.currentUser?.uid !== uid) throw new Error("Sign in to update your photo");
  if (value !== null && !validUploadedAvatar(value)) throw new Error("Invalid profile photo");
  await setDoc(doc(db, "users", uid), { uploadedAvatar: value ?? "" }, { merge: true });
};

export const prepareAvatarFile = async (file) => {
  if (!file || !["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) {
    throw new Error("Choose a JPG, PNG or WebP image up to 5 MB.");
  }
  const image = await createImageBitmap(file);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const context = canvas.getContext("2d");
    context.fillStyle = "#f6f3eb";
    context.fillRect(0, 0, 256, 256);
    const side = Math.min(image.width, image.height);
    context.drawImage(image, (image.width - side) / 2, (image.height - side) / 2, side, side, 0, 0, 256, 256);
    const value = canvas.toDataURL("image/jpeg", 0.8);
    if (!validUploadedAvatar(value)) throw new Error("This photo is too complex. Choose a smaller image.");
    return value;
  } finally {
    image.close();
  }
};
