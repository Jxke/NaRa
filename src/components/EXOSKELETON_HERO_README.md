# Exoskeleton Hero

Portable Three.js viewer for the NaRa exoskeleton GLBs.

## Files

- `ExoskeletonHero.astro` renders the container and initializes the scene.
- `../lib/createExoskeletonHero.js` contains the reusable Three.js logic.
- `/public/models/Exoskeleton_L.glb`, `/public/models/Exoskeleton_R.glb`, and `/public/models/Components.glb` are the model assets.

## Astro Usage

```astro
---
import ExoskeletonHero from "../components/ExoskeletonHero.astro";
---

<ExoskeletonHero />
```

The component fills its parent container. Set the parent width, height, or aspect ratio in CSS.

## Plain JS Usage

```js
import { createExoskeletonHero } from "./createExoskeletonHero.js";

const viewer = createExoskeletonHero(document.querySelector("#hero-3d"), {
  leftModel: "/models/Exoskeleton_L.glb",
  rightModel: "/models/Exoskeleton_R.glb",
  componentsModel: "/models/Components.glb",
});

// Later, if the page unmounts:
viewer.dispose();
```

The initializer depends on `three` and `three/examples/jsm/loaders/GLTFLoader.js`.
