import { useState } from "react";

import FormInput from "../form-input/form-input.component";
import {
  createAuthUserWithEmailAndPassword,
  createUserDocumentFromAuth,
  updateUserProfile,
} from "../../utils/firebase/firebase.utils";

const defaultFormFields = {
  displayName: "",
  email: "",
  password: "",
  confirmPassword: "",
};

const accountErrors = {
  "auth/email-already-in-use": "An account already exists for this email. Switch to sign in.",
  "auth/weak-password": "Choose a stronger password with at least 6 characters.",
  "auth/password-does-not-meet-requirements": "That password doesn't meet the account requirements.",
  "auth/too-many-requests": "Too many attempts. Please wait a moment and try again.",
  "auth/network-request-failed": "We couldn't connect. Check your connection and try again.",
};

const SignUpForm = ({ pending, setPending, onProfileError }) => {
  const [formFields, setFormFields] = useState(defaultFormFields);
  const [error, setError] = useState("");
  const [passwordMismatch, setPasswordMismatch] = useState(false);
  const { displayName, email, password, confirmPassword } = formFields;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (pending) return;

    if (password !== confirmPassword) {
      setError("");
      setPasswordMismatch(true);
      return;
    }

    setPending("create-account");
    setError("");

    try {
      const { user } = await createAuthUserWithEmailAndPassword(email.trim(), password);
      const name = displayName.trim();
      await updateUserProfile(user, { displayName: name }).catch(onProfileError);
      createUserDocumentFromAuth(user, { displayName: name }).catch(() => {});
      setFormFields(defaultFormFields);
    } catch (signUpError) {
      setError(accountErrors[signUpError.code] || "We couldn't create your account. Please try again.");
    } finally {
      setPending(null);
    }
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormFields((fields) => ({ ...fields, [name]: value }));
    if (name === "password" || name === "confirmPassword") setPasswordMismatch(false);
  };

  return (
    <form className="account-form" onSubmit={handleSubmit} aria-busy={Boolean(pending)}>
      <FormInput
        label="Name"
        type="text"
        autoComplete="name"
        required
        pattern=".*\S.*"
        onChange={handleChange}
        name="displayName"
        value={displayName}
      />
      <FormInput
        label="Email address"
        type="email"
        autoComplete="email"
        required
        onChange={handleChange}
        name="email"
        value={email}
      />
      <FormInput
        label="Password (at least 6 characters)"
        type="password"
        autoComplete="new-password"
        required
        minLength={6}
        onChange={handleChange}
        name="password"
        value={password}
      />
      <FormInput
        label="Confirm password"
        type="password"
        autoComplete="new-password"
        required
        aria-invalid={passwordMismatch || undefined}
        aria-describedby={passwordMismatch ? "account-password-error" : undefined}
        onChange={handleChange}
        name="confirmPassword"
        value={confirmPassword}
      />

      {passwordMismatch && (
        <p className="account-form-error" id="account-password-error" role="alert">
          The passwords don't match.
        </p>
      )}

      {error && (
        <p className="account-form-error" role="alert">
          {error}
        </p>
      )}

      <button className="account-action" type="submit" disabled={Boolean(pending)}>
        {pending ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
};

export default SignUpForm;
