import { emptyAddress } from "../../utils/addresses/addresses.utils";

export const addressFields = [
  ["recipient", "Full name", "name", 100], ["line1", "Street address", "address-line1", 150],
  ["line2", "Apartment, suite, etc. (optional)", "address-line2", 150], ["city", "City", "address-level2", 100],
  ["region", "State or region (optional)", "address-level1", 100], ["postalCode", "Postal code", "postal-code", 24],
  ["country", "Country", "country-name", 80], ["phone", "Phone (optional)", "tel", 30],
];

const AddressForm = ({ value = emptyAddress, onChange, disabled = false, prefix = "address" }) => (
  <div className="address-form">
    {addressFields.map(([field, label, autoComplete, maxLength]) => (
      <label key={field} htmlFor={`${prefix}-${field}`}>
        {label}
        <input
          id={`${prefix}-${field}`} type={field === "phone" ? "tel" : "text"}
          autoComplete={autoComplete} value={value[field] || ""} maxLength={maxLength}
          required={!["line2", "region", "phone"].includes(field)} disabled={disabled}
          onChange={(event) => onChange({ ...value, [field]: event.target.value })}
        />
      </label>
    ))}
  </div>
);

export default AddressForm;
