import { useState, useEffect, Suspense, useRef, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Sky } from '@react-three/drei';
import * as THREE from 'three';
import { Button } from '@/components/ui/button';
import { LogOut, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import { DEFAULT_AVATAR_URL } from '@/lib/constants';

// ════════════════════════════════════════════════════════════════
// RCC MODE: client-side toggle persisted in localStorage.
// Enables higher fidelity rendering (shadows, tone mapping, fog, etc.)
// ════════════════════════════════════════════════════════════════
export const RCC_MODE_KEY = 'sodablox-rcc-mode';
export function isRccModeEnabled(): boolean {
  try { return localStorage.getItem(RCC_MODE_KEY) === '1'; } catch { return false; }
}
export function setRccMode(on: boolean) {
  try { localStorage.setItem(RCC_MODE_KEY, on ? '1' : '0'); } catch { /* ignore */ }
}

// ─── Texture plane for 2D-stacked avatar (matches site avatar system) ───
const AvatarPlane = ({ imageUrl, zOffset = 0 }: { imageUrl: string; zOffset: number }) => {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const [dims, setDims] = useState({ w: 1, h: 1 });

  useEffect(() => {
    const loader = new THREE.TextureLoader();
    loader.crossOrigin = 'anonymous';
    loader.load(imageUrl, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.needsUpdate = true;
      const img = tex.image as HTMLImageElement;
      if (img?.width && img?.height) {
        const aspect = img.width / img.height;
        const height = 2.6;
        setDims({ w: height * aspect, h: height });
      }
      setTexture(tex);
    });
  }, [imageUrl]);

  if (!texture) return null;

  return (
    <group position={[0, dims.h / 2, 0]}>
      <mesh position={[0, 0, zOffset]} castShadow>
        <planeGeometry args={[dims.w, dims.h]} />
        <meshStandardMaterial map={texture} transparent alphaTest={0.1} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};

// ─── Camera state shared between Player + CameraRig ───
type CamState = {
  yaw: number;     // around Y, from mouse drag
  pitch: number;   // up/down, clamped
  distance: number; // zoom
  target: THREE.Vector3; // follow target (player feet)
};

// ─── Player character ───
const Player = ({
  equippedItems,
  cam,
  rcc,
}: {
  equippedItems: { image_url: string }[];
  cam: React.MutableRefObject<CamState>;
  rcc: boolean;
}) => {
  const ref = useRef<THREE.Group>(null);
  const [keys, setKeys] = useState({ w: false, a: false, s: false, d: false, space: false });
  const velocity = useRef(new THREE.Vector3());
  const onGround = useRef(true);

  useEffect(() => {
    (window as unknown as { __gameSetKeys?: typeof setKeys }).__gameSetKeys = setKeys;
    return () => { delete (window as unknown as { __gameSetKeys?: typeof setKeys }).__gameSetKeys; };
  }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', ' '].includes(k)) {
        if (k === ' ') e.preventDefault();
        setKeys(prev => ({ ...prev, [k === ' ' ? 'space' : k]: true }));
      }
    };
    const up = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', ' '].includes(k)) {
        setKeys(prev => ({ ...prev, [k === ' ' ? 'space' : k]: false }));
      }
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  useFrame((_, deltaRaw) => {
    if (!ref.current) return;
    const delta = Math.min(deltaRaw, 0.05);
    const speed = 10;

    // Move RELATIVE to camera yaw (classic Roblox 3rd person)
    const yaw = cam.current.yaw;
    const forward = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
    const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
    const dir = new THREE.Vector3();
    if (keys.w) dir.add(forward);
    if (keys.s) dir.sub(forward);
    if (keys.d) dir.add(right);
    if (keys.a) dir.sub(right);
    if (dir.lengthSq() > 0) {
      dir.normalize();
      ref.current.position.x += dir.x * speed * delta;
      ref.current.position.z += dir.z * speed * delta;
      // Face movement direction
      const targetYaw = Math.atan2(dir.x, dir.z);
      ref.current.rotation.y = targetYaw;
    }

    // Jump & gravity
    if (keys.space && onGround.current) {
      velocity.current.y = 9;
      onGround.current = false;
    }
    velocity.current.y -= 22 * delta;
    ref.current.position.y += velocity.current.y * delta;
    if (ref.current.position.y <= 0) {
      ref.current.position.y = 0;
      velocity.current.y = 0;
      onGround.current = true;
    }

    // World bounds
    ref.current.position.x = Math.max(-60, Math.min(60, ref.current.position.x));
    ref.current.position.z = Math.max(-60, Math.min(60, ref.current.position.z));

    // Update camera target = player feet
    cam.current.target.set(ref.current.position.x, ref.current.position.y + 1.4, ref.current.position.z);
  });

  return (
    <group ref={ref} position={[0, 0, 0]}>
      <AvatarPlane imageUrl={DEFAULT_AVATAR_URL} zOffset={0} />
      {equippedItems.map((item, i) => (
        <AvatarPlane key={`${item.image_url}-${i}`} imageUrl={item.image_url} zOffset={0.01 * (i + 1)} />
      ))}
      {/* Soft shadow blob (RCC fallback look) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <circleGeometry args={[1.1, 24]} />
        <meshBasicMaterial color="#000" transparent opacity={0.25} />
      </mesh>
    </group>
  );
};

// ─── Classic 3rd-person orbit camera (mouse drag rotate, scroll zoom) ───
const CameraRig = ({ cam }: { cam: React.MutableRefObject<CamState> }) => {
  const { camera, gl } = useThree();

  useEffect(() => {
    const dom = gl.domElement;
    let dragging = false;
    let lastX = 0, lastY = 0;

    const onDown = (e: MouseEvent) => {
      dragging = true;
      lastX = e.clientX; lastY = e.clientY;
      dom.style.cursor = 'grabbing';
    };
    const onUp = () => { dragging = false; dom.style.cursor = 'grab'; };
    const onMove = (e: MouseEvent) => {
      if (!dragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX; lastY = e.clientY;
      cam.current.yaw   -= dx * 0.005;
      cam.current.pitch -= dy * 0.005;
      cam.current.pitch = Math.max(-1.2, Math.min(1.2, cam.current.pitch));
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      cam.current.distance += e.deltaY * 0.01;
      cam.current.distance = Math.max(4, Math.min(30, cam.current.distance));
    };

    dom.style.cursor = 'grab';
    dom.addEventListener('mousedown', onDown);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('mousemove', onMove);
    dom.addEventListener('wheel', onWheel, { passive: false });

    // Touch: one-finger drag to rotate, pinch to zoom
    let touchLastX = 0, touchLastY = 0;
    let pinchStart = 0;
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        touchLastX = e.touches[0].clientX;
        touchLastY = e.touches[0].clientY;
      } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        pinchStart = Math.hypot(dx, dy);
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        const dx = e.touches[0].clientX - touchLastX;
        const dy = e.touches[0].clientY - touchLastY;
        touchLastX = e.touches[0].clientX;
        touchLastY = e.touches[0].clientY;
        cam.current.yaw   -= dx * 0.006;
        cam.current.pitch -= dy * 0.006;
        cam.current.pitch = Math.max(-1.2, Math.min(1.2, cam.current.pitch));
      } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const d = Math.hypot(dx, dy);
        const delta = pinchStart - d;
        cam.current.distance += delta * 0.03;
        cam.current.distance = Math.max(4, Math.min(30, cam.current.distance));
        pinchStart = d;
      }
    };
    dom.addEventListener('touchstart', onTouchStart, { passive: true });
    dom.addEventListener('touchmove', onTouchMove, { passive: true });

    return () => {
      dom.removeEventListener('mousedown', onDown);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('mousemove', onMove);
      dom.removeEventListener('wheel', onWheel);
      dom.removeEventListener('touchstart', onTouchStart);
      dom.removeEventListener('touchmove', onTouchMove);
    };
  }, [gl, cam]);

  useFrame(() => {
    const c = cam.current;
    const x = c.target.x + Math.sin(c.yaw) * Math.cos(c.pitch) * c.distance;
    const z = c.target.z + Math.cos(c.yaw) * Math.cos(c.pitch) * c.distance;
    const y = c.target.y + Math.sin(c.pitch) * c.distance + 1.5;
    camera.position.lerp(new THREE.Vector3(x, y, z), 0.18);
    camera.lookAt(c.target);
  });

  return null;
};

// ─── Mobile movement controls (camera handles rotation/zoom via touch) ───
const MobileControls = () => {
  const setKey = useCallback((key: string, value: boolean) => {
    const setter = (window as unknown as { __gameSetKeys?: (fn: (p: Record<string, boolean>) => Record<string, boolean>) => void }).__gameSetKeys;
    if (setter) setter((prev) => ({ ...prev, [key]: value }));
  }, []);

  const btn = (label: string, key: string) => (
    <button
      className="w-14 h-14 rounded-xl bg-white/15 backdrop-blur-sm border border-white/20 text-white font-bold text-lg active:bg-white/30 select-none touch-none"
      onTouchStart={(e) => { e.preventDefault(); setKey(key, true); }}
      onTouchEnd={(e) => { e.preventDefault(); setKey(key, false); }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {label}
    </button>
  );

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 pb-6 px-4 pointer-events-none">
      <div className="flex justify-between items-end pointer-events-auto">
        <div className="flex flex-col items-center gap-1">
          <div>{btn('W', 'w')}</div>
          <div className="flex gap-1">
            {btn('A', 'a')}
            {btn('S', 's')}
            {btn('D', 'd')}
          </div>
        </div>
        <button
          className="w-20 h-20 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 text-white font-bold text-sm active:bg-white/30 select-none touch-none"
          onTouchStart={(e) => { e.preventDefault(); setKey('space', true); }}
          onTouchEnd={(e) => { e.preventDefault(); setKey('space', false); }}
          onContextMenu={(e) => e.preventDefault()}
        >
          JUMP
        </button>
      </div>
    </div>
  );
};

// ─── Procedural baseplate grid texture ───
function makeBaseplateTexture() {
  const size = 512;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#3aa54a';
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = 'rgba(0,0,0,0.18)';
  ctx.lineWidth = 1;
  const step = 32;
  for (let i = 0; i <= size; i += step) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, size); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(size, i); ctx.stroke();
  }
  // darker outer studs feel
  ctx.fillStyle = 'rgba(0,0,0,0.06)';
  for (let y = step / 2; y < size; y += step) {
    for (let x = step / 2; x < size; x += step) {
      ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill();
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(15, 15);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ─── Decorative bricks ───
const Brick = ({ position, color, size }: { position: [number, number, number]; color: string; size: [number, number, number] }) => (
  <mesh position={position} castShadow receiveShadow>
    <boxGeometry args={size} />
    <meshStandardMaterial color={color} />
  </mesh>
);

// ─── 3D scene ───
const GameScene = ({ equippedItems, cam, rcc }: { equippedItems: { image_url: string }[]; cam: React.MutableRefObject<CamState>; rcc: boolean }) => {
  const baseplateTex = useRef<THREE.Texture | null>(null);
  if (!baseplateTex.current) baseplateTex.current = makeBaseplateTexture();

  return (
    <>
      {/* Lighting — RCC mode has stronger shadows + warmer sun */}
      <ambientLight intensity={rcc ? 0.45 : 0.7} color={rcc ? '#a8c8ff' : '#ffffff'} />
      <hemisphereLight args={['#bcdcff', '#3a8a3a', rcc ? 0.55 : 0.4]} />
      <directionalLight
        position={[40, 60, 20]}
        intensity={rcc ? 1.4 : 0.9}
        color={rcc ? '#fff4d6' : '#ffffff'}
        castShadow={rcc}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-50}
        shadow-camera-right={50}
        shadow-camera-top={50}
        shadow-camera-bottom={-50}
        shadow-camera-near={1}
        shadow-camera-far={200}
      />
      <Sky sunPosition={[100, 50, 100]} turbidity={rcc ? 6 : 8} rayleigh={rcc ? 1.2 : 2} />
      {rcc && <fog attach="fog" args={['#cfe6ff', 60, 180]} />}

      {/* Baseplate */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[140, 140]} />
        <meshStandardMaterial map={baseplateTex.current} />
      </mesh>

      {/* Spawn pad */}
      <mesh position={[0, 0.06, 0]} receiveShadow>
        <cylinderGeometry args={[3, 3, 0.12, 32]} />
        <meshStandardMaterial color="#cccccc" />
      </mesh>
      <mesh position={[0, 0.13, 0]} receiveShadow>
        <cylinderGeometry args={[2.4, 2.4, 0.04, 32]} />
        <meshStandardMaterial color="#9ec6ff" />
      </mesh>

      {/* A few decorative bricks for scale */}
      <Brick position={[-12, 1, -8]} color="#d7443e" size={[4, 2, 4]} />
      <Brick position={[10, 0.6, -14]} color="#f5cd30" size={[6, 1.2, 6]} />
      <Brick position={[14, 1.5, 10]} color="#0d69ac" size={[3, 3, 3]} />
      <Brick position={[-16, 0.8, 12]} color="#a3a2a4" size={[8, 1.6, 4]} />
      <Brick position={[0, 0.5, 22]} color="#4b974b" size={[18, 1, 4]} />

      <Player equippedItems={equippedItems} cam={cam} rcc={rcc} />
      <CameraRig cam={cam} />
    </>
  );
};

