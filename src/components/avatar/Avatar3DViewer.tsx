import { Suspense, useLayoutEffect, useMemo, useRef, useEffect, useState } from 'react';
import { Canvas, useLoader } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import * as THREE from 'three';

interface EquippedItem {
  image_url: string;
  name?: string;
  model_url?: string | null;
}

interface Avatar3DViewerProps {
  equippedItems: EquippedItem[];
}

const MODEL_PATH = '/models/roblox-avatar.glb';

const ObjEquippedItem = ({ url }: { url: string }) => {
  const obj = useLoader(OBJLoader, url);
  const model = useMemo(() => obj.clone(true), [obj]);

  return <primitive object={model} />;
};

const EquippedItemOverlay = ({ imageUrl, modelHeight }: { imageUrl: string; modelHeight: number }) => {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const [aspect, setAspect] = useState(1);

  useEffect(() => {
    const loader = new THREE.TextureLoader();
    loader.crossOrigin = 'anonymous';
    loader.load(imageUrl, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.needsUpdate = true;
      const img = tex.image as HTMLImageElement;
      if (img.width && img.height) {
        setAspect(img.width / img.height);
      }
      setTexture(tex);
    });
  }, [imageUrl]);

  if (!texture) return null;

  const height = modelHeight * 0.85;
  const width = height * aspect;

  return (
    <mesh position={[0, modelHeight * 0.45, 0.01]}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial map={texture} transparent depthTest={true} depthWrite={false} />
    </mesh>
  );
};

const AvatarModel = ({ equippedItems }: { equippedItems: EquippedItem[] }) => {
  const { scene } = useGLTF(MODEL_PATH);
  const groupRef = useRef<THREE.Group>(null);
  const [modelHeight, setModelHeight] = useState(1);

  const model = useMemo(() => scene.clone(true), [scene]);

  useLayoutEffect(() => {
    if (!groupRef.current) return;

    const box = new THREE.Box3().setFromObject(groupRef.current);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const min = box.min;

    groupRef.current.position.x -= center.x;
    groupRef.current.position.z -= center.z;
    groupRef.current.position.y -= min.y;

    setModelHeight(size.y);
  }, [model]);

  const objItems = equippedItems.filter(i => i.model_url);
  const pngItems = equippedItems.filter(i => !i.model_url);

  return (
    <group ref={groupRef}>
      <primitive object={model} scale={0.4} />
      {objItems.map((item, i) => (
        <Suspense key={`obj-${item.model_url}-${i}`} fallback={null}>
          <ObjEquippedItem url={item.model_url!} />
        </Suspense>
      ))}
      {pngItems.map((item, i) => (
        <EquippedItemOverlay key={`png-${item.image_url}-${i}`} imageUrl={item.image_url} modelHeight={modelHeight} />
      ))}
    </group>
  );
};

useGLTF.preload(MODEL_PATH);

const Scene = ({ equippedItems }: { equippedItems: EquippedItem[] }) => (
  <>
    <ambientLight intensity={0.5} />
    <directionalLight
      position={[3, 5, 4]}
      intensity={1.4}
      castShadow
      shadow-mapSize-width={1024}
      shadow-mapSize-height={1024}
    />
    <directionalLight position={[-2, 3, -2]} intensity={0.3} />
    <hemisphereLight args={['#aadcff', '#ffe8a0', 0.25]} />

    <AvatarModel equippedItems={equippedItems} />

    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <circleGeometry args={[0.8, 64]} />
      <meshStandardMaterial color="#b8b8b8" roughness={0.85} />
    </mesh>

    <gridHelper args={[2, 12, '#cccccc', '#e0e0e0']} position={[0, 0.01, 0]} />

    <OrbitControls
      enablePan={false}
      enableZoom
      minDistance={2}
      maxDistance={8}
      minPolarAngle={Math.PI / 8}
      maxPolarAngle={Math.PI / 2}
      target={[0, 0.4, 0]}
      autoRotate
      autoRotateSpeed={1.2}
    />
  </>
);

export const Avatar3DViewer = ({ equippedItems }: Avatar3DViewerProps) => {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        minHeight: 350,
        borderRadius: 4,
        overflow: 'hidden',
        background: '#e8eef4',
      }}
    >
      <Canvas
        camera={{ position: [0, 0.5, 5], fov: 28 }}
        shadows
        gl={{ antialias: true, alpha: false }}
        style={{ width: '100%', height: '100%' }}
      >
        <color attach="background" args={['#e8eef4']} />
        <fog attach="fog" args={['#e8eef4', 10, 20]} />
        <Suspense fallback={null}>
          <Scene equippedItems={equippedItems} />
        </Suspense>
      </Canvas>
    </div>
  );
};
