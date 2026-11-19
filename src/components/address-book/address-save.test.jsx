import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { UserContext } from "../../contexts/user.context";
import { createAddressId, loadAddressBook, saveAddress } from "../../utils/addresses/addresses.utils";
import CheckoutDelivery from "../checkout-delivery/checkout-delivery.component";
import AddressBook from "./address-book.component";

jest.mock("../../utils/firebase/firebase.utils", () => ({}));
jest.mock("../../utils/addresses/addresses.utils", () => ({
  ...jest.requireActual("../../utils/addresses/addresses.utils"),
  createAddressId: jest.fn(),
  loadAddressBook: jest.fn(),
  saveAddress: jest.fn(),
  setDefaultAddress: jest.fn(),
  deleteAddress: jest.fn(),
}));

const address = { recipient: "Test shopper", line1: "1 Test Street", line2: "", city: "Sydney", region: "", postalCode: "2000", country: "Australia", phone: "" };
const emptyBook = { addresses: [], defaultAddressId: "" };
const savedBook = { addresses: [{ id: "confirmed-address", ...address }], defaultAddressId: "confirmed-address" };
const asAccount = (children) => <UserContext.Provider value={{ currentUser: { uid: "address-owner" } }}>{children}</UserContext.Provider>;
const enterAddress = () => {
  for (const [label, value] of [["Full name", address.recipient], ["Street address", address.line1], ["City", address.city], ["Postal code", address.postalCode], ["Country", address.country]]) {
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
  }
};

beforeEach(() => {
  jest.clearAllMocks();
  loadAddressBook.mockReset().mockResolvedValue(emptyBook);
  saveAddress.mockReset().mockResolvedValue("confirmed-address");
  createAddressId.mockReturnValue("confirmed-address");
});

test("address book retains a confirmed save when refresh fails and retries only the read", async () => {
  loadAddressBook.mockResolvedValueOnce(emptyBook).mockRejectedValueOnce(new Error("Read unavailable")).mockResolvedValueOnce(savedBook);
  render(asAccount(<AddressBook />));
  fireEvent.click(await screen.findByRole("button", { name: "Add an address" }));
  enterAddress();
  fireEvent.click(screen.getByRole("button", { name: "Save address" }));

  expect(await screen.findByRole("status")).toHaveTextContent("Your address change is saved");
  expect(screen.getByRole("button", { name: "Edit address for Test shopper" })).toBeEnabled();
  expect(screen.getByText("Default")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Save address" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Refresh addresses" }));
  await waitFor(() => expect(screen.queryByRole("button", { name: "Refresh addresses" })).not.toBeInTheDocument());
  expect(saveAddress).toHaveBeenCalledTimes(1);
  expect(loadAddressBook).toHaveBeenCalledTimes(3);
});

