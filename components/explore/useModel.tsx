"use client";

import { Component, useEffect, useMemo, type ReactNode } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { MODELS, type ModelName } from "./models";

/**
 * Rewrites a palette-atlas texture, swapping flat swatches for new colours.
 *
 * The Poly Pizza models share a 128x128 atlas of flat colour blocks, so a mesh
 * region samples exactly one swatch. Repainting the swatch is therefore the
 * only way to recolour a part without tinting (which multiplies, and muddies)
 * or dropping the map entirely (which flattens the whole model to one colour).
 */
function recolourAtlas(source: THREE.Texture, swatches: Record<string, string>) {
  const image = source.image as CanvasImageSource & { width: number; height: number };
  if (!image?.width) return null;

  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(image, 0, 0);

  const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const targets = Object.entries(swatches).map(([from, to]) => ({
    from: new THREE.Color(from),
    to: new THREE.Color(to),
  }));

  for (let i = 0; i < frame.data.length; i += 4) {
    const r = frame.data[i] / 255;
    const g = frame.data[i + 1] / 255;
    const b = frame.data[i + 2] / 255;
    let best: (typeof targets)[number] | null = null;
    let bestDistance = Infinity;
    for (const target of targets) {
      const d =
        (r - target.from.r) ** 2 + (g - target.from.g) ** 2 + (b - target.from.b) ** 2;
      if (d < bestDistance) {
        bestDistance = d;
        best = target;
      }
    }
    // ~0.11 in linear distance: close enough to catch a swatch, tight enough
    // to leave the antialiased block borders alone
    if (best && bestDistance < 0.012) {
      frame.data[i] = best.to.r * 255;
      frame.data[i + 1] = best.to.g * 255;
      frame.data[i + 2] = best.to.b * 255;
    }
  }
  ctx.putImageData(frame, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  // glTF textures are not flipped; CanvasTexture defaults the other way
  texture.flipY = source.flipY;
  texture.colorSpace = source.colorSpace;
  texture.wrapS = source.wrapS;
  texture.wrapT = source.wrapT;
  texture.magFilter = source.magFilter;
  texture.minFilter = source.minFilter;
  return texture;
}

export type ModelOptions = {
  /** recolour untextured materials, keyed by material name */
  materials?: Record<string, string>;
  /** repaint palette-atlas swatches, keyed by the swatch's source colour */
  swatches?: Record<string, string>;
};

/**
 * Loads a glTF and returns a private copy of it.
 *
 * Two things matter here. First, `useGLTF` caches one scene per URL, so any
 * model used more than once must be cloned or the instances fight over a
 * single transform. Second, imported materials are baked and won't follow the
 * room's light/dark palette, so `tints` lets a caller recolour them by
 * material name — cloning the material first, since the cached original is
 * shared with every other instance.
 */
export function useModel(name: ModelName, options?: ModelOptions) {
  const { scene } = useGLTF(MODELS[name]);

  // options is usually an inline object, so key the memo on its contents
  // rather than its identity or the model re-clones every render
  const optionsKey = options ? JSON.stringify(options) : "";

  const model = useMemo(() => {
    const copy = scene.clone(true);
    const owned: THREE.Material[] = [];
    const ownedTextures: THREE.Texture[] = [];
    const repainted = new Map<THREE.Texture, THREE.Texture>();

    copy.traverse((node) => {
      const mesh = node as THREE.Mesh;
      if (!mesh.isMesh) return;

      const sources = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      const replaced = sources.map((source) => {
        const material = (source as THREE.MeshStandardMaterial).clone();

        const tint = options?.materials?.[source.name];
        if (tint) material.color.set(tint);

        if (options?.swatches && material.map) {
          // one repaint per source texture, however many meshes share it
          let next = repainted.get(material.map);
          if (!next) {
            const built = recolourAtlas(material.map, options.swatches);
            if (built) {
              repainted.set(material.map, built);
              ownedTextures.push(built);
              next = built;
            }
          }
          if (next) material.map = next;
        }

        // asset packs vary wildly; keep them matte so they sit with the room
        if ("roughness" in material) material.roughness = Math.max(material.roughness, 0.6);
        owned.push(material);
        return material;
      });

      mesh.material = Array.isArray(mesh.material) ? replaced : replaced[0];
    });

    copy.userData.ownedMaterials = owned;
    copy.userData.ownedTextures = ownedTextures;
    return copy;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene, optionsKey]);

  useEffect(() => {
    return () => {
      (model.userData.ownedMaterials as THREE.Material[] | undefined)?.forEach((m) => m.dispose());
      (model.userData.ownedTextures as THREE.Texture[] | undefined)?.forEach((t) => t.dispose());
    };
  }, [model]);

  return model;
}

export function preloadModel(name: ModelName) {
  useGLTF.preload(MODELS[name]);
}

/**
 * A model that fails to load throws during render, which would take the whole
 * canvas down. This keeps the rest of the room alive instead.
 */
export class ModelBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.warn("[explore] a model failed to load", error);
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}
