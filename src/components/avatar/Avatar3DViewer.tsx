import { Suspense, useRef, useMemo } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { DEFAULT_AVATAR_URL } from '@/lib/constants';

interface Avatar3DViewerProps {
  equippedItems: { image_url: string; name?: string }[];
}

/** A textured plane that always faces the camera slightly */
const AvatarPlane = ({ url, zOffset = 0 }: { url: string; zOffset?: number }) => {
  const texture = useLoader(THREE.TextureLoader, url);
  texture.colorSpace = THREE.SRGBColorSpace;

  return (
    <mesh position={[0, 0, zOffset]}>
      <planeGeometry args={[2, 2.6]} />
      <meshStandardMaterial
        map={texture}
        transparent
        alphaTest={0.01}
        side={THREE.DoubleSide}
        depthWrite={zOffset === 0}
      />
    </mesh>
  );
};

/** Rotating platform / turntable */
const Turntable = ({ children }: { children: React.ReactNode }) => {
  const ref = useRef<THREE.Group>(null);

  return (
    <group ref={ref}>
      {children}
    </group>
  );
};

/** Ground disc */
const Ground = () => {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.35, 0]} receiveShadow>
      <circleGeometry args={[1.4, 64]} />
      <meshStandardMaterial color="#d4d4d4" roughness={0.8} />
    </mesh>
  );
};

const Scene = ({ equippedItems }: Avatar3DViewerProps) => {
  return (
    <>
      <ambientLight intensity={0.7} />
      <directionalLight position={[3, 5, 3]} intensity={1} castShadow />
      <directionalLight position={[-2, 3, -1]} intensity={0.3} />

      <Turntable>
        {/* Base avatar */}
        <AvatarPlane url={DEFAULT_AVATAR_URL} zOffset={0} />
        {/* Equipped items stacked on top */}
        {equippedItems.map((item, i) => (
          <AvatarPlane
            key={i}
            url={item.image_url}
            zOffset={0.01 * (i + 1)}
          />
        ))}
        <Ground />
      </Turntable>

      <OrbitControls
        enablePan={false}
        enableZoom={true}
        minDistance={2.5}
        maxDistance={6}
        minPolarAngle={Math.PI / 6}
        maxPolarAngle={Math.PI / 2}
        target={[0, 0, 0]}
      />
    </>
  );
};

export const Avatar3DViewer = ({ equippedItems }: Avatar3DViewerProps) => {
  return (
    <div style={{ width: '100%', height: '100%', minHeight: 350, background: 'linear-gradient(180deg, #c8e6ff 0%, #eef5ff 50%, #e0e0e0 100%)', borderRadius: 4, overflow: 'hidden' }}>
      <Canvas
        camera={{ position: [0, 0.5, 4], fov: 40 }}
        shadows
        gl={{ antialias: true, alpha: false }}
        style={{ width: '100%', height: '100%' }}
      >
        <color attach="background" args={['#dce9f5']} />
        <Suspense fallback={null}>
          <Scene equippedItems={equippedItems} />
        </Suspense>
      </Canvas>
    </div>
  );
};
