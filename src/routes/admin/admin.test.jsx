import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import { CategoriesContext } from "../../contexts/categories.context";
import { UserContext } from "../../contexts/user.context";
import { saveCatalogOverride } from "../../utils/admin/catalog-admin.utils";
import Admin from "./admin.component";

jest.mock("../../utils/firebase/firebase.utils", () => ({}));
jest.mock("../../utils/admin/catalog-admin.utils", () => ({
  isCatalogAdmin: (user) => user?.uid === "owner",
  saveCatalogOverride: jest.fn(),
}));

test("republishing a hidden product retains its saved inventory and a failed save can retry", async () => {
  const product = { id: 13, name: "Nike White AirForce", price: 160, active: false, stockBySize: { "US 9": 3 } };
  saveCatalogOverride.mockRejectedValueOnce(Object.assign(new Error("Offline"), { code: "unavailable" })).mockResolvedValueOnce(undefined);
  render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <UserContext.Provider value={{ currentUser: { uid: "owner" }, isAuthReady: true }}>
      <CategoriesContext.Provider value={{ allCategoriesMap: { sneakers: [product] }, catalogAdminLoading: false }}>
        <Admin />
      </CategoriesContext.Provider>
    </UserContext.Provider>
  </MemoryRouter>);
  expect(screen.getByLabelText("Demo stock US 9")).toHaveValue(3);
  fireEvent.click(screen.getByLabelText("Published in the shop"));
  fireEvent.click(screen.getByRole("button", { name: "Save product" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("We couldn’t save this product");
  expect(screen.getByLabelText("Demo stock US 9")).toHaveValue(3);
  fireEvent.click(screen.getByRole("button", { name: "Save product" }));
  expect(await screen.findByRole("status")).toHaveTextContent("Product updated");
  expect(saveCatalogOverride.mock.calls[1][1]).toMatchObject({ active: true, stock: { "US 9": 3 } });
});
