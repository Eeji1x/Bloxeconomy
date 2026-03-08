import { Suspense, useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { DEFAULT_AVATAR_URL } from '@/lib/constants';

interface EquippedItem {
  image_url: string;
  name?: string;
}

interface Avatar3DViewerProps {
  equippedItems: EquippedItem[];
}

const TexturePlane = ({ imageUrl, zOffset = 0 }: { imageUrl: string; zOffset?: number }) => {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const [dims, setDims] = useState<{ w: number; h: number }>({ w: 1, h: 1 });

  useEffect(() => {
    const loader = new THREE.TextureLoader();
    loader.crossOrigin = 'anonymous';
    loader.load(imageUrl, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.needsUpdate = true;
      const img = tex.image as HTMLImageElement;
      if (img.width && img.height) {
        const aspect = img.width / img.height;
        const height = 2.4;
        setDims({ w: height * aspect, h: height });
      }
      setTexture(tex);
    });
  }, [imageUrl]);

  if (!texture) return null;

  return (
    <group position={[0, dims.h / 2, zOffset]}>
      {/* Front */}
      <mesh>
        <planeGeometry args={[dims.w, dims.h]} />
        <meshBasicMaterial map={texture} transparent alphaTest={0.1} depthWrite side={THREE.FrontSide} />
      </mesh>
      {/* Back (flipped so it looks the same) */}
      <mesh rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[dims.w, dims.h]} />
        <meshBasicMaterial map={texture} transparent alphaTest={0.1} depthWrite side={THREE.FrontSide} />
      </mesh>
    </group>
  );
};

const Scene = ({ equippedItems }: { equippedItems: EquippedItem[] }) => (
  <>
    <ambientLight intensity={0.8} />
    <directionalLight position={[3, 5, 4]} intensity={0.6} />

    {/* Base avatar */}
    <TexturePlane imageUrl={DEFAULT_AVATAR_URL} zOffset={0} />

    {/* Equipped items layered in front */}
    {equippedItems.map((item, i) => (
      <TexturePlane key={`${item.image_url}-${i}`} imageUrl={item.image_url} zOffset={0.01 * (i + 1)} />
    ))}

    {/* Ground circle */}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <circleGeometry args={[1.2, 64]} />
      <meshStandardMaterial color="#b8b8b8" roughness={0.85} />
    </mesh>

    <OrbitControls
      enablePan={false}
      enableZoom
      minDistance={2}
      maxDistance={8}
      minPolarAngle={Math.PI / 8}
      maxPolarAngle={Math.PI / 2}
      target={[0, 1.2, 0]}
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
        camera={{ position: [0, 1.2, 5], fov: 28 }}
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
