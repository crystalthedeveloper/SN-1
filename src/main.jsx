import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, useGLTF } from '@react-three/drei';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import * as THREE from 'three';
import './styles.css';

const baseShoes = [
  ['Midnight Runner', '$148', 'Textured Shopify variant shoe in a deep midnight finish.', ['7', '8', '9', '10', '11', '12'], 'midnight'],
  ['Beach Court Low', '$172', 'Warm beach colourway with the original model textures preserved.', ['6', '7', '8', '9', '10', '11'], 'beach'],
  ['Street Signal', '$205', 'High-contrast street material variant for bold product drops.', ['8', '9', '10', '11', '12', '13'], 'street'],
  ['Midnight Mono', '$136', 'A clean dark variant for minimal ecommerce product pages.', ['5', '6', '7', '8', '9', '10'], 'midnight'],
  ['Beach Aftermarket', '$220', 'Bright textured shoe variant for limited online releases.', ['7', '8', '9', '10', '11'], 'beach'],
  ['Street Flash', '$164', 'Detailed street texture variant built for interactive browsing.', ['6', '7', '8', '9', '10', '12'], 'street'],
  ['Midnight Lace', '$190', 'Premium midnight material variant with embedded glTF textures.', ['7', '8', '9', '10', '11'], 'midnight'],
  ['Beach Track', '$156', 'Sunlit beach variant using the KHR materials variant mapping.', ['6', '7', '8', '9', '10'], 'beach']
];

const FILTERS = {
  gender: {
    label: 'Gender',
    options: ['Men', 'Women', 'Unisex']
  },
  offers: {
    label: 'Sale & Offers',
    options: ['Sale']
  },
  brand: {
    label: 'Brand',
    options: ['Nike Sportswear', 'Jordan', 'Kobe', 'NikeLab', 'More']
  },
  size: {
    label: 'Size',
    options: ['M 3.5 / W 5', 'M 4 / W 5.5', 'M 4.5 / W 6', 'M 5 / W 6.5', 'M 5.5 / W 7', 'M 6 / W 7.5', 'M 6.5 / W 8', 'M 7 / W 8.5', 'M 7.5 / W 9', 'M 8 / W 9.5', 'M 8.5 / W 10', 'M 9 / W 10.5', 'M 9.5 / W 11', 'M 10 / W 11.5', 'M 10.5 / W 12', 'M 11 / W 12.5', 'M 11.5 / W 13', 'M 12 / W 13.5']
  },
  color: {
    label: 'Color',
    options: ['Midnight', 'Beach', 'Street']
  },
  price: {
    label: 'Price',
    options: ['$0–$74', '$74–$150', '$150–$220', '$220+']
  }
};

const initialFilters = Object.fromEntries(Object.keys(FILTERS).map((key) => [key, []]));
const genders = FILTERS.gender.options;
const brands = FILTERS.brand.options;
const sizeWindows = [
  FILTERS.size.options.slice(0, 7),
  FILTERS.size.options.slice(4, 12),
  FILTERS.size.options.slice(8, 16),
  FILTERS.size.options.slice(10, 18)
];
const variantColors = {
  midnight: 'Midnight',
  beach: 'Beach',
  street: 'Street'
};

const shoes = Array.from({ length: 32 }, (_, index) => {
  const source = baseShoes[index % baseShoes.length];
  const edition = Math.floor(index / baseShoes.length);
  const priceValue = Number(source[1].replace('$', '')) + edition * 12;
  return {
    id: index + 1,
    name: edition ? `${source[0]} ${edition + 1}` : source[0],
    price: `$${priceValue}`,
    priceValue,
    description: source[2],
    sizes: sizeWindows[index % sizeWindows.length],
    variant: source[4],
    color: variantColors[source[4]],
    gender: genders[index % genders.length],
    brand: brands[index % brands.length],
    sale: index % 4 === 0 || index % 7 === 0
  };
});

const reduceMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function getPageSize() {
  return 10;
}

function chunkItems(items, size) {
  const pages = [];
  for (let index = 0; index < items.length; index += size) {
    pages.push(items.slice(index, index + size));
  }
  return pages;
}

