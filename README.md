# SN-1 - 3D Sneaker Gallery

SN-1 is a one-page 3D sneaker shopping template for online shoe sellers, Instagram sellers, and small sneaker brands. The page is locked to `100dvh` and uses a horizontal gallery experience instead of normal page scrolling.

## Main Features

- Shared React Three Fiber canvas rendering every visible product.
- Horizontal product groups with wheel, trackpad, button, keyboard, and swipe navigation.
- 10 visible shoes per desktop page in a compact 2-row gallery.
- 2 visible shoes per mobile page, stacked vertically on narrow phones.
- Real Shopify Materials Variants Shoe GLB with `midnight`, `beach`, and `street` material variants.
- Hover, select, and drag-to-rotate interactions on each shoe without opening product details.
- Selection dots for choosing the active shoe.
- Independent cart buttons that act as the only trigger for product details and buying controls.
- Desktop joystick control for rotating the selected shoe.
- A safe-area-aware footer grouping rotation guidance, copyright, and gallery navigation.
- Mobile swipe/rotate guidance and bottom-sheet product details.
- Multi-select filters for gender, sale, brand, size, color, and price.
- Dark premium black, red, and white visual style.
- Fast, web-safe Arial/Helvetica typography across the interface.

## Tech Stack

- Vite
- React
- Three.js
- React Three Fiber
- Drei
- `three/examples/jsm/utils/SkeletonUtils` for cloning the loaded GLB scene

## Installation

```bash
npm install
```

## Development

```bash
npm run dev
```

The Vite dev server will print a local URL, usually `http://localhost:5173`.

## Production Build

```bash
npm run build
```

## Preview Build

```bash
npm run preview
```

## 3D Shoe Model And Material Variants

The gallery uses the Shopify Materials Variants Shoe GLB from the Three.js `webgl_loader_gltf_variants` example:

```text
public/models/MaterialsVariantsShoe.glb
```

The model is loaded once with:

```js
useGLTF('/models/MaterialsVariantsShoe.glb')
```

Each visible product clones the loaded scene with `SkeletonUtils.clone`, then applies the matching `KHR_materials_variants` material mapping. Product colorways are controlled by the `variant` field in `src/main.jsx`:

```js
variant: 'midnight'
variant: 'beach'
variant: 'street'
```

The original GLB materials and textures are preserved. The scene is centered after cloning so every shoe sits consistently inside its HTML grid cell.

## Filtering And Horizontal Navigation

Filters live in `FILTERS` and product metadata lives in the generated `shoes` array in `src/main.jsx`.

Desktop filters are compact text dropdowns in the top navigation. Mobile filters are grouped inside one `Filters` button that opens a bottom drawer.

The gallery does not use vertical document scrolling. Wheel and trackpad input inside the gallery is converted into horizontal page navigation. The page size is responsive:

- Desktop: 10 shoes per page
- Tablet and larger mobile: 2 shoes per page
- Narrow phones: 2 shoes per page in a vertical two-row layout

Additional products are revealed in groups as the user advances through the gallery.

## Mobile Behaviour

The app uses `100dvh`, hidden document overflow, and safe-area-aware bottom controls. On mobile:

- The logo, Filters button, and Contact button stay compact.
- The product popup becomes a bottom sheet.
- The gallery supports swipe navigation between product groups.
- Two shoes remain large enough to select, tap, and rotate on every page.
- Selection dots and cart buttons remain available for both shoes.
- The cart button is the only control that opens product details; shoe exploration never opens the popup.
- Rotation guidance, copyright, and Prev/Page/Next controls share one footer raised above phone safe areas.

## Performance Optimizations

- One shared WebGL renderer/canvas for the full gallery.
- One GLB load, reused through cloned scenes.
- Only visible cells are rendered in the canvas.
- Products outside the measured viewport are skipped.
- Reduced device pixel ratio range for smoother rendering.
- Simple studio lighting without heavy per-shoe shadows.
- `prefers-reduced-motion` is respected in CSS and interaction animation.

## Replacing Products

Edit `baseShoes` and the generated `shoes` mapping in `src/main.jsx`.

To change product names, prices, descriptions, sizes, or variants, update the entries in `baseShoes`:

```js
['Midnight Runner', '$148', 'Short description.', ['7', '8', '9'], 'midnight']
```

To change gender, brand, sale state, or generated inventory size, edit the `shoes` array generation below `baseShoes`.

## Replacing The GLB Model

Place the new model in `public/models/` and update both references:

```js
useGLTF('/models/YourModel.glb')
useGLTF.preload('/models/YourModel.glb')
```

If the replacement model does not use `KHR_materials_variants`, remove or replace the variant assignment logic inside `ShopifyVariantShoe`.

## Replacing Prices And Sizes

Prices are stored as strings in `baseShoes`, then converted to `priceValue` for price filtering. Keep the `$123` format or update the parsing logic:

```js
const priceValue = Number(source[1].replace('$', ''))
```

Available sizes come from `sizeWindows` and the product data. Add or remove options in `FILTERS.size.options` if the filter menu needs different sizes.

## Replacing The Contact Link

The Contact button is in the top navigation in `src/main.jsx`:

```jsx
<button className="nav-button">Contact</button>
```

Replace it with an anchor for Instagram, email, Shopify, or a custom checkout/contact page.
