import { Suspense, useLayoutEffect, useMemo, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { useLoader } from '@react-three/fiber';
import * as THREE from 'three';

interface ItemModel3DViewerProps {
  modelUrl: string;
  height?: number;
}

const ObjModel = ({ url }: { url: string }) => {
  const obj = useLoader(OBJLoader, url);
  const groupRef = useRef<THREE.Group>(null);
  const model = useMemo(() => obj.clone(true), [obj]);

  useLayoutEffect(() => {
    if (!groupRef.current) return;
    const box = new THREE.Box3().setFromObject(groupRef.current);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = maxDim > 0 ? 2 / maxDim : 1;

    groupRef.current.scale.setScalar(scale);

    const scaledBox = new THREE.Box3().setFromObject(groupRef.current);
    const scaledCenter = scaledBox.getCenter(new THREE.Vector3());
    const scaledMin = scaledBox.min;

    groupRef.current.position.x -= scaledCenter.x;
    groupRef.current.position.z -= scaledCenter.z;
    groupRef.current.position.y -= scaledMin.y;
  }, [model]);

  return (
    <group ref={groupRef}>
      <primitive object={model} />
    </group>
  );
};

const Scene = ({ modelUrl }: { modelUrl: string }) => (
  <>
    <ambientLight intensity={0.6} />
    <directionalLight position={[3, 5, 4]} intensity={1.2} />
    <directionalLight position={[-2, 3, -2]} intensity={0.3} />
    <hemisphereLight args={['#aadcff', '#ffe8a0', 0.3]} />

    <ObjModel url={modelUrl} />

    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <circleGeometry args={[1.2, 64]} />
      <meshStandardMaterial color="#b8b8b8" roughness={0.85} />
    </mesh>

    <OrbitControls
      enablePan={false}
      enableZoom
      minDistance={2}
      maxDistance={10}
      minPolarAngle={Math.PI / 8}
      maxPolarAngle={Math.PI / 2}
      target={[0, 0.8, 0]}
      autoRotate
      autoRotateSpeed={1.5}
    />
  </>
);

const LoadingFallback = () => (
  <div className="flex items-center justify-center w-full h-full">
    <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
  </div>
);

export const ItemModel3DViewer = ({ modelUrl, height = 300 }: ItemModel3DViewerProps) => {
  return (
    <div
      style={{
        width: '100%',
        height,
        borderRadius: 8,
        overflow: 'hidden',
        background: '#e8eef4',
      }}
    >
      <Canvas
        camera={{ position: [0, 1, 5], fov: 32 }}
        shadows
        gl={{ antialias: true, alpha: false }}
        style={{ width: '100%', height: '100%' }}
      >
        <color attach="background" args={['#e8eef4']} />
        <fog attach="fog" args={['#e8eef4', 10, 20]} />
        <Suspense fallback={null}>
          <Scene modelUrl={modelUrl} />
        </Suspense>
      </Canvas>
    </div>
  );
};
