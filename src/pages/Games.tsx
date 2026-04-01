import { useState, useEffect, Suspense, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Sky, Grid } from '@react-three/drei';
import * as THREE from 'three';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Key, Gamepad2, LogIn } from 'lucide-react';
import { toast } from 'sonner';

// Simple player character
const Player = () => {
  const ref = useRef<THREE.Group>(null);
  const [keys, setKeys] = useState({ w: false, a: false, s: false, d: false, space: false });
  const velocity = useRef(new THREE.Vector3());
  const onGround = useRef(true);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (['w','a','s','d',' '].includes(k)) {
        setKeys(prev => ({ ...prev, [k === ' ' ? 'space' : k]: true }));
      }
    };
    const up = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (['w','a','s','d',' '].includes(k)) {
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

    // Jump
    if (keys.space && onGround.current) {
      velocity.current.y = 8;
      onGround.current = false;
    }

    // Gravity
    velocity.current.y -= 20 * delta;
    ref.current.position.y += velocity.current.y * delta;

    if (ref.current.position.y <= 1.5) {
      ref.current.position.y = 1.5;
      velocity.current.y = 0;
      onGround.current = true;
    }

    // Clamp to baseplate
    ref.current.position.x = Math.max(-24, Math.min(24, ref.current.position.x));
    ref.current.position.z = Math.max(-24, Math.min(24, ref.current.position.z));
  });

  return (
    <group ref={ref} position={[0, 1.5, 0]}>
      {/* Head */}
      <mesh position={[0, 1.2, 0]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#f5c542" />
      </mesh>
      {/* Torso */}
      <mesh position={[0, 0.2, 0]}>
        <boxGeometry args={[1, 1.2, 0.6]} />
        <meshStandardMaterial color="#3b82f6" />
      </mesh>
      {/* Left arm */}
      <mesh position={[-0.7, 0.2, 0]}>
        <boxGeometry args={[0.4, 1.2, 0.4]} />
        <meshStandardMaterial color="#f5c542" />
      </mesh>
      {/* Right arm */}
      <mesh position={[0.7, 0.2, 0]}>
        <boxGeometry args={[0.4, 1.2, 0.4]} />
        <meshStandardMaterial color="#f5c542" />
      </mesh>
      {/* Left leg */}
      <mesh position={[-0.25, -0.9, 0]}>
        <boxGeometry args={[0.45, 1.2, 0.5]} />
        <meshStandardMaterial color="#1a5c1a" />
      </mesh>
      {/* Right leg */}
      <mesh position={[0.25, -0.9, 0]}>
        <boxGeometry args={[0.45, 1.2, 0.5]} />
        <meshStandardMaterial color="#1a5c1a" />
      </mesh>
    </group>
  );
};

// The 3D game scene
const GameScene = () => (
  <>
    <ambientLight intensity={0.6} />
    <directionalLight position={[20, 30, 10]} intensity={0.8} castShadow />
    <Sky sunPosition={[100, 50, 100]} />
    
    {/* Baseplate */}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[50, 50]} />
      <meshStandardMaterial color="#3b8c3b" />
    </mesh>

    {/* Spawn point marker */}
    <mesh position={[0, 0.05, 0]}>
      <cylinderGeometry args={[3, 3, 0.1, 32]} />
      <meshStandardMaterial color="#999" transparent opacity={0.5} />
    </mesh>

    <Player />

    <OrbitControls
      enablePan={false}
      maxPolarAngle={Math.PI / 2.2}
      minDistance={5}
      maxDistance={20}
      target={[0, 2, 0]}
    />
  </>
);

const Games = () => {
  const { user, isLoading } = useAuth();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [betaKey, setBetaKey] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const [inGame, setInGame] = useState(false);

  useEffect(() => {
    if (user) checkAccess();
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

  const redeemKey = async () => {
    if (!user || !betaKey.trim()) return;
    setRedeeming(true);

    // Find the key
    const { data: keyData, error: keyError } = await supabase
      .from('beta_keys')
      .select('*')
      .eq('key', betaKey.trim().toUpperCase())
      .eq('is_used', false)
      .eq('feature', 'games')
      .maybeSingle();

    if (keyError || !keyData) {
      toast.error('Invalid or already used beta key');
      setRedeeming(false);
      return;
    }

    // Mark key as used
    await supabase.from('beta_keys').update({ is_used: true, used_by: user.id, used_at: new Date().toISOString() }).eq('id', keyData.id);

    // Grant access
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

  // In-game view - fullscreen 3D
  if (inGame && hasAccess) {
    return (
      <div className="fixed inset-0 z-50 bg-black">
        <div className="absolute top-4 left-4 z-50 flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setInGame(false)} className="bg-black/50 text-white border-white/20">
            ← Leave Game
          </Button>
        </div>
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 text-white/50 text-sm bg-black/40 px-4 py-2 rounded">
          WASD to move • Space to jump • Mouse to look
        </div>
        <Canvas shadows camera={{ position: [0, 8, 12], fov: 60 }} style={{ width: '100%', height: '100%' }}>
          <Suspense fallback={null}>
            <GameScene />
          </Suspense>
        </Canvas>
      </div>
    );
  }

  // Games lobby
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-display font-bold flex items-center gap-3">
          <Gamepad2 className="w-8 h-8 text-primary" />
          Games
        </h1>
        <p className="text-muted-foreground">Play games in your browser — beta access required</p>
      </div>

      {hasAccess === null ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : !hasAccess ? (
        // Beta key redemption
        <div className="cyber-card p-8 space-y-6 text-center max-w-md mx-auto">
          <Key className="w-12 h-12 text-primary mx-auto" />
          <h2 className="text-xl font-display font-bold">Beta Access Required</h2>
          <p className="text-sm text-muted-foreground">
            Games is currently in beta. Enter a beta key to get early access.
          </p>
          <div className="space-y-3">
            <Input
              value={betaKey}
              onChange={(e) => setBetaKey(e.target.value.toUpperCase())}
              placeholder="BETA-XXXXX-XXXXX"
              className="text-center font-mono"
            />
            <Button onClick={redeemKey} disabled={redeeming || !betaKey.trim()} className="w-full">
              {redeeming ? 'Redeeming...' : 'Redeem Beta Key'}
            </Button>
          </div>
        </div>
      ) : (
        // Game card
        <div className="grid gap-6">
          <div className="cyber-card overflow-hidden">
            <div className="h-48 bg-gradient-to-br from-green-900/50 to-blue-900/50 flex items-center justify-center relative">
              <div className="text-center space-y-2">
                <Gamepad2 className="w-16 h-16 text-primary mx-auto" />
                <h3 className="text-2xl font-display font-bold">Empty Baseplate</h3>
                <p className="text-sm text-muted-foreground">A classic empty place — just a green baseplate and sky</p>
              </div>
            </div>
            <div className="p-6 flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">By SODABLOX</div>
                <div className="text-xs text-muted-foreground">Max Players: 1</div>
              </div>
              <Button onClick={() => setInGame(true)} size="lg" className="gap-2">
                <LogIn className="w-5 h-5" />
                Play
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Games;
