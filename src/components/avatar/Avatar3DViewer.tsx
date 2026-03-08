import { Suspense, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

interface Avatar3DViewerProps {
  equippedItems: { image_url: string; name?: string }[];
}

/* ═══════════════════════════════════════════════════════════════
   Accurate Roblox R6 Character — Proper proportions
   
   Real R6 dimensions (in studs):
   - Head:      1.2 × 1.2 × 1.2  (with studs on top)
   - Torso:     2.0 × 2.0 × 1.0
   - Left Arm:  1.0 × 2.0 × 1.0
   - Right Arm: 1.0 × 2.0 × 1.0
   - Left Leg:  1.0 × 2.0 × 1.0
   - Right Leg: 1.0 × 2.0 × 1.0
   
   Scale: 1 stud = 0.4 units in our scene
   ═══════════════════════════════════════════════════════════════ */

const S = 0.4; // stud scale

// Classic "noob" colors
const COLORS = {
  head: '#f3b700',     // Bright yellow
  torso: '#00589c',    // Bright blue
  leftArm: '#f3b700',  // Yellow
  rightArm: '#f3b700', // Yellow
  leftLeg: '#3a7d44',  // Br. green (classic noob)
  rightLeg: '#3a7d44', // Br. green
};

/** Rounded box body part with subtle bevel look */
const Part = ({
  size,
  pos,
  color,
}: {
  size: [number, number, number];
  pos: [number, number, number];
  color: string;
}) => (
  <mesh position={pos} castShadow receiveShadow>
    <boxGeometry args={size} />
    <meshStandardMaterial
      color={color}
      roughness={0.55}
      metalness={0.02}
    />
  </mesh>
);

/** The classic head stud (cylinder on top of head) */
const HeadStud = () => (
  <mesh position={[0, (1.2 * S) / 2 + 0.06, 0]} castShadow>
    <cylinderGeometry args={[0.16, 0.16, 0.12, 16]} />
    <meshStandardMaterial color={COLORS.head} roughness={0.5} metalness={0.05} />
  </mesh>
);

/** Smiley face decal on head front */
const Face = () => {
  const headW = 1.2 * S;
  const z = headW / 2 + 0.001;

  return (
    <group position={[0, 0, z]}>
      {/* Left eye */}
      <mesh position={[-0.07, 0.04, 0]}>
        <circleGeometry args={[0.035, 16]} />
        <meshBasicMaterial color="#1a1a2e" />
      </mesh>
      {/* Right eye */}
      <mesh position={[0.07, 0.04, 0]}>
        <circleGeometry args={[0.035, 16]} />
        <meshBasicMaterial color="#1a1a2e" />
      </mesh>
      {/* Smile — arc made from a torus segment */}
      <mesh position={[0, -0.03, 0]} rotation={[0, 0, Math.PI]}>
        <torusGeometry args={[0.07, 0.012, 8, 16, Math.PI]} />
        <meshBasicMaterial color="#1a1a2e" />
      </mesh>
    </group>
  );
};

/** Complete R6 character */
const R6Character = () => {
  const headSize: [number, number, number] = [1.2 * S, 1.2 * S, 1.2 * S];
  const torsoSize: [number, number, number] = [2.0 * S, 2.0 * S, 1.0 * S];
  const armSize: [number, number, number] = [1.0 * S, 2.0 * S, 1.0 * S];
  const legSize: [number, number, number] = [1.0 * S, 2.0 * S, 1.0 * S];

  // Y positions (bottom of feet = 0)
  const legY = 1.0 * S;                          // center of legs
  const torsoY = legY + 1.0 * S + 1.0 * S;       // 2.0 * S + gap
  const headY = torsoY + 1.0 * S + 0.6 * S;      // top of torso + half head
  const armY = torsoY;                             // arms align with torso

  // X positions
  const armX = 1.5 * S;  // torso half-width + arm half-width
  const legX = 0.5 * S;  // centered under torso

  return (
    <group position={[0, -torsoY, 0]}>
      {/* Head */}
      <group position={[0, headY, 0]}>
        <Part size={headSize} pos={[0, 0, 0]} color={COLORS.head} />
        <HeadStud />
        <Face />
      </group>

      {/* Torso */}
      <Part size={torsoSize} pos={[0, torsoY, 0]} color={COLORS.torso} />

      {/* Left Arm */}
      <Part size={armSize} pos={[-armX, armY, 0]} color={COLORS.leftArm} />

      {/* Right Arm */}
      <Part size={armSize} pos={[armX, armY, 0]} color={COLORS.rightArm} />

      {/* Left Leg */}
      <Part size={legSize} pos={[-legX, legY, 0]} color={COLORS.leftLeg} />

      {/* Right Leg */}
      <Part size={legSize} pos={[legX, legY, 0]} color={COLORS.rightLeg} />
    </group>
  );
};

/** Ground plate */
const GroundPlate = () => (
  <mesh
    rotation={[-Math.PI / 2, 0, 0]}
    position={[0, -1.62, 0]}
    receiveShadow
  >
    <circleGeometry args={[1.6, 64]} />
    <meshStandardMaterial color="#b8b8b8" roughness={0.85} />
  </mesh>
);

/** Grid helper on the ground */
const GroundGrid = () => (
  <gridHelper
    args={[4, 20, '#cccccc', '#e0e0e0']}
    position={[0, -1.61, 0]}
  />
);

const Scene = () => (
  <>
    {/* Lighting — studio-style 3-point */}
    <ambientLight intensity={0.5} />
    <directionalLight
      position={[3, 5, 4]}
      intensity={1.4}
      castShadow
      shadow-mapSize-width={1024}
      shadow-mapSize-height={1024}
      shadow-camera-far={20}
      shadow-camera-left={-3}
      shadow-camera-right={3}
      shadow-camera-top={3}
      shadow-camera-bottom={-3}
    />
    <directionalLight position={[-2, 3, -2]} intensity={0.3} />
    <hemisphereLight args={['#aadcff', '#ffe8a0', 0.25]} />

    <R6Character />
    <GroundPlate />
    <GroundGrid />

    <OrbitControls
      enablePan={false}
      enableZoom={true}
      minDistance={3}
      maxDistance={8}
      minPolarAngle={Math.PI / 8}
      maxPolarAngle={Math.PI / 2}
      target={[0, 0, 0]}
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
        camera={{ position: [0, 0.3, 5], fov: 32 }}
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
