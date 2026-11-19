import { createContext, useState, useEffect } from "react";

import {
  createUserDocumentFromAuth,
  getStoredDisplayName,
  onAuthStateChangedListener,
  updateUserProfile,
} from "../utils/firebase/firebase.utils";
import { loadUploadedAvatar, saveUploadedAvatar } from "../utils/profile/profile.utils";

export const UserContext = createContext({
  currentUser: null,
  isAuthReady: true,
  fallbackDisplayName: "",
  uploadedAvatar: "",
  saveProfile: async () => { throw new Error("No signed-in user"); },
});

export const UserProvider = ({ children }) => {
  const [session, setSession] = useState({
    currentUser: null,
    isAuthReady: false,
    fallbackDisplayName: "",
    uploadedAvatar: "",
  });

  useEffect(() => {
    let active = true;
    const unsubscribe = onAuthStateChangedListener((user) => {
      setSession({ currentUser: user, isAuthReady: true, fallbackDisplayName: "", uploadedAvatar: "" });
      if (!user) return;

      loadUploadedAvatar(user.uid).then((uploadedAvatar) => {
        if (active) setSession((current) => current.currentUser === user ? { ...current, uploadedAvatar } : current);
      }).catch(() => {});

      // Firestore metadata is optional for the Firebase Auth session.
      createUserDocumentFromAuth(user).catch(() => {});
      if (!user.displayName) {
        getStoredDisplayName(user.uid).then((name) => {
          if (!active || !name) return;
          setSession((current) => (
            current.currentUser === user && !user.displayName
              ? { ...current, fallbackDisplayName: name }
              : current
          ));
        }).catch(() => {});
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const saveProfile = async (profile) => {
    const user = session.currentUser;
    if (!user) throw new Error("No signed-in user");

    const { uploadedAvatar, ...authProfile } = profile;
    if (uploadedAvatar !== undefined) await saveUploadedAvatar(user.uid, uploadedAvatar);
    await updateUserProfile(user, authProfile);
    // Firebase updates the existing User object, so refresh the context value.
    const avatar = uploadedAvatar === undefined ? session.uploadedAvatar : uploadedAvatar || "";
    setSession((current) => current.currentUser === user ? { ...current, uploadedAvatar: avatar } : current);
    return { displayName: user.displayName, photoURL: user.photoURL, uploadedAvatar: avatar };
  };

  const value = { ...session, saveProfile };
  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};
