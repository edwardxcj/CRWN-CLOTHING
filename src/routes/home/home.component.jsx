import { useContext } from "react";
import { Link } from "react-router-dom";

import ProductCard from "../../components/product-card/product-card.component";
import StoreIcon from "../../components/store-icon/store-icon";
import { CategoriesContext } from "../../contexts/categories.context";

import "./home.styles.scss";

const media = `${process.env.PUBLIC_URL}/media`;

const collections = [
  { slug: "womens", title: "Women", image: "womens", position: "50% 37%" },
  { slug: "mens", title: "Men", image: "men", position: "50% 38%" },
  { slug: "jackets", title: "Jackets", image: "jackets", position: "49% 36%" },
  { slug: "sneakers", title: "Sneakers", image: "sneakers", position: "50% 61%" },
  { slug: "hats", title: "Hats", image: "hats", position: "50% 43%" },
];

const edit = [
  { category: "jackets", id: 22 },
  { category: "sneakers", id: 12 },
  { category: "womens", id: 27 },
  { category: "hats", id: 1 },
];

const Home = () => {
  const { categoriesMap } = useContext(CategoriesContext);
  const featured = edit.flatMap(({ category, id }) => {
    const product = categoriesMap[category]?.find((item) => String(item.id) === String(id));
    return product ? [{ category, product }] : [];
  });

  return (
    <div className="store-home">
      <section className="container home-hero" aria-labelledby="home-title">
        <div className="home-hero__copy">
          <p className="eyebrow home-hero__eyebrow"><span />The Everyday Edit</p>
          <h1 id="home-title">Everyday,<br /><em>in good form.</em></h1>
          <p className="home-hero__intro">Easy layers, standout sneakers, and the finishing touches that make an outfit yours.</p>
          <div className="home-hero__actions">
            <Link to="/shop" className="store-button">Shop the collection <StoreIcon name="arrow" size={18} /></Link>
            <a href="#collections" className="store-text-link">Browse categories</a>
          </div>
        </div>
        <div className="home-hero__visual">
          <img
            src={`${media}/everyday-edit.webp`}
            srcSet={`${media}/everyday-edit-small.webp 768w, ${media}/everyday-edit.webp 1536w`}
            sizes="(max-width: 700px) 94vw, (max-width: 1568px) 54vw, 835px"
            width="1536"
            height="1024"
            alt="Two people in earth-toned layers in a sunlit concrete courtyard"
          />
          <span className="home-hero__frame eyebrow" aria-hidden="true">CRWN / EDIT 01</span>
        </div>
      </section>

      <section className="container home-collections" id="collections" aria-labelledby="collections-title">
        <div className="home-section-heading">
          <div>
            <p className="eyebrow">Find your fit</p>
            <h2 id="collections-title">Shop by category</h2>
          </div>
          <Link to="/shop" className="store-text-link">View all products <StoreIcon name="diagonal" size={15} /></Link>
        </div>
        <div className="home-collections__grid">
          {collections.map(({ slug, title, image, position }) => (
            <Link to={`/shop/${slug}`} className="home-category" key={slug}>
              <div className="home-category__image">
                <img src={`${media}/collections/${image}.webp`} alt="" loading="lazy" decoding="async" style={{ objectPosition: position }} />
              </div>
              <span className="home-category__caption">
                {title}
                <StoreIcon name="diagonal" size={17} />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {featured.length > 0 && (
        <section className="home-feature" aria-labelledby="featured-title">
          <div className="container">
            <div className="home-section-heading">
              <div>
                <p className="eyebrow">The CRWN shortlist</p>
                <h2 id="featured-title">In the edit</h2>
              </div>
              <Link to="/shop" className="store-text-link">Shop the full collection <StoreIcon name="diagonal" size={15} /></Link>
            </div>
            <div className="home-feature__grid">
              {featured.map(({ category, product }) => (
                <ProductCard key={product.id} category={category} product={product} />
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default Home;