function usePageSize() {
  const [pageSize, setPageSize] = useState(() => getPageSize());

  useEffect(() => {
    const update = () => setPageSize(getPageSize());
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return pageSize;
}

function getActiveFilterCount(filters) {
  return Object.values(filters).reduce((total, values) => total + values.length, 0);
}

function matchesPriceRange(price, range) {
  if (range === '$0–$74') return price >= 0 && price < 74;
  if (range === '$74–$150') return price >= 74 && price < 150;
  if (range === '$150–$220') return price >= 150 && price < 220;
  return price >= 220;
}

function filterShoes(products, filters) {
  return products.filter((shoe) => {
    if (filters.gender.length && !filters.gender.includes(shoe.gender)) return false;
    if (filters.offers.length && !shoe.sale) return false;
    if (filters.brand.length && !filters.brand.includes(shoe.brand)) return false;
    if (filters.size.length && !filters.size.some((size) => shoe.sizes.includes(size))) return false;
    if (filters.color.length && !filters.color.includes(shoe.color)) return false;
    if (filters.price.length && !filters.price.some((range) => matchesPriceRange(shoe.priceValue, range))) return false;
    return true;
  });
}

function FilterMenu({ filterKey, filters, openDropdown, setOpenDropdown, toggleFilter }) {
  const config = FILTERS[filterKey];
  const selected = filters[filterKey];
  const isOpen = openDropdown === filterKey;

  return (
    <div className="filter-menu">
      <button
        className={`filter-trigger ${selected.length ? 'has-selection' : ''}`}
        type="button"
        aria-expanded={isOpen}
        onClick={() => setOpenDropdown(isOpen ? null : filterKey)}
      >
        {config.label}
        <span className="filter-arrow">⌄</span>
        {selected.length > 0 && <span>{selected.length}</span>}
      </button>
      {isOpen && (
        <div className="filter-popover">
          {config.options.map((option) => (
            <label className="filter-option" key={option}>
              <input
                type="checkbox"
                checked={selected.includes(option)}
                onChange={() => toggleFilter(filterKey, option)}
              />
              <span>{option}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

function FilterList({ filters, toggleFilter }) {
  return (
    <div className="filter-list">
      {Object.entries(FILTERS).map(([key, config]) => (
        <section className="filter-section" key={key}>
          <h3>{config.label}</h3>
          <div className="filter-section-options">
            {config.options.map((option) => (
              <label className="filter-option" key={option}>
                <input
                  type="checkbox"
                  checked={filters[key].includes(option)}
                  onChange={() => toggleFilter(key, option)}
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function useVisibleCells(viewportRef, loadedShoes) {
  const cellRefs = useRef(new Map());
  const [layouts, setLayouts] = useState(new Map());
  const [visibleIds, setVisibleIds] = useState(new Set());

  const setCellRef = useCallback((id) => (node) => {
    if (node) {
      cellRefs.current.set(id, node);
    } else {
      cellRefs.current.delete(id);
    }
  }, []);

  const measureCells = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const rootRect = viewport.getBoundingClientRect();
    const next = new Map();
    const nextVisible = new Set();
    const margin = 160;

    cellRefs.current.forEach((node, id) => {
      const rect = node.getBoundingClientRect();
      next.set(id, {
        x: rect.left - rootRect.left,
        y: rect.top - rootRect.top,
        width: rect.width,
        height: rect.height
      });
      if (
        rect.bottom >= rootRect.top - margin &&
        rect.top <= rootRect.bottom + margin &&
        rect.right >= rootRect.left - margin &&
        rect.left <= rootRect.right + margin
      ) {
        nextVisible.add(id);
      }
    });

    setLayouts(next);
    setVisibleIds(nextVisible);
  }, [viewportRef]);

  useEffect(() => {
    measureCells();
    window.addEventListener('resize', measureCells);

    return () => {
      window.removeEventListener('resize', measureCells);
    };
  }, [loadedShoes.length, measureCells, viewportRef]);

  return { layouts, visibleIds, setCellRef, measureCells };
}

function ShopifyVariantShoe({ variant }) {
  const gltf = useGLTF('/models/MaterialsVariantsShoe.glb');
  const model = useMemo(() => {
    const clonedScene = clone(gltf.scene);
    const box = new THREE.Box3().setFromObject(clonedScene);
    const center = box.getCenter(new THREE.Vector3());
    clonedScene.position.sub(center);
    clonedScene.traverse((child) => {
      if (!child.isMesh) return;
      child.castShadow = false;
      child.receiveShadow = false;
      child.frustumCulled = false;
    });
    return clonedScene;
  }, [gltf.scene]);

  useEffect(() => {
    const variantIndex = gltf.userData.gltfExtensions?.KHR_materials_variants?.variants
      ?.findIndex((entry) => entry.name === variant);

    if (variantIndex === undefined || variantIndex < 0) return undefined;

    let cancelled = false;
    const assignments = [];

    model.traverse((child) => {
      if (!child.isMesh) return;
      const mappings = child.userData.gltfExtensions?.KHR_materials_variants?.mappings;
      const mapping = mappings?.find((entry) => entry.variants.includes(variantIndex));
      if (!mapping) return;

      assignments.push(
        gltf.parser.getDependency('material', mapping.material).then((material) => {
          if (!cancelled) child.material = material;
        })
      );
    });

    Promise.all(assignments);
    return () => {
      cancelled = true;
    };
  }, [gltf.parser, gltf.userData.gltfExtensions, model, variant]);

  return (
    <primitive
      object={model}
      scale={6.25}
      rotation={[0.02, Math.PI, 0]}
      position={[0, -0.18, 0]}
    />
  );
}

function ElementShoe({ shoe, layout, onSelect, onInteractionChange, onFocusShoe, controlInput }) {
  const group = useRef();
  const { size, viewport } = useThree();
  const [hovered, setHovered] = useState(false);
  const drag = useRef({ active: false, moved: false, startX: 0, startY: 0, lastX: 0, lastY: 0, idleAt: 0 });
  const rotation = useRef({ x: 0.1, y: -0.35 });
  const prefersReducedMotion = useMemo(reduceMotion, []);

  const scale = Math.min(layout.width, layout.height) / 162;
  const x = ((layout.x + layout.width / 2) / size.width - 0.5) * viewport.width;
  const y = -(((layout.y + layout.height / 2) / size.height - 0.5) * viewport.height);

  useEffect(() => {
    if (!controlInput || controlInput.shoeId !== shoe.id) return;
    rotation.current.y += controlInput.dx * 0.02;
    rotation.current.x = THREE.MathUtils.clamp(rotation.current.x + controlInput.dy * 0.016, -0.9, 0.9);
    drag.current.idleAt = stateTime();
  }, [controlInput, shoe.id]);

  useFrame((state, delta) => {
    if (!group.current) return;

    const cursorX = hovered && !prefersReducedMotion ? state.pointer.x * 0.1 : 0;
    const cursorY = hovered && !prefersReducedMotion ? state.pointer.y * 0.08 : 0;
    const inactive = state.clock.elapsedTime - drag.current.idleAt > 1.1;

    if (!drag.current.active && inactive) {
      rotation.current.x = THREE.MathUtils.lerp(rotation.current.x, 0.1, 0.025);
      rotation.current.y = THREE.MathUtils.lerp(rotation.current.y, -0.35, 0.025);
    }

    group.current.position.x = THREE.MathUtils.lerp(group.current.position.x, x, 0.22);
    group.current.position.y = THREE.MathUtils.lerp(group.current.position.y, y + (hovered && !prefersReducedMotion ? 0.12 : 0), 0.18);
    group.current.scale.setScalar(THREE.MathUtils.lerp(group.current.scale.x, scale * (hovered ? 1.08 : 1), 0.14));
    group.current.rotation.x = THREE.MathUtils.damp(group.current.rotation.x, rotation.current.x - cursorY, 9, delta);
    group.current.rotation.y = THREE.MathUtils.damp(group.current.rotation.y, rotation.current.y + cursorX, 9, delta);
    group.current.rotation.z = THREE.MathUtils.damp(group.current.rotation.z, hovered ? -0.04 : 0, 8, delta);
  });

  return (
    <group
      ref={group}
      position={[x, y, 0]}
      scale={scale}
      onPointerOver={(event) => {
        event.stopPropagation();
        setHovered(true);
        onFocusShoe(shoe.id);
        document.body.classList.add('is-pointing');
      }}
      onPointerOut={() => {
        setHovered(false);
        drag.current.active = false;
        document.body.classList.remove('is-pointing', 'is-dragging');
        onInteractionChange(false);
      }}
      onPointerDown={(event) => {
        event.stopPropagation();
        event.target.setPointerCapture(event.pointerId);
        onFocusShoe(shoe.id);
        drag.current = {
          active: true,
          moved: false,
          startX: event.clientX,
          startY: event.clientY,
          lastX: event.clientX,
          lastY: event.clientY,
          idleAt: stateTime()
        };
        document.body.classList.add('is-dragging');
        onInteractionChange(true);
      }}
      onPointerMove={(event) => {
        if (!drag.current.active) return;
        event.stopPropagation();
        const dx = event.clientX - drag.current.lastX;
        const dy = event.clientY - drag.current.lastY;
        if (
          Math.abs(dx) + Math.abs(dy) > 3 ||
          Math.abs(event.clientX - drag.current.startX) + Math.abs(event.clientY - drag.current.startY) > 6
        ) {
          drag.current.moved = true;
        }
        rotation.current.y += dx * 0.018;
        rotation.current.x = THREE.MathUtils.clamp(rotation.current.x + dy * 0.014, -0.9, 0.9);
        drag.current.lastX = event.clientX;
        drag.current.lastY = event.clientY;
        drag.current.idleAt = stateTime();
      }}
      onPointerUp={(event) => {
        event.stopPropagation();
        event.target.releasePointerCapture(event.pointerId);
        const totalMove = Math.abs(event.clientX - drag.current.startX) + Math.abs(event.clientY - drag.current.startY);
        const wasDrag = drag.current.moved || totalMove > 6;
        drag.current.active = false;
        drag.current.idleAt = stateTime();
        document.body.classList.remove('is-dragging');
        onInteractionChange(false);
        if (!wasDrag) {
          onFocusShoe(shoe.id);
          onSelect(shoe, true);
        }
      }}
      onClick={(event) => event.stopPropagation()}
    >
      <mesh position={[0, 0.16, -0.22]}>
        <boxGeometry args={[3.15, 2.35, 0.08]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <ShopifyVariantShoe variant={shoe.variant} />
    </group>
  );
}

function stateTime() {
  return performance.now() / 1000;
}

function SharedShoeCanvas({ shoesToRender, layouts, visibleIds, onSelect, onInteractionChange, onFocusShoe, controlInput }) {
  const visibleShoes = shoesToRender.filter((shoe) => visibleIds.has(shoe.id) && layouts.has(shoe.id));

  return (
    <Canvas
      orthographic
      camera={{ position: [0, 0, 10], zoom: 86, near: 0.1, far: 100 }}
      dpr={[1, 1.45]}
      frameloop="always"
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
    >
      <ambientLight intensity={1.2} />
      <directionalLight position={[3, 4, 5]} intensity={3.4} color="#ffffff" />
      <pointLight position={[-3, 2, 4]} intensity={1.8} color="#e50914" />
      <Suspense fallback={null}>
        {visibleShoes.map((shoe) => (
          <ElementShoe
            key={shoe.id}
            shoe={shoe}
            layout={layouts.get(shoe.id)}
            onSelect={onSelect}
            onInteractionChange={onInteractionChange}
            onFocusShoe={onFocusShoe}
            controlInput={controlInput}
          />
        ))}
        <Environment preset="city" />
      </Suspense>
    </Canvas>
  );
}

function ProductPanel({ shoe, onClose }) {
  if (!shoe) return null;

  return (
    <div className="panel-shell" onClick={onClose}>
      <aside className="product-panel" onClick={(event) => event.stopPropagation()}>
        <button className="close-button" aria-label="Close shoe details" onClick={onClose}>×</button>
        <h2>{shoe.name}</h2>
        <p className="modal-price">{shoe.price}</p>
        <p className="modal-copy">{shoe.description}</p>
        <div className="size-list" aria-label="Available sizes">
          {shoe.sizes.map((size) => <button key={size}>{size}</button>)}
        </div>
        <div className="panel-actions">
          <button className="button primary">Buy Now</button>
          <button className="button secondary">DM to Order</button>
        </div>
      </aside>
    </div>
  );
}

function ProductCell({ shoe, setCellRef, isSelected }) {
  return (
    <article className={`product-cell ${isSelected ? 'is-selected' : ''}`} ref={setCellRef(shoe.id)} data-shoe-id={shoe.id}>
      <div className="shoe-hit-area" aria-hidden="true" />
    </article>
  );
}

function SelectionDots({ shoesToRender, layouts, visibleIds, selectedShoeId, onSelect }) {
  return (
    <div className="selection-layer" aria-label="Shoe selection">
      {shoesToRender
        .filter((shoe) => visibleIds.has(shoe.id) && layouts.has(shoe.id))
        .map((shoe) => {
          const layout = layouts.get(shoe.id);
          return (
            <button
              key={shoe.id}
              className="selection-dot"
              type="button"
              style={{ left: layout.x + 14, top: layout.y + 14 }}
              aria-label={`Select ${shoe.name}`}
              aria-pressed={selectedShoeId === shoe.id}
              onClick={(event) => {
                event.stopPropagation();
                onSelect(shoe, false);
              }}
            />
          );
        })}
    </div>
  );
}

function MovementControl({ targetShoeId, onRotateStart, onRotate, onRotateEnd }) {
  const drag = useRef({ active: false, lastX: 0, lastY: 0 });

  const endDrag = useCallback(() => {
    drag.current.active = false;
    document.body.classList.remove('is-dragging');
    onRotateEnd();
  }, [onRotateEnd]);

  return (
    <div className="movement-control" aria-label="Drag to rotate shoe">
      <button
        className="joystick"
        type="button"
        disabled={!targetShoeId}
        onPointerDown={(event) => {
          if (!targetShoeId) return;
          event.preventDefault();
          event.stopPropagation();
          event.currentTarget.setPointerCapture(event.pointerId);
          drag.current = { active: true, lastX: event.clientX, lastY: event.clientY };
          document.body.classList.add('is-dragging');
          onRotateStart();
        }}
        onPointerMove={(event) => {
          if (!drag.current.active || !targetShoeId) return;
          event.preventDefault();
          event.stopPropagation();
          const dx = event.clientX - drag.current.lastX;
          const dy = event.clientY - drag.current.lastY;
          drag.current.lastX = event.clientX;
          drag.current.lastY = event.clientY;
          onRotate(dx, dy);
        }}
        onPointerUp={(event) => {
          event.preventDefault();
          event.stopPropagation();
          event.currentTarget.releasePointerCapture(event.pointerId);
          endDrag();
        }}
        onPointerCancel={endDrag}
      >
        <span className="joystick-ring" />
        <span className="joystick-dot" />
        <span className="joy-arrow joy-arrow-up">↑</span>
        <span className="joy-arrow joy-arrow-right">→</span>
        <span className="joy-arrow joy-arrow-down">↓</span>
        <span className="joy-arrow joy-arrow-left">←</span>
      </button>
      <span>Drag to Rotate</span>
    </div>
  );
}

function App() {
  const viewportRef = useRef(null);
  const filterShellRef = useRef(null);
  const isDraggingShoe = useRef(false);
  const wheelLock = useRef(false);
  const snapTimer = useRef(null);
  const pageSize = usePageSize();
  const [selectedShoe, setSelectedShoe] = useState(null);
  const [selectedShoeId, setSelectedShoeId] = useState(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [loadedGroups, setLoadedGroups] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [activeShoeId, setActiveShoeId] = useState(null);
  const [controlInput, setControlInput] = useState(null);
  const [filters, setFilters] = useState(initialFilters);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const filteredShoes = useMemo(() => filterShoes(shoes, filters), [filters]);
  const activeFilterCount = getActiveFilterCount(filters);
  const loadedCount = Math.min(loadedGroups * pageSize, filteredShoes.length);
  const loadedShoes = filteredShoes.slice(0, loadedCount);
  const pages = useMemo(() => chunkItems(loadedShoes, pageSize), [loadedShoes, pageSize]);
  const maxLoadedPage = Math.max(0, pages.length - 1);
  const maxAvailablePage = Math.max(0, Math.ceil(filteredShoes.length / pageSize) - 1);
  const { layouts, visibleIds, setCellRef, measureCells } = useVisibleCells(viewportRef, loadedShoes);
  const controlTargetId = selectedShoeId || null;

  const selectShoe = useCallback((shoe, openPanel = false) => {
    setSelectedShoeId(shoe.id);
    setActiveShoeId(shoe.id);
    if (openPanel) setSelectedShoe(shoe);
  }, []);

  const toggleFilter = useCallback((filterKey, option) => {
    setFilters((current) => {
      const selected = current[filterKey];
      const nextSelected = selected.includes(option)
        ? selected.filter((value) => value !== option)
        : [...selected, option];
      return { ...current, [filterKey]: nextSelected };
    });
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(initialFilters);
    setOpenDropdown(null);
    setIsFilterDrawerOpen(false);
  }, []);

  const trackTransition = useCallback(() => {
    const startedAt = performance.now();
    const tick = () => {
      measureCells();
      if (performance.now() - startedAt < 760) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [measureCells]);

  const navigateBy = useCallback((direction) => {
    if (isDraggingShoe.current || isLoading || wheelLock.current || selectedShoe || !filteredShoes.length) return;

    const nextPage = currentPage + direction;
    if (nextPage < 0) return;

    wheelLock.current = true;
    window.setTimeout(() => {
      wheelLock.current = false;
    }, 760);

    if (nextPage > maxLoadedPage && nextPage <= maxAvailablePage) {
      setIsLoading(true);
      window.setTimeout(() => {
        setLoadedGroups((count) => Math.min(count + 1, Math.ceil(filteredShoes.length / pageSize)));
        setCurrentPage(nextPage);
        setIsLoading(false);
        trackTransition();
      }, 360);
      return;
    }

    setCurrentPage(Math.min(nextPage, maxLoadedPage));
    trackTransition();
  }, [currentPage, filteredShoes.length, isLoading, maxAvailablePage, maxLoadedPage, pageSize, selectedShoe, trackTransition]);

  useEffect(() => {
    setCurrentPage(0);
    setLoadedGroups(1);
    setSelectedShoe(null);
    setSelectedShoeId(null);
    setActiveShoeId(null);
    requestAnimationFrame(measureCells);
  }, [filters, measureCells]);

  useEffect(() => {
    if (!loadedShoes.length) {
      setSelectedShoeId(null);
      return;
    }
    if (!loadedShoes.some((shoe) => shoe.id === selectedShoeId)) {
      setSelectedShoeId(loadedShoes[0].id);
      setActiveShoeId(loadedShoes[0].id);
    }
  }, [loadedShoes, selectedShoeId]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, maxLoadedPage));
    requestAnimationFrame(measureCells);
  }, [maxLoadedPage, measureCells]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return undefined;

    const handleWheel = (event) => {
      event.preventDefault();
      if (Math.abs(event.deltaY) < 12 && Math.abs(event.deltaX) < 12) return;
      const dominantDelta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      navigateBy(dominantDelta > 0 ? 1 : -1);
    };

    viewport.addEventListener('wheel', handleWheel, { passive: false });
    return () => viewport.removeEventListener('wheel', handleWheel);
  }, [navigateBy]);

  useEffect(() => {
    const handleKey = (event) => {
      if (event.key === 'ArrowRight' || event.key === 'PageDown') navigateBy(1);
      if (event.key === 'ArrowLeft' || event.key === 'PageUp') navigateBy(-1);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [navigateBy]);

  useEffect(() => {
    return () => window.clearTimeout(snapTimer.current);
  }, []);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!filterShellRef.current?.contains(event.target)) {
        setOpenDropdown(null);
        setIsFilterDrawerOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setOpenDropdown(null);
        setIsFilterDrawerOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <main className="app-shell">
      <nav className="nav" aria-label="Main navigation">
        <a className="brand" href="#" aria-label="SN-1 home">SN-1</a>
        <div className="filter-shell" ref={filterShellRef}>
          <div className="desktop-filters">
            {Object.keys(FILTERS).map((filterKey) => (
              <FilterMenu
                key={filterKey}
                filterKey={filterKey}
                filters={filters}
                openDropdown={openDropdown}
                setOpenDropdown={setOpenDropdown}
                toggleFilter={toggleFilter}
              />
            ))}
            <button
              className="clear-filters"
              type="button"
              disabled={!activeFilterCount}
              onClick={clearFilters}
            >
              Clear
              {activeFilterCount > 0 && <span>{activeFilterCount}</span>}
            </button>
          </div>
          <button
            className="mobile-filter-button"
            type="button"
            aria-expanded={isFilterDrawerOpen}
            onClick={() => setIsFilterDrawerOpen(true)}
          >
            Filters
            {activeFilterCount > 0 && <span>{activeFilterCount}</span>}
          </button>
          {isFilterDrawerOpen && (
            <div className="filter-drawer" role="dialog" aria-label="Shoe filters">
              <div className="drawer-header">
                <strong>Filters</strong>
                <button type="button" onClick={() => setIsFilterDrawerOpen(false)}>×</button>
              </div>
              <FilterList filters={filters} toggleFilter={toggleFilter} />
              <div className="drawer-actions">
                <button type="button" onClick={clearFilters} disabled={!activeFilterCount}>Clear all</button>
                <button type="button" onClick={() => setIsFilterDrawerOpen(false)}>Apply</button>
              </div>
            </div>
          )}
        </div>
        <button className="nav-button">Contact</button>
      </nav>

      <section className="grid-viewport" ref={viewportRef} id="collection" aria-label="Interactive 3D sneaker collection">
        <div className="canvas-layer">
          <SharedShoeCanvas
            shoesToRender={loadedShoes}
            layouts={layouts}
            visibleIds={visibleIds}
            onSelect={selectShoe}
            onInteractionChange={(active) => {
              isDraggingShoe.current = active;
            }}
            onFocusShoe={setActiveShoeId}
            controlInput={controlInput}
          />
        </div>
        <SelectionDots
          shoesToRender={loadedShoes}
          layouts={layouts}
          visibleIds={visibleIds}
          selectedShoeId={selectedShoeId}
          onSelect={selectShoe}
        />
        {filteredShoes.length ? (
          <div className="snap-rail" style={{ transform: `translate3d(${-currentPage * 100}%, 0, 0)` }}>
            {pages.map((pageShoes, pageIndex) => (
              <div className="product-grid" key={pageIndex} aria-hidden={pageIndex !== currentPage}>
                {pageShoes.map((shoe) => (
                  <ProductCell
                    key={shoe.id}
                    shoe={shoe}
                    setCellRef={setCellRef}
                    isSelected={selectedShoeId === shoe.id}
                  />
                ))}
              </div>
            ))}
          </div>
        ) : (
          <div className="no-results">
            <h2>No shoes found</h2>
            <button type="button" onClick={clearFilters}>Clear all filters</button>
          </div>
        )}
        {filteredShoes.length > 0 && (
          <>
            <MovementControl
              targetShoeId={controlTargetId}
              onRotateStart={() => {
                isDraggingShoe.current = true;
              }}
              onRotate={(dx, dy) => {
                if (!controlTargetId) return;
                setControlInput({ shoeId: controlTargetId, dx, dy, tick: performance.now() });
              }}
              onRotateEnd={() => {
                isDraggingShoe.current = false;
              }}
            />
            <div className="rotate-hint">Swipe to Rotate</div>
            <div className="gallery-controls" aria-label="Gallery navigation">
              <button onClick={() => navigateBy(-1)} disabled={currentPage === 0}>Prev</button>
              <span>{currentPage + 1} / {maxAvailablePage + 1}</span>
              <button onClick={() => navigateBy(1)} disabled={currentPage >= maxAvailablePage}>Next</button>
            </div>
          </>
        )}
        {isLoading && <div className="loading-indicator">Preparing next drop</div>}
      </section>

      <ProductPanel shoe={selectedShoe} onClose={() => setSelectedShoe(null)} />
    </main>
  );
}

useGLTF.preload('/models/MaterialsVariantsShoe.glb');

createRoot(document.getElementById('root')).render(<App />);
