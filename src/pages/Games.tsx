import { useState, useEffect, Suspense, useRef, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Sky } from '@react-three/drei';
import * as THREE from 'three';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Key, Gamepad2, LogIn, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import { DEFAULT_AVATAR_URL } from '@/lib/constants';

// ─── Texture plane for avatar rendering ───
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
      <mesh position={[0, 0, zOffset]}>
        <planeGeometry args={[dims.w, dims.h]} />
        <meshBasicMaterial map={texture} transparent alphaTest={0.1} depthWrite side={THREE.FrontSide} />
      </mesh>
      <mesh position={[0, 0, -zOffset]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[dims.w, dims.h]} />
        <meshBasicMaterial map={texture} transparent alphaTest={0.1} depthWrite side={THREE.FrontSide} />
      </mesh>
    </group>
  );
};

// ─── Player character using avatar textures ───
const Player = ({ equippedItems }: { equippedItems: { image_url: string }[] }) => {
  const ref = useRef<THREE.Group>(null);
  const [keys, setKeys] = useState({ w: false, a: false, s: false, d: false, space: false });
  const velocity = useRef(new THREE.Vector3());
  const onGround = useRef(true);

  // Expose setKeys globally for mobile controls
  useEffect(() => {
    (window as any).__gameSetKeys = setKeys;
    return () => { delete (window as any).__gameSetKeys; };
  }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', ' '].includes(k)) {
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
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);

  useFrame((_, delta) => {
    if (!ref.current) return;
    const speed = 8;
    const dir = new THREE.Vector3();
    if (keys.w) dir.z -= 1;
    if (keys.s) dir.z += 1;
    if (keys.a) dir.x -= 1;
    if (keys.d) dir.x += 1;
    if (dir.length() > 0) dir.normalize();

    ref.current.position.x += dir.x * speed * delta;
    ref.current.position.z += dir.z * speed * delta;

    if (keys.space && onGround.current) {
      velocity.current.y = 8;
      onGround.current = false;
    }

    velocity.current.y -= 20 * delta;
    ref.current.position.y += velocity.current.y * delta;

    if (ref.current.position.y <= 1.2) {
      ref.current.position.y = 1.2;
      velocity.current.y = 0;
      onGround.current = true;
    }

    ref.current.position.x = Math.max(-24, Math.min(24, ref.current.position.x));
    ref.current.position.z = Math.max(-24, Math.min(24, ref.current.position.z));
  });

  // Mark group as player for camera to find
  useEffect(() => {
    if (ref.current) {
      ref.current.userData.__isPlayer = true;
    }
  }, []);

  return (
    <group ref={ref} position={[0, 1.2, 0]}>
      {/* Base avatar */}
      <AvatarPlane imageUrl={DEFAULT_AVATAR_URL} zOffset={0} />
      {/* Equipped items stacked */}
      {equippedItems.map((item, i) => (
        <AvatarPlane key={i} imageUrl={item.image_url} zOffset={0.01 * (i + 1)} />
      ))}
    </group>
  );
};

// ─── Camera follower ───
const CameraFollower = () => {
  const { camera } = useThree();
  const offset = useRef(new THREE.Vector3(0, 6, 10));
  
  useFrame(() => {
    // Find the player group by traversing the scene
    const scene = camera.parent;
    if (!scene) return;
    
    // Look for the player group (it has AvatarPlane children)
    let playerPos: THREE.Vector3 | null = null;
    scene.traverse((obj) => {
      if (obj.userData.__isPlayer) {
        playerPos = obj.position.clone();
      }
    });
    
    if (playerPos) {
      const target = (playerPos as THREE.Vector3).clone().add(offset.current);
      camera.position.lerp(target, 0.08);
      camera.lookAt(playerPos as THREE.Vector3);
    }
  });
  return null;
};

