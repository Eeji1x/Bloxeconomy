import { Suspense, useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

interface ItemModel3DViewerProps {
  imageUrl: string;
  height?: number;
}

const TexturePlane = ({ imageUrl }: { imageUrl: string }) => {
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
    <group position={[0, dims.h / 2, 0]}>
      {/* Front */}
      <mesh>
        <planeGeometry args={[dims.w, dims.h]} />
        <meshBasicMaterial map={texture} transparent alphaTest={0.1} depthWrite side={THREE.FrontSide} />
      </mesh>
      {/* Back */}
      <mesh rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[dims.w, dims.h]} />
        <meshBasicMaterial map={texture} transparent alphaTest={0.1} depthWrite side={THREE.FrontSide} />
      </mesh>
    </group>
  );
};

const Scene = ({ imageUrl }: { imageUrl: string }) => (
  <>
    <ambientLight intensity={0.8} />
    <directionalLight position={[3, 5, 4]} intensity={0.6} />

    <TexturePlane imageUrl={imageUrl} />

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
      target={[0, 1.2, 0]}
      autoRotate
      autoRotateSpeed={1.5}
    />
  </>
);

export const ItemModel3DViewer = ({ imageUrl, height = 300 }: ItemModel3DViewerProps) => {
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
        camera={{ position: [0, 1.2, 5], fov: 32 }}
        shadows
        gl={{ antialias: true, alpha: false }}
        style={{ width: '100%', height: '100%' }}
      >
        <color attach="background" args={['#e8eef4']} />
        <fog attach="fog" args={['#e8eef4', 10, 20]} />
        <Suspense fallback={null}>
          <Scene imageUrl={imageUrl} />
        </Suspense>
      </Canvas>
    </div>
  );
};
