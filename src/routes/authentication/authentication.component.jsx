import { useContext, useState } from "react";
import { Link } from "react-router-dom";

import SignUpForm from "../../components/sign-up-form/sign-up-form.component";
import SignInForm from "../../components/sign-in-form/sign-in-form.component";
import AccountDashboard from "../../components/account-dashboard/account-dashboard.component";
import { UserContext } from "../../contexts/user.context";
import { signOutUser } from "../../utils/firebase/firebase.utils";

import "./authentication.styles.scss";

const Authentication = () => {
  const [mode, setMode] = useState("sign-in");
  const [pending, setPending] = useState(null);
  const [accountError, setAccountError] = useState("");
  const { currentUser, isAuthReady, fallbackDisplayName, saveProfile } = useContext(UserContext);
  const isSigningIn = mode === "sign-in";

  const reportProfileError = () => {
    setAccountError("Your account is active, but we couldn't save your name.");
  };

  const handleSignOut = async () => {
    setMode("sign-in");
    await signOutUser();
    setAccountError("");
  };

  if (!isAuthReady) {
    return (
      <section className="container account-page" aria-label="Your account">
        <p role="status">Loading your account…</p>
      </section>
    );
  }

  if (currentUser && pending !== "create-account") {
    return (
      <AccountDashboard
        key={currentUser.uid}
        user={currentUser}
        fallbackDisplayName={fallbackDisplayName}
        notice={accountError}
        onSaveProfile={saveProfile}
        onSignOut={handleSignOut}
      />
    );
  }

  return (
    <section className="container account-page" aria-labelledby="account-title">
      <div className="account-layout">
        <header className="account-intro">
          <span className="account-wordmark">CRWN CLOTHING</span>
          <h1 id="account-title">Your account.</h1>
          <Link className="account-shop-link" to="/shop">
            Explore the shop <span aria-hidden="true">↗</span>
          </Link>
        </header>

        <div className="account-panel">
          <div className="account-modes" role="group" aria-label="Account options">
            <button
              type="button"
              aria-pressed={isSigningIn}
              disabled={Boolean(pending)}
              onClick={() => setMode("sign-in")}
            >
              Sign in
            </button>
            <button
              type="button"
              aria-pressed={!isSigningIn}
              disabled={Boolean(pending)}
              onClick={() => setMode("create-account")}
            >
              Create account
            </button>
          </div>

          {isSigningIn ? (
            <SignInForm pending={pending} setPending={setPending} />
          ) : (
            <SignUpForm
              pending={pending}
              setPending={setPending}
              onProfileError={reportProfileError}
            />
          )}
        </div>
      </div>
    </section>
  );
};

export default Authentication;
