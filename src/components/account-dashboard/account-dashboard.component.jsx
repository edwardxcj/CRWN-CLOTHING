import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import StoreIcon from "../store-icon/store-icon";
import "./account-dashboard.styles.scss";

const MAX_NAME_LENGTH = 80;
const MAX_PHOTO_URL_LENGTH = 2048;

const getPhotoURL = (value) => {
  if (!value || value.length > MAX_PHOTO_URL_LENGTH) return null;

  try {
    const url = new URL(value);
    if (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      url.href.length <= MAX_PHOTO_URL_LENGTH
    ) {
      return url.href;
    }
  } catch {
    return null;
  }

  return null;
};

const getInitials = (value) =>
  value
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => [...part][0])
    .join("")
    .toLocaleUpperCase();

const signInLabels = { "google.com": "Google", password: "Email and password" };

const AccountDashboard = ({
  user,
  onSaveProfile,
  onSignOut,
  fallbackDisplayName = "",
  notice = "",
}) => {
  const { displayName, photoURL, email, providerData = [] } = user;
  const [profileOverride, setProfileOverride] = useState(null);
  const [draft, setDraft] = useState(null);
  const [pendingAction, setPendingAction] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [saveError, setSaveError] = useState("");
  const [signOutError, setSignOutError] = useState("");
  const [saved, setSaved] = useState(false);
  const [failedPhotoURL, setFailedPhotoURL] = useState(null);
  const nameInput = useRef(null);
  const photoInput = useRef(null);
  const editButton = useRef(null);
  const restoreEditFocus = useRef(false);
  const editing = draft !== null;
  const busy = Boolean(pendingAction);

  useEffect(() => {
    if (editing) {
      nameInput.current?.focus();
    } else if (restoreEditFocus.current) {
      editButton.current?.focus();
      restoreEditFocus.current = false;
    }
  }, [editing]);

  const savedProfile = profileOverride ?? {
    displayName: displayName?.trim() || fallbackDisplayName?.trim() || "",
    photoURL: photoURL ?? null,
  };
  const nameValue = draft?.displayName ?? savedProfile.displayName;
  const photoValue = draft?.photoURL ?? savedProfile.photoURL ?? "";
  const profileName = savedProfile.displayName.trim();
  const avatarURL = getPhotoURL(savedProfile.photoURL);
  const initials = getInitials(profileName || email || "CRWN");
  const signInMethods = [
    ...new Set(providerData.map(({ providerId }) => signInLabels[providerId]).filter(Boolean)),
  ];

  const startEditing = () => {
    setFieldErrors({});
    setSaveError("");
    setSaved(false);
    setDraft({});
  };

  const closeEditor = () => {
    restoreEditFocus.current = true;
    setDraft(null);
  };

  const updateDraft = ({ target }) => {
    const { name, value } = target;
    setDraft((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => ({ ...current, [name]: "" }));
    setSaveError("");
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    if (busy || !draft) return;

    const name = nameValue.trim();
    const enteredPhotoURL = photoValue.trim();
    const validatedPhotoURL = getPhotoURL(enteredPhotoURL);
    const errors = {};

    if (!name || [...name].length > MAX_NAME_LENGTH) {
      errors.displayName = `Enter a name between 1 and ${MAX_NAME_LENGTH} characters.`;
    }
    if (enteredPhotoURL && !validatedPhotoURL) {
      errors.photoURL = "Enter an HTTPS image URL without a username or password (up to 2,048 characters).";
    }
    setFieldErrors(errors);
    if (errors.displayName || errors.photoURL) {
      (errors.displayName ? nameInput : photoInput).current?.focus();
      return;
    }

    const profile = { displayName: name, photoURL: validatedPhotoURL };
    setPendingAction("save");
    setSaveError("");
    try {
      const updatedProfile = await onSaveProfile(profile);
      setProfileOverride(updatedProfile ?? profile);
      setFailedPhotoURL(null);
      closeEditor();
      setSaved(true);
    } catch {
      setSaveError("We couldn’t save your profile. Please try again.");
    } finally {
      setPendingAction("");
    }
  };

  const signOut = async () => {
    if (busy) return;

    setPendingAction("signOut");
    setSignOutError("");
    try {
      await onSignOut();
    } catch {
      setSignOutError("We couldn’t sign you out. Please try again.");
    } finally {
      setPendingAction("");
    }
  };

  return (
    <section className="container account-dashboard" aria-labelledby="account-dashboard-title">
      <header className="account-dashboard__heading">
        <nav aria-label="Breadcrumb" className="account-dashboard__breadcrumb">
          <Link to="/">Home</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">My account</span>
        </nav>
        <h1 id="account-dashboard-title">My account</h1>
      </header>

      <div className="account-dashboard__layout">
        <aside className="account-dashboard__sidebar" aria-label="Account overview">
          <div className="account-dashboard__identity">
            <div className="account-dashboard__avatar" aria-hidden="true">
              <span>{initials}</span>
              {avatarURL && avatarURL !== failedPhotoURL && (
                <img
                  src={avatarURL}
                  alt=""
                  referrerPolicy="no-referrer"
                  onError={() => setFailedPhotoURL(avatarURL)}
                />
              )}
            </div>
            <div className="account-dashboard__identity-copy">
              <p>Welcome back</p>
              <p className="account-dashboard__name">{profileName || "CRWN member"}</p>
            </div>
          </div>

          <nav className="account-dashboard__shortcuts" aria-label="Shopping shortcuts">
            <Link to="/shop">
              <StoreIcon name="arrow" size={18} />
              Continue shopping
              <StoreIcon name="diagonal" size={15} />
            </Link>
            <Link to="/checkout">
              <StoreIcon name="bag" size={18} />
              Shopping bag
              <StoreIcon name="diagonal" size={15} />
            </Link>
          </nav>
        </aside>

        <div className="account-dashboard__panels">
          <section className="account-dashboard__panel" aria-labelledby="profile-details-title">
            <div className="account-dashboard__panel-heading">
              <h2 id="profile-details-title">Personal details</h2>
              {!editing && (
                <button
                  ref={editButton}
                  className="store-button store-button--outline"
                  type="button"
                  disabled={busy}
                  onClick={startEditing}
                >
                  Edit profile
                </button>
              )}
            </div>

            {notice && !profileOverride && (
              <p className="account-dashboard__notice" role="alert">{notice}</p>
            )}

            {editing ? (
              <form className="account-dashboard__form" onSubmit={saveProfile} noValidate aria-busy={pendingAction === "save"}>
                <div className="account-dashboard__field">
                  <label htmlFor="profile-display-name">Display name</label>
                  <input
                    id="profile-display-name"
                    ref={nameInput}
                    name="displayName"
                    autoComplete="name"
                    value={nameValue}
                    onChange={updateDraft}
                    required
                    readOnly={busy}
                    aria-invalid={Boolean(fieldErrors.displayName)}
                    aria-describedby="profile-display-name-help"
                  />
                  <p
                    id="profile-display-name-help"
                    className={fieldErrors.displayName ? "account-dashboard__error" : "account-dashboard__hint"}
                  >
                    {fieldErrors.displayName || `Up to ${MAX_NAME_LENGTH} characters.`}
                  </p>
                </div>

                <div className="account-dashboard__field">
                  <label htmlFor="profile-photo-url">Profile photo link <span>(optional)</span></label>
                  <input
                    id="profile-photo-url"
                    ref={photoInput}
                    name="photoURL"
                    type="url"
                    autoComplete="off"
                    spellCheck="false"
                    value={photoValue}
                    placeholder="https://"
                    onChange={updateDraft}
                    readOnly={busy}
                    aria-invalid={Boolean(fieldErrors.photoURL)}
                    aria-describedby="profile-photo-url-help"
                  />
                  <p
                    id="profile-photo-url-help"
                    className={fieldErrors.photoURL ? "account-dashboard__error" : "account-dashboard__hint"}
                  >
                    {fieldErrors.photoURL || "Paste an HTTPS image link, or leave this blank to use initials."}
                  </p>
                </div>

                {saveError && <p className="account-dashboard__error" role="alert">{saveError}</p>}
                <div className="account-dashboard__form-actions">
                  <button className="store-button" type="submit" disabled={busy}>
                    {pendingAction === "save" ? "Saving…" : "Save changes"}
                  </button>
                  <button className="store-button store-button--outline" type="button" disabled={busy} onClick={closeEditor}>
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <dl className="account-dashboard__details">
                <div>
                  <dt>Display name</dt>
                  <dd>{profileName || "Not set"}</dd>
                </div>
                <div>
                  <dt>Profile photo</dt>
                  <dd>{avatarURL && avatarURL !== failedPhotoURL ? "Custom photo" : "Initials"}</dd>
                </div>
              </dl>
            )}
            <div role="status">
              {saved && (
                <p className="account-dashboard__success">
                  <StoreIcon name="check" size={17} />
                  Profile updated.
                </p>
              )}
            </div>
          </section>

          <section className="account-dashboard__panel" aria-labelledby="sign-in-details-title">
            <div className="account-dashboard__panel-heading">
              <h2 id="sign-in-details-title">Sign-in details</h2>
              <button
                className="store-button store-button--outline"
                type="button"
                onClick={signOut}
                disabled={busy}
              >
                {pendingAction === "signOut" ? "Signing out…" : "Sign out"}
              </button>
            </div>
            <dl className="account-dashboard__details">
              <div>
                <dt>Sign-in email</dt>
                <dd>{email || "Not available"}</dd>
              </div>
              {signInMethods.length > 0 && (
                <div>
                  <dt>Sign-in {signInMethods.length === 1 ? "method" : "methods"}</dt>
                  <dd>{signInMethods.join(" · ")}</dd>
                </div>
              )}
            </dl>
            {signOutError && <p className="account-dashboard__error" role="alert">{signOutError}</p>}
          </section>
        </div>
      </div>
    </section>
  );
};

export default AccountDashboard;
