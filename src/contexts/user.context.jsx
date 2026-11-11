import { createContext, useState, useEffect } from "react";

import {
  createUserDocumentFromAuth,
  getStoredDisplayName,
  onAuthStateChangedListener,
  updateUserProfile,
} from "../utils/firebase/firebase.utils";

export const UserContext = createContext({
  currentUser: null,
  isAuthReady: true,
  fallbackDisplayName: "",
  saveProfile: async () => { throw new Error("No signed-in user"); },
});

export const UserProvider = ({ children }) => {
  const [session, setSession] = useState({
    currentUser: null,
    isAuthReady: false,
    fallbackDisplayName: "",
  });

  useEffect(() => {
    let active = true;
    const unsubscribe = onAuthStateChangedListener((user) => {
      setSession({ currentUser: user, isAuthReady: true, fallbackDisplayName: "" });
      if (!user) return;

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

    await updateUserProfile(user, profile);
    // Firebase updates the existing User object, so refresh the context value.
    setSession((current) => current.currentUser === user ? { ...current } : current);
    return { displayName: user.displayName, photoURL: user.photoURL };
  };

  const value = { ...session, saveProfile };
  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};
