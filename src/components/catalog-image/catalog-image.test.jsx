import { fireEvent, render, screen } from "@testing-library/react";

import { catalogPhoto } from "../../utils/catalog/catalog-image";
import CatalogImage from "./catalog-image.component";

test("a saved product without an image URL uses the new photo and can fall back to its original", () => {
  const savedProduct = { id: "12", name: "Black Converse" };
  render(<CatalogImage photo={catalogPhoto(savedProduct)} alt={savedProduct.name} sizes="96px" />);

  const image = screen.getByRole("img", { name: "Black Converse" });
  expect(image).toHaveAttribute("src", "/media/catalog/studio/black-converse.webp");
  expect(image).toHaveAttribute("srcset", expect.stringContaining("/media/catalog/studio/black-converse-small.webp 480w"));

  fireEvent.error(image);
  expect(image).toHaveAttribute("src", "/media/catalog/black-converse.webp");
  expect(image).not.toHaveAttribute("srcset");

  fireEvent.error(image);
  expect(screen.getByText("Image unavailable")).toBeInTheDocument();
});
