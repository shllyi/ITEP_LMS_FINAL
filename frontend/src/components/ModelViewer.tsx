// Native (iOS / Android). The web build uses ModelViewer.web.tsx automatically.
import React, { Component, Suspense, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber/native';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as THREE from 'three';

const MODEL = require('../../assets/models/eduportal.glb');

// The model was exported facing away from the camera, so turn it around.
// If you ever see its back again, change this to 0.
const FRONT = Math.PI;

function Model({ onReady, bump }: { onReady?: () => void; bump: number }) {
  const gltf = useLoader(GLTFLoader, MODEL) as any;
  const group = useRef<THREE.Group>(null);
  const kick = useRef(0);

  // Center the model and scale it to fit, whatever size it was exported at.
  const { scene, scale, offset } = useMemo(() => {
    const s = gltf.scene.clone();
    const box = new THREE.Box3().setFromObject(s);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    return {
      scene: s,
      scale: 2 / Math.max(size.x, size.y, size.z),
      offset: center.multiplyScalar(-1),
    };
  }, [gltf]);

  useEffect(() => {
    onReady?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (bump > 0) kick.current = 1; // hop when the parent bumps
  }, [bump]);

  useFrame(({ clock }, delta) => {
    if (!group.current) return;
    const t = clock.elapsedTime;
    kick.current = Math.max(0, kick.current - delta * 2.2);
    // face the camera and sway gently, so the front is always visible
    group.current.rotation.y = FRONT + Math.sin(t * 1.4) * 0.45 + kick.current * 0.8;
    group.current.position.y = Math.sin(t * 2.2) * 0.06 + Math.sin(kick.current * Math.PI) * 0.35;
  });

  return (
    <group ref={group} scale={scale}>
      <primitive object={scene} position={offset} />
    </group>
  );
}

class Boundary extends Component<{ onError?: () => void; children: React.ReactNode }> {
  componentDidCatch() {
    this.props.onError?.();
  }
  render() {
    return this.props.children;
  }
}

type Props = { onReady?: () => void; onError?: () => void; bump?: number };

export default function ModelViewer({ onReady, onError, bump = 0 }: Props) {
  return (
    <Boundary onError={onError}>
      <Canvas camera={{ position: [0, 0.3, 4], fov: 40 }}>
        <ambientLight intensity={1.4} />
        <directionalLight position={[3, 4, 3]} intensity={2} />
        <Suspense fallback={null}>
          <Model onReady={onReady} bump={bump} />
        </Suspense>
      </Canvas>
    </Boundary>
  );
}