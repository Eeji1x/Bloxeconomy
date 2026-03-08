import { Suspense, useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

interface Avatar3DViewerProps {
  equippedItems: { image_url: string; name?: string }[];
}

/* ═══════════════════════════════════════════════════════════
   Blocky Roblox-style humanoid built from box geometries.
   Proportions match classic R6 avatar:
   - Head:  1×1×1
   - Torso: 2×2×1
   - Arms:  1×2×1
   - Legs:  1×2×1
   ═══════════════════════════════════════════════════════════ */

const SKIN = '#e8b88a';
const SHIRT = '#1a5fb4';
const PANTS = '#3d3846';
const SHOE = '#1c1c1c';

/** A single limb/body part */
const BodyPart = ({
  args,
  position,
  color,
  castShadow = true,
}: {
  args: [number, number, number];
  position: [number, number, number];
  color: string;
  castShadow?: boolean;
}) => (
  <mesh position={position} castShadow={castShadow}>
    <boxGeometry args={args} />
    <meshStandardMaterial color={color} roughness={0.6} metalness={0.05} />
  </mesh>
);

/** The blocky avatar character */
const BlockyAvatar = () => {
  const groupRef = useRef<THREE.Group>(null);

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {/* Head */}
      <BodyPart args={[1, 1, 1]} position={[0, 2.5, 0]} color={SKIN} />
      
      {/* Face details */}
      {/* Eyes */}
      <mesh position={[-0.2, 2.6, 0.51]}>
        <boxGeometry args={[0.15, 0.15, 0.01]} />
        <meshStandardMaterial color="#1a1a2e" />
      </mesh>
      <mesh position={[0.2, 2.6, 0.51]}>
        <boxGeometry args={[0.15, 0.15, 0.01]} />
        <meshStandardMaterial color="#1a1a2e" />
      </mesh>
      {/* Smile */}
      <mesh position={[0, 2.25, 0.51]}>
        <boxGeometry args={[0.4, 0.08, 0.01]} />
        <meshStandardMaterial color="#c44" />
      </mesh>

      {/* Torso */}
      <BodyPart args={[2, 2, 1]} position={[0, 1, 0]} color={SHIRT} />

      {/* Left Arm */}
      <BodyPart args={[1, 2, 1]} position={[-1.5, 1, 0]} color={SHIRT} />
      {/* Left Hand */}
      <BodyPart args={[1, 0.3, 1]} position={[-1.5, -0.15, 0]} color={SKIN} />

      {/* Right Arm */}
      <BodyPart args={[1, 2, 1]} position={[1.5, 1, 0]} color={SHIRT} />
      {/* Right Hand */}
      <BodyPart args={[1, 0.3, 1]} position={[1.5, -0.15, 0]} color={SKIN} />

      {/* Left Leg */}
      <BodyPart args={[1, 2, 1]} position={[-0.5, -1, 0]} color={PANTS} />
      {/* Left Shoe */}
      <BodyPart args={[1, 0.3, 1.15]} position={[-0.5, -2.15, 0.075]} color={SHOE} />

      {/* Right Leg */}
      <BodyPart args={[1, 2, 1]} position={[0.5, -1, 0]} color={PANTS} />
      {/* Right Shoe */}
      <BodyPart args={[1, 0.3, 1.15]} position={[0.5, -2.15, 0.075]} color={SHOE} />
    </group>
  );
};

/** Ground platform */
const Ground = () => (
  <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.35, 0]} receiveShadow>
    <circleGeometry args={[2, 64]} />
    <meshStandardMaterial color="#c8c8c8" roughness={0.9} />
  </mesh>
);

const Scene = () => {
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[4, 6, 4]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <directionalLight position={[-3, 4, -2]} intensity={0.3} />
      <hemisphereLight
        args={['#b1e1ff', '#b97a20', 0.3]}
      />

      <BlockyAvatar />
      <Ground />

      <OrbitControls
        enablePan={false}
        enableZoom={true}
        minDistance={4}
        maxDistance={10}
        minPolarAngle={Math.PI / 6}
        maxPolarAngle={Math.PI / 1.8}
        target={[0, 0.5, 0]}
        autoRotate
        autoRotateSpeed={1.5}
      />
    </>
  );
};

export const Avatar3DViewer = ({ equippedItems }: Avatar3DViewerProps) => {
  return (
    <div style={{
      width: '100%',
      height: '100%',
      minHeight: 350,
      background: 'linear-gradient(180deg, #87CEEB 0%, #b8dff0 40%, #d4d4d4 100%)',
      borderRadius: 4,
      overflow: 'hidden',
    }}>
      <Canvas
        camera={{ position: [0, 1.5, 7], fov: 35 }}
        shadows
        gl={{ antialias: true, alpha: false }}
        style={{ width: '100%', height: '100%' }}
      >
        <color attach="background" args={['#c5dff0']} />
        <fog attach="fog" args={['#c5dff0', 12, 25]} />
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>
    </div>
  );
};