// ─── Main page ───
const Games = () => {
  const { user, isLoading } = useAuth();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [betaKey, setBetaKey] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const [inGame, setInGame] = useState(false);
  const [equippedItems, setEquippedItems] = useState<{ image_url: string }[]>([]);
  const [rcc, setRcc] = useState<boolean>(isRccModeEnabled());
  const isMobile = useIsMobile();

  // Shared camera state
  const camRef = useRef<CamState>({
    yaw: 0,
    pitch: 0.25,
    distance: 12,
    target: new THREE.Vector3(0, 1.4, 0),
  });

  useEffect(() => {
    if (user) {
      checkAccess();
      fetchEquipped();
    }
  }, [user]);

  // Keep RCC state in sync with localStorage when entering the game
  useEffect(() => {
    if (inGame) setRcc(isRccModeEnabled());
  }, [inGame]);

  const checkAccess = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('beta_access')
      .select('id')
      .eq('user_id', user.id)
      .eq('feature', 'games')
      .maybeSingle();
    setHasAccess(!!data);
  };

  const fetchEquipped = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('user_inventory')
      .select('id, catalog_items(image_url)')
      .eq('user_id', user.id)
      .eq('is_equipped', true);
    if (data) {
      setEquippedItems(
        data
          .filter((d: { catalog_items?: { image_url?: string } }) => d.catalog_items?.image_url)
          .map((d: { catalog_items?: { image_url?: string } }) => ({ image_url: d.catalog_items!.image_url! }))
      );
    }
  };

  const redeemKey = async () => {
    if (!user || !betaKey.trim()) return;
    setRedeeming(true);
    try {
      const { hashKey } = await import('@/lib/hashKey');
      const keyHash = await hashKey(betaKey);
      const { data: keyData, error: keyError } = await supabase
        .from('beta_keys')
        .select('id, is_used, feature')
        .eq('key_hash', keyHash)
        .eq('is_used', false)
        .eq('feature', 'games')
        .maybeSingle();

      if (keyError || !keyData) {
        toast.error('Invalid or already used beta key');
        return;
      }

      await supabase.from('beta_keys').update({ is_used: true, used_by: user.id, used_at: new Date().toISOString() }).eq('id', keyData.id);
      const { error } = await supabase.from('beta_access').insert({ user_id: user.id, feature: 'games', beta_key_id: keyData.id });
      if (error) {
        toast.error('Failed to grant access');
      } else {
        toast.success('Beta access granted! You can now play games.');
        setHasAccess(true);
      }
    } finally {
      setRedeeming(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  // In-game fullscreen
  if (inGame && hasAccess) {
    return (
      <div className="fixed inset-0 z-50 bg-black">
        {/* HUD */}
        <div className="absolute top-4 left-4 z-50 flex gap-2">
          <Button variant="destructive" size="sm" onClick={() => setInGame(false)} className="gap-2 shadow-lg">
            <LogOut className="w-4 h-4" /> Leave Game
          </Button>
          {rcc && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-amber-500/90 text-black text-xs font-bold shadow-lg">
              <Zap className="w-3.5 h-3.5" /> RCC MODE
            </div>
          )}
        </div>

        {!isMobile && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 text-white/70 text-xs bg-black/50 px-4 py-2 rounded">
            WASD move • Space jump • Drag mouse to look • Scroll to zoom
          </div>
        )}

        <Canvas
          shadows={rcc}
          camera={{ position: [0, 6, 12], fov: 65, near: 0.1, far: 500 }}
          dpr={rcc ? [1, 2] : 1}
          gl={{ antialias: true, toneMapping: rcc ? THREE.ACESFilmicToneMapping : THREE.NoToneMapping }}
          style={{ width: '100%', height: '100%' }}
        >
          <Suspense fallback={null}>
            <GameScene equippedItems={equippedItems} cam={camRef} rcc={rcc} />
          </Suspense>
        </Canvas>

        {isMobile && <MobileControls />}
      </div>
    );
  }

  // Lobby
  return (
    <div style={{ maxWidth: 800 }}>
      <div className="rbx16-panel" style={{ marginBottom: 12 }}>
        <div className="rbx16-panel-header">Games</div>
        <div className="rbx16-panel-body">
          <p style={{ fontSize: 13, color: '#666' }}>Play games in your browser — beta access required</p>
        </div>
      </div>

      {hasAccess === null ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div className="rbx16-spinner" style={{ margin: '0 auto' }} />
        </div>
      ) : !hasAccess ? (
        <div className="rbx16-panel" style={{ maxWidth: 400, margin: '0 auto' }}>
          <div className="rbx16-panel-header">Beta Access Required</div>
          <div className="rbx16-panel-body" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
            <p style={{ fontSize: 13, color: '#666' }}>Games is currently in beta. Enter a beta key to get early access.</p>
            <input
              type="text"
              value={betaKey}
              onChange={(e) => setBetaKey(e.target.value.toUpperCase())}
              placeholder="BETA-XXXXX-XXXXX"
              style={{ width: '100%', padding: '6px 10px', fontFamily: 'monospace', textAlign: 'center', textTransform: 'uppercase' }}
            />
            <button
              className="rbx16-btn-buy"
              onClick={redeemKey}
              disabled={redeeming || !betaKey.trim()}
              style={{ width: '100%', opacity: (redeeming || !betaKey.trim()) ? 0.5 : 1 }}
            >
              {redeeming ? 'Redeeming...' : 'Redeem Beta Key'}
            </button>
          </div>
        </div>
      ) : (
        <div className="rbx16-panel">
          <div style={{ height: 180, background: 'linear-gradient(135deg, #2d5a27 0%, #1a4a6e 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            <div style={{ textAlign: 'center', color: '#fff' }}>
              <div style={{ fontSize: 24, fontWeight: 700 }}>Classic Baseplate</div>
              <div style={{ fontSize: 13, opacity: 0.85, marginTop: 4 }}>Bricks, baseplate, and a friendly camera</div>
            </div>
            {rcc && (
              <div style={{ position: 'absolute', top: 8, right: 8, background: '#ffb400', color: '#222', padding: '3px 8px', fontSize: 11, fontWeight: 700, borderRadius: 3 }}>
                RCC MODE
              </div>
            )}
          </div>
          <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '2px solid #c3c3c3', flexWrap: 'wrap', gap: 8 }}>
            <div>
              <div style={{ fontSize: 12, color: '#666' }}>By SODABLOX</div>
              <div style={{ fontSize: 11, color: '#999' }}>Max Players: 5 • {rcc ? 'High Fidelity' : 'Standard'}</div>
            </div>
            <button className="rbx16-btn-buy" onClick={() => setInGame(true)} style={{ fontSize: 14, padding: '6px 24px' }}>
              ▶ Play
            </button>
          </div>
          <div style={{ padding: '8px 16px', borderTop: '1px solid #e0e0e0', background: '#fafafa', fontSize: 11, color: '#666' }}>
            Tip: enable <strong>RCC Mode</strong> in <strong>Settings → RCC</strong> for shadows, fog, and better lighting.
          </div>
        </div>
      )}
    </div>
  );
};

export default Games;
