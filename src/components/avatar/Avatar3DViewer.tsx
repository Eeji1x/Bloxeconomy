import { Suspense, useLayoutEffect, useMemo, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';

interface Avatar3DViewerProps {
  equippedItems: { image_url: string; name?: string }[];
}

const MODEL_PATH = '/models/roblox-avatar.glb';

const AvatarModel = () => {
  const { scene } = useGLTF(MODEL_PATH);
  const groupRef = useRef<THREE.Group>(null);

  const model = useMemo(() => scene.clone(true), [scene]);

  useLayoutEffect(() => {
    if (!groupRef.current) return;

    const box = new THREE.Box3().setFromObject(groupRef.current);
    const center = box.getCenter(new THREE.Vector3());
    const min = box.min;

    // Center horizontally and place feet on y=0
    groupRef.current.position.x -= center.x;
    groupRef.current.position.z -= center.z;
    groupRef.current.position.y -= min.y;
  }, [model]);

  return (
    <group ref={groupRef}>
      <primitive object={model} scale={1} />
    </group>
  );
};

useGLTF.preload(MODEL_PATH);

const Scene = () => (
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

    <AvatarModel />

    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <circleGeometry args={[0.8, 64]} />
      <meshStandardMaterial color="#b8b8b8" roughness={0.85} />
    </mesh>

    <gridHelper args={[4, 20, '#cccccc', '#e0e0e0']} position={[0, 0.01, 0]} />

    <OrbitControls
      enablePan={false}
      enableZoom
      minDistance={2}
      maxDistance={8}
      minPolarAngle={Math.PI / 8}
      maxPolarAngle={Math.PI / 2}
      target={[0, 0.9, 0]}
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
        camera={{ position: [0, 1.2, 12], fov: 28 }}
        shadows
        gl={{ antialias: true, alpha: false }}
        style={{ width: '100%', height: '100%' }}
      >
        <color attach="background" args={['#e8eef4']} />
        <fog attach="fog" args={['#e8eef4', 10, 20]} />
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>
    </div>
  );
};