// ─── Mobile touch controls ───
const MobileControls = () => {
  const setKey = useCallback((key: string, value: boolean) => {
    const setter = (window as any).__gameSetKeys;
    if (setter) setter((prev: any) => ({ ...prev, [key]: value }));
  }, []);

  const btn = (label: string, key: string, className: string) => (
    <button
      className={`w-14 h-14 rounded-xl bg-white/15 backdrop-blur-sm border border-white/20 text-white font-bold text-lg active:bg-white/30 select-none touch-none ${className}`}
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
        {/* D-pad */}
        <div className="flex flex-col items-center gap-1">
          <div>{btn('W', 'w', '')}</div>
          <div className="flex gap-1">
            {btn('A', 'a', '')}
            {btn('S', 's', '')}
            {btn('D', 'd', '')}
          </div>
        </div>
        {/* Jump */}
        <div>
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
    </div>
  );
};

// ─── 3D scene ───
const GameScene = ({ equippedItems }: { equippedItems: { image_url: string }[] }) => (
  <>
    <ambientLight intensity={0.6} />
    <directionalLight position={[20, 30, 10]} intensity={0.8} castShadow />
    <Sky sunPosition={[100, 50, 100]} />

    {/* Baseplate */}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[50, 50]} />
      <meshStandardMaterial color="#3b8c3b" />
    </mesh>

    {/* Spawn marker */}
    <mesh position={[0, 0.05, 0]}>
      <cylinderGeometry args={[3, 3, 0.1, 32]} />
      <meshStandardMaterial color="#999" transparent opacity={0.5} />
    </mesh>

    <Player equippedItems={equippedItems} />
    <CameraFollower />

    {/* Camera follows player, no OrbitControls needed */}
  </>
);

// ─── Main page ───
const Games = () => {
  const { user, profile, isLoading } = useAuth();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [betaKey, setBetaKey] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const [inGame, setInGame] = useState(false);
  const [equippedItems, setEquippedItems] = useState<{ image_url: string }[]>([]);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (user) {
      checkAccess();
      fetchEquipped();
    }
  }, [user]);

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
          .filter((d: any) => d.catalog_items?.image_url)
          .map((d: any) => ({ image_url: d.catalog_items.image_url }))
      );
    }
  };

  const redeemKey = async () => {
    if (!user || !betaKey.trim()) return;
    setRedeeming(true);
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
      setRedeeming(false);
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
    setRedeeming(false);
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
        {/* Leave button */}
        <div className="absolute top-4 left-4 z-50">
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setInGame(false)}
            className="gap-2 shadow-lg"
          >
            <LogOut className="w-4 h-4" />
            Leave Game
          </Button>
        </div>

        {/* Controls hint */}
        {!isMobile && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 text-white/50 text-sm bg-black/40 px-4 py-2 rounded">
            WASD to move • Space to jump • Mouse to look
          </div>
        )}

        <Canvas shadows camera={{ position: [0, 8, 12], fov: 60 }} style={{ width: '100%', height: '100%' }}>
          <Suspense fallback={null}>
            <GameScene equippedItems={equippedItems} />
          </Suspense>
        </Canvas>

        {/* Mobile touch controls */}
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
        <div style={{ textAlign: 'center', padding: 40 }}><div className="rbx16-spinner" style={{ margin: '0 auto' }} /></div>
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
            <button className="rbx16-btn-buy" onClick={redeemKey} disabled={redeeming || !betaKey.trim()} style={{ width: '100%', opacity: (redeeming || !betaKey.trim()) ? 0.5 : 1 }}>
              {redeeming ? 'Redeeming...' : 'Redeem Beta Key'}
            </button>
          </div>
        </div>
      ) : (
        <div className="rbx16-panel">
          <div style={{ height: 180, background: 'linear-gradient(135deg, #2d5a27 0%, #1a4a6e 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center', color: '#fff' }}>
              <div style={{ fontSize: 24, fontWeight: 700 }}>Empty Baseplate</div>
              <div style={{ fontSize: 13, opacity: 0.8, marginTop: 4 }}>A classic empty place — just a green baseplate and sky</div>
            </div>
          </div>
          <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '2px solid #c3c3c3' }}>
            <div>
              <div style={{ fontSize: 12, color: '#666' }}>By SODABLOX</div>
              <div style={{ fontSize: 11, color: '#999' }}>Max Players: 5</div>
            </div>
            <button className="rbx16-btn-buy" onClick={() => setInGame(true)} style={{ fontSize: 14, padding: '6px 24px' }}>
              ▶ Play
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Games;
