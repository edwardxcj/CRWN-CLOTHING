import { Routes, Route } from "react-router-dom";

import Home from "./routes/home/home.component";
import Navigation from "./routes/navigation/navigation.component";
import Authentication from "./routes/authentication/authentication.component";
import Shop from "./routes/shop/shop.component";
import Checkout from "./routes/checkout/checkout.component";
import Wishlist from "./routes/wishlist/wishlist.component";
import OrderDetail from "./routes/order-detail/order-detail.component";
import Help from "./routes/help/help.component";
import Admin from "./routes/admin/admin.component";
import { Link } from "react-router-dom";

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<Navigation />}>
        <Route index element={<Home />} />
        <Route path="shop/*" element={<Shop />} />
        <Route path="auth" element={<Authentication />} />
        <Route path="checkout" element={<Checkout />} />
        <Route path="wishlist" element={<Wishlist />} />
        <Route path="orders/:orderId" element={<OrderDetail />} />
        <Route path="help" element={<Help />} />
        <Route path="admin" element={<Admin />} />
        <Route path="*" element={<section className="container catalog-notice"><h1>Page not found</h1><p>The page may have moved. Explore the collection or get help.</p><Link className="store-button" to="/shop">Explore the shop</Link><Link className="store-text-link" to="/help">Get help</Link></section>} />
      </Route>
    </Routes>
  );
};

export default App;
