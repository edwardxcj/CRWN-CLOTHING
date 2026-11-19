import { useState } from "react";

import FormInput from "../form-input/form-input.component";
import {
  signInWithGooglePopup,
  signInAuthUserWithEmailAndPassword,
  sendAccountPasswordReset,
} from "../../utils/firebase/firebase.utils";

import "./sign-in-form.styles.scss";

const incorrectCredentials = "That email and password don't match. Please try again.";
const credentialErrors = {
  "auth/invalid-credential": incorrectCredentials,
  "auth/invalid-login-credentials": incorrectCredentials,
  "auth/wrong-password": incorrectCredentials,
  "auth/user-not-found": incorrectCredentials,
  "auth/user-disabled": "This account is disabled.",
  "auth/too-many-requests": "Too many attempts. Please wait a moment and try again.",
  "auth/network-request-failed": "We couldn't connect. Check your connection and try again.",
  "auth/popup-blocked": "Your browser blocked the Google sign-in window. Allow pop-ups and try again.",
  "auth/popup-closed-by-user": "The Google sign-in window was closed. You can try again.",
  "auth/unauthorized-domain": "Google sign-in isn't available at this web address.",
};

const SignInForm = ({ pending, setPending }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const isPending = Boolean(pending);

  const signIn = async (method) => {
    setPending(method);
    setError("");

    try {
      if (method === "google") {
        await signInWithGooglePopup();
      } else {
        await signInAuthUserWithEmailAndPassword(email.trim(), password);
      }
      setPassword("");
    } catch (signInError) {
      setError(credentialErrors[signInError.code] || "We couldn't sign you in. Please try again.");
    } finally {
      setPending(null);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!isPending) signIn("email");
  };

  const resetPassword = async () => {
    if (isPending) return;
    setError("");
    setResetSent(false);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Enter your email address above to request a reset link.");
      return;
    }
    setPending("reset");
    try {
      await sendAccountPasswordReset(email);
      setResetSent(true);
    } catch (resetError) {
      if (resetError.code === "auth/user-not-found") setResetSent(true);
      else setError(credentialErrors[resetError.code] || "We couldn’t send the reset link. Please try again.");
    } finally {
      setPending(null);
    }
  };

  return (
    <form className="account-form" onSubmit={handleSubmit} aria-busy={isPending}>
      <FormInput
        label="Email address"
        type="email"
        autoComplete="email"
        required
        name="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />
      <FormInput
        label="Password"
        type="password"
        autoComplete="current-password"
        required
        name="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />

      {error && (
        <p className="account-form-error" role="alert">
          {error}
        </p>
      )}

      <button className="store-text-link account-forgot" type="button" disabled={isPending} onClick={resetPassword}>
        {pending === "reset" ? "Sending reset link…" : "Forgot password?"}
      </button>
      {resetSent && <p role="status">If this email has a password account, a reset link is on its way. You can also continue with Google.</p>}

      <button className="account-action" type="submit" disabled={isPending}>
        {pending === "email" ? "Signing in…" : "Sign in"}
      </button>

      <span className="account-separator" aria-hidden="true">
        or
      </span>

      <button
        className="account-action account-action--secondary"
        type="button"
        disabled={isPending}
        onClick={() => signIn("google")}
      >
        {pending === "google" ? "Connecting to Google…" : "Continue with Google"}
      </button>
    </form>
  );
};

export default SignInForm;
