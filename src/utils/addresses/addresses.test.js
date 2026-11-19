import { addressError, addressSnapshot, deliverySnapshot } from "./addresses.utils";

jest.mock("../firebase/firebase.utils", () => ({ auth: {}, db: {} }));

const address = { recipient: " Alex ", line1: "1 Example Street", line2: "", city: "Sydney", region: "NSW", postalCode: "2000", country: "Australia", phone: "", id: "private-doc-id", isDefault: true };

test("an order address keeps a trimmed snapshot without profile metadata", () => {
  expect(addressError(address)).toBe("");
  const saved = addressSnapshot(address);
  expect(saved.recipient).toBe("Alex");
  expect(saved).not.toHaveProperty("id");
  expect(saved).not.toHaveProperty("isDefault");
  address.line1 = "A later change";
  expect(saved.line1).toBe("1 Example Street");
});

test("delivery uses supported fees and rejects incomplete or unsupported choices", () => {
  expect(deliverySnapshot({ address, method: "express", fee: 0 }).fee).toBe(12);
  expect(deliverySnapshot({ address, method: "standard" }).fee).toBe(0);
  expect(deliverySnapshot({ address: { recipient: "Alex" }, method: "standard" })).toBeNull();
  expect(deliverySnapshot({ address, method: "unsupported" })).toBeNull();
});
