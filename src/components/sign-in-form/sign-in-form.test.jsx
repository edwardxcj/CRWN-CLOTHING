import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import SignInForm from "./sign-in-form.component";
import { sendAccountPasswordReset } from "../../utils/firebase/firebase.utils";

jest.mock("../../utils/firebase/firebase.utils", () => ({ sendAccountPasswordReset: jest.fn() }));

const ResetHarness = () => {
  const [pending, setPending] = useState(null);
  return <SignInForm pending={pending} setPending={setPending} />;
};

test("password recovery works without entering a password and keeps account existence private", async () => {
  sendAccountPasswordReset.mockRejectedValueOnce({ code: "auth/user-not-found" });
  render(<ResetHarness />);
  fireEvent.click(screen.getByRole("button", { name: "Forgot password?" }));
  expect(screen.getByRole("alert")).toHaveTextContent("Enter your email address");
  fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "shopper@example.test" } });
  fireEvent.click(screen.getByRole("button", { name: "Forgot password?" }));
  expect(await screen.findByRole("status")).toHaveTextContent("If this email has a password account");
  expect(sendAccountPasswordReset).toHaveBeenCalledWith("shopper@example.test");
});