test("address book retries an unconfirmed write with the same document ID", async () => {
  saveAddress.mockRejectedValueOnce(new Error("Response interrupted")).mockResolvedValueOnce("confirmed-address");
  loadAddressBook.mockResolvedValueOnce(emptyBook).mockResolvedValueOnce(savedBook);
  render(asAccount(<AddressBook />));
  fireEvent.click(await screen.findByRole("button", { name: "Add an address" }));
  enterAddress();
  fireEvent.click(screen.getByRole("button", { name: "Save address" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Response interrupted");
  fireEvent.click(screen.getByRole("button", { name: "Save address" }));
  expect(await screen.findByRole("button", { name: "Edit address for Test shopper" })).toBeInTheDocument();
  expect(createAddressId).toHaveBeenCalledTimes(1);
  expect(saveAddress).toHaveBeenCalledTimes(2);
  expect(saveAddress.mock.calls.map((call) => call[2].id)).toEqual(["confirmed-address", "confirmed-address"]);
});

test("checkout retains the saved address and valid delivery snapshot when refresh fails", async () => {
  const onChange = jest.fn();
  loadAddressBook.mockResolvedValueOnce(emptyBook).mockRejectedValueOnce(new Error("Read unavailable")).mockResolvedValueOnce(savedBook);
  render(asAccount(<CheckoutDelivery onChange={onChange} />));
  await waitFor(() => expect(screen.queryByText("Loading your saved addresses…")).not.toBeInTheDocument());
  enterAddress();
  fireEvent.click(screen.getByRole("button", { name: "Save this address to my account" }));

  expect(await screen.findByRole("status")).toHaveTextContent("This address is saved to your account");
  expect(screen.getByLabelText("Deliver to")).toHaveValue("confirmed-address");
  expect(screen.queryByRole("button", { name: "Save this address to my account" })).not.toBeInTheDocument();
  expect(onChange.mock.calls.at(-1)[0]).toEqual(expect.objectContaining({ address, method: "standard" }));
  fireEvent.click(screen.getByRole("button", { name: "Refresh addresses" }));
  await waitFor(() => expect(screen.queryByRole("button", { name: "Refresh addresses" })).not.toBeInTheDocument());
  expect(screen.getByLabelText("Deliver to")).toHaveValue("confirmed-address");
  expect(saveAddress).toHaveBeenCalledTimes(1);
});

test("checkout retries an unconfirmed address write with the same document ID", async () => {
  saveAddress.mockRejectedValueOnce(new Error("Response interrupted")).mockResolvedValueOnce("confirmed-address");
  loadAddressBook.mockResolvedValueOnce(emptyBook).mockResolvedValueOnce(savedBook);
  render(asAccount(<CheckoutDelivery onChange={() => {}} />));
  await waitFor(() => expect(screen.queryByText("Loading your saved addresses…")).not.toBeInTheDocument());
  enterAddress();
  fireEvent.click(screen.getByRole("button", { name: "Save this address to my account" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("We couldn’t save this address");
  fireEvent.click(screen.getByRole("button", { name: "Save this address to my account" }));
  expect(await screen.findByLabelText("Deliver to")).toHaveValue("confirmed-address");
  expect(createAddressId).toHaveBeenCalledTimes(1);
  expect(saveAddress.mock.calls.map((call) => call[2].id)).toEqual(["confirmed-address", "confirmed-address"]);
});

test("a late initial read cannot replace an address saved during loading", async () => {
  let finishInitialLoad;
  loadAddressBook.mockImplementationOnce(() => new Promise((resolve) => { finishInitialLoad = resolve; }))
    .mockRejectedValueOnce(new Error("Refresh unavailable"));
  render(asAccount(<CheckoutDelivery onChange={() => {}} />));
  enterAddress();
  fireEvent.click(screen.getByRole("button", { name: "Save this address to my account" }));
  expect(await screen.findByText("This address is saved to your account. We couldn’t refresh your other addresses.")).toBeInTheDocument();
  await act(async () => finishInitialLoad({ addresses: [{ id: "old-address", ...address, line1: "An older address" }], defaultAddressId: "old-address" }));
  expect(screen.getByLabelText("Deliver to")).toHaveValue("confirmed-address");
  expect(screen.getByText("1 Test Street, Sydney, 2000, Australia")).toBeInTheDocument();
});

test("changing accounts clears the previous account delivery address", async () => {
  const onChange = jest.fn();
  const previousValue = { address, method: "standard" };
  const form = (uid) => <UserContext.Provider value={{ currentUser: { uid } }}><CheckoutDelivery value={previousValue} onChange={onChange} /></UserContext.Provider>;
  const view = render(form("first-account"));
  await waitFor(() => expect(screen.queryByText("Loading your saved addresses…")).not.toBeInTheDocument());
  expect(screen.getByLabelText("Street address")).toHaveValue("1 Test Street");
  view.rerender(form("second-account"));
  await waitFor(() => expect(screen.queryByText("Loading your saved addresses…")).not.toBeInTheDocument());
  expect(screen.getByLabelText("Street address")).toHaveValue("");
  expect(onChange.mock.calls.at(-1)[0]).toBeNull();
});

test("a slow initial address lookup preserves an address entered for checkout", async () => {
  let resolveBook;
  loadAddressBook.mockImplementationOnce(() => new Promise((resolve) => { resolveBook = resolve; }));
  const onChange = jest.fn();
  render(asAccount(<CheckoutDelivery onChange={onChange} />));
  enterAddress();
  resolveBook({ addresses: [{ id: "old-address", ...address, line1: "An older address" }], defaultAddressId: "old-address" });
  await waitFor(() => expect(screen.queryByText("Loading your saved addresses…")).not.toBeInTheDocument());
  expect(screen.getByLabelText("Street address")).toHaveValue("1 Test Street");
  expect(screen.getByLabelText("Deliver to")).toHaveValue("__new__");
  expect(onChange.mock.calls.at(-1)[0]).toEqual(expect.objectContaining({ address }));
});
