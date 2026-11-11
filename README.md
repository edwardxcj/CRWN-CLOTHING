# CRWN Clothing

[CRWN Clothing](https://crownclothings.com/) is a clothing storefront built with React, React Router, and Firebase. Browse the catalog by category, search and sort products, open product details, and save items in a shopping bag.

## Run locally

Use Node.js 22 or later and Yarn Classic:

```sh
yarn install --frozen-lockfile
yarn start
```

The app runs at `http://localhost:3000`. Run `yarn test --watchAll=false` for tests and `yarn build` for a production bundle.

The catalog reads from Firestore and falls back to the bundled 35-product catalog when Firestore is unavailable. Known catalog photos, the campaign image, and the fonts are served with the site. The campaign image was generated with OpenAI ImageGen and is editorial imagery, separate from the original product photos.

Firebase supports email and Google sign-in. For Google sign-in on a new deployment or local host, add that hostname to the authorized domains of the Firebase project. The bag is stored in the current browser. Checkout simulates a payment with a test card and shows a confirmation. The demo runs in the browser and makes no charges or real orders.

Netlify serves the `build` directory. The SPA rewrite in `public/_redirects` supports direct links to categories, products, and account pages.
