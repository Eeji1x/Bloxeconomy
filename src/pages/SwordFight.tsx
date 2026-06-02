import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Sky } from '@react-three/drei';
import * as THREE from 'three';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { GameChat } from '@/components/games/GameChat';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Swords } from 'lucide-react';
import { toast } from 'sonner';

interface Bot {
  id: string;
  name: string;
  pos: THREE.Vector3;
  hp: number;
  alive: boolean;
  respawnAt: number;
  velocityY: number;
}

interface PresenceUser {
  user_id: string;
  username: string;
  pos: [number, number, number];
  hp?: number;
}

const ARENA_RADIUS = 30;
const SWORD_RANGE = 4.5;
const SWORD_DAMAGE = 50;
const PLAYER_MAX_HP = 100;
const RESPAWN_MS = 3500;

type Keys = { w: boolean; a: boolean; s: boolean; d: boolean; space: boolean };

// ─── Player avatar (cube with sword) ────────────────────────────────────────
const PlayerCharacter = ({ position, swinging }: { position: THREE.Vector3; swinging: boolean }) => {
  const swordRef = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (!swordRef.current) return;
    const target = swinging ? -Math.PI / 2 : 0;
    swordRef.current.rotation.x += (target - swordRef.current.rotation.x) * Math.min(1, dt * 12);
  });
  return (
    <group position={position}>
      <mesh castShadow position={[0, 0.5, 0]}>
        <boxGeometry args={[0.8, 1.6, 0.5]} />
        <meshStandardMaterial color="#22ddff" emissive="#0066aa" emissiveIntensity={0.3} />
      </mesh>
      <group ref={swordRef} position={[0.6, 0.7, 0]}>
        <mesh position={[0, 0.6, 0]}>
          <boxGeometry args={[0.08, 1.4, 0.08]} />
          <meshStandardMaterial color="#cccccc" metalness={0.9} roughness={0.2} />
        </mesh>
        <mesh position={[0, -0.05, 0]}>
          <boxGeometry args={[0.4, 0.1, 0.1]} />
          <meshStandardMaterial color="#ffaa00" />
        </mesh>
      </group>
    </group>
  );
};

const BotCharacter = ({ bot }: { bot: Bot }) => {
  if (!bot.alive) return null;
  return (
    <group position={bot.pos.toArray()}>
      <mesh castShadow position={[0, 0.5, 0]}>
        <boxGeometry args={[0.8, 1.6, 0.5]} />
        <meshStandardMaterial color={bot.hp < 30 ? '#ff3344' : '#ff7733'} emissive="#aa1111" emissiveIntensity={0.2} />
      </mesh>
      {/* Sword */}
      <mesh position={[0.5, 0.8, 0]} rotation={[0, 0, Math.PI / 4]}>
        <boxGeometry args={[0.08, 1.2, 0.08]} />
        <meshStandardMaterial color="#aaaaaa" metalness={0.9} roughness={0.2} />
      </mesh>
      {/* HP bar */}
      <group position={[0, 2.4, 0]}>
        <mesh>
          <planeGeometry args={[1.2, 0.16]} />
          <meshBasicMaterial color="#222" />
        </mesh>
        <mesh position={[(1.2 * (bot.hp / 100 - 1)) / 2, 0, 0.001]}>
          <planeGeometry args={[1.2 * (bot.hp / 100), 0.14]} />
          <meshBasicMaterial color="#ff5555" />
        </mesh>
      </group>
    </group>
  );
};

// ─── Arena ──────────────────────────────────────────────────────────────────
const Arena = () => {
  return (
    <>
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <circleGeometry args={[ARENA_RADIUS, 64]} />
        <meshStandardMaterial color="#3a2a4a" />
      </mesh>
      {/* Walls */}
      {Array.from({ length: 32 }).map((_, i) => {
        const angle = (i / 32) * Math.PI * 2;
        const x = Math.cos(angle) * ARENA_RADIUS;
        const z = Math.sin(angle) * ARENA_RADIUS;
        return (
          <mesh key={i} position={[x, 1, z]} castShadow>
            <boxGeometry args={[2, 2, 2]} />
            <meshStandardMaterial color="#553377" emissive="#220033" emissiveIntensity={0.3} />
          </mesh>
        );
      })}
      {/* Center pillar */}
      <mesh position={[0, 2, 0]} castShadow>
        <cylinderGeometry args={[1, 1, 4, 16]} />
        <meshStandardMaterial color="#22ddff" emissive="#0099cc" emissiveIntensity={0.5} />
      </mesh>
    </>
  );
};

const RemotePlayer = ({ player }: { player: PresenceUser }) => (
  <group position={player.pos}>
    <mesh castShadow position={[0, 0.5, 0]}>
      <boxGeometry args={[0.8, 1.6, 0.5]} />
      <meshStandardMaterial color="#7dd3fc" emissive="#075985" emissiveIntensity={0.2} />
    </mesh>
    <mesh position={[0.5, 0.8, 0]} rotation={[0, 0, Math.PI / 4]}>
      <boxGeometry args={[0.08, 1.2, 0.08]} />
      <meshStandardMaterial color="#d1d5db" metalness={0.8} roughness={0.25} />
    </mesh>
  </group>
);

// ─── Game scene + third-person controller ──────────────────────────────────
const GameScene = ({
  onKill,
  onDamageTaken,
  myUsername,
  presence,
  onPosition,
  onSwingAtPlayer,
}: {
  onKill: (botName: string) => void;
  onDamageTaken: (amount: number) => void;
  myUsername: string;
  presence: PresenceUser[];
  onPosition: (pos: [number, number, number]) => void;
  onSwingAtPlayer: (targetUserId: string) => void;
}) => {
  const { camera } = useThree();
  const playerPos = useRef(new THREE.Vector3(0, 0, 5));
  const playerYaw = useRef(0);
  const cameraYaw = useRef(0);
  const cameraPitch = useRef(0.35);
  const playerVelY = useRef(0);
  const onGround = useRef(true);
  const keys = useRef<Keys>({ w: false, a: false, s: false, d: false, space: false });
  const swinging = useRef(false);
  const swingAt = useRef(0);
  const lastTrackAt = useRef(0);

  const [, setTick] = useState(0);
  const bots = useRef<Bot[]>(
    Array.from({ length: 4 }).map((_, i) => ({
      id: `bot-${i}`,
      name: `Bot${i + 1}`,
      pos: new THREE.Vector3(Math.cos((i / 4) * Math.PI * 2) * 12, 0, Math.sin((i / 4) * Math.PI * 2) * 12),
      hp: PLAYER_MAX_HP,
      alive: true,
      respawnAt: 0,
      velocityY: 0,
    })),
  );

  useEffect(() => {
    void myUsername;
    const onDown = (e: KeyboardEvent) => {
      const map: Record<string, keyof Keys> = { KeyW: 'w', KeyA: 'a', KeyS: 's', KeyD: 'd', Space: 'space' };
      const key = map[e.code];
      if (!key) return;
      if (key === 'space') e.preventDefault();
      keys.current[key] = true;
      if (key === 'space' && onGround.current) {
        playerVelY.current = 6;
        onGround.current = false;
      }
    };
    const onUp = (e: KeyboardEvent) => {
      const map: Record<string, keyof Keys> = { KeyW: 'w', KeyA: 'a', KeyS: 's', KeyD: 'd', Space: 'space' };
      const key = map[e.code];
      if (key) keys.current[key] = false;
    };
    const swing = () => {
      if (Date.now() - swingAt.current < 350) return;
      swinging.current = true;
      swingAt.current = Date.now();
      setTimeout(() => { swinging.current = false; }, 250);
      // Damage check
      const forward = new THREE.Vector3(Math.sin(playerYaw.current), 0, Math.cos(playerYaw.current));
      bots.current.forEach((bot) => {
        if (!bot.alive) return;
        const toBot = bot.pos.clone().sub(playerPos.current);
        const dist = toBot.length();
        if (dist < SWORD_RANGE) {
          const dot = forward.dot(toBot.normalize());
          if (dot > 0.4) {
            bot.hp -= SWORD_DAMAGE;
            if (bot.hp <= 0) {
              bot.alive = false;
              bot.respawnAt = Date.now() + RESPAWN_MS;
              onKill(bot.name);
            }
          }
        }
      });
      presence.forEach((player) => {
        if (player.user_id && player.user_id !== 'self') {
          const target = new THREE.Vector3(...player.pos);
          const toPlayer = target.sub(playerPos.current);
          if (toPlayer.length() < SWORD_RANGE && forward.dot(toPlayer.normalize()) > 0.35) {
            onSwingAtPlayer(player.user_id);
          }
        }
      });
      setTick((x) => x + 1);
    };

    (window as unknown as { __swordFightSetKeys?: (next: Partial<Keys>) => void; __swordFightSwing?: () => void }).__swordFightSetKeys = (next) => {
      keys.current = { ...keys.current, ...next };
    };
    (window as unknown as { __swordFightSwing?: () => void }).__swordFightSwing = swing;

    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    window.addEventListener('mousedown', swing);
    return () => {
      delete (window as unknown as { __swordFightSetKeys?: unknown }).__swordFightSetKeys;
      delete (window as unknown as { __swordFightSwing?: unknown }).__swordFightSwing;
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      window.removeEventListener('mousedown', swing);
    };
  }, [onKill, myUsername, onSwingAtPlayer, presence]);

  useEffect(() => {
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    const down = (e: PointerEvent) => { dragging = true; lastX = e.clientX; lastY = e.clientY; };
    const up = () => { dragging = false; };
    const move = (e: PointerEvent) => {
      if (!dragging) return;
      cameraYaw.current -= (e.clientX - lastX) * 0.006;
      cameraPitch.current = Math.max(-0.25, Math.min(0.9, cameraPitch.current - (e.clientY - lastY) * 0.004));
      lastX = e.clientX; lastY = e.clientY;
    };
    window.addEventListener('pointerdown', down);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointermove', move);
    return () => {
      window.removeEventListener('pointerdown', down);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointermove', move);
    };
  }, []);

  useFrame((_, dt) => {
    // Player movement
    const speed = 6;
    const forward = new THREE.Vector3(Math.sin(cameraYaw.current), 0, Math.cos(cameraYaw.current));
    const right = new THREE.Vector3(Math.cos(cameraYaw.current), 0, -Math.sin(cameraYaw.current));

    const move = new THREE.Vector3();
    if (keys.current.w) move.add(forward);
    if (keys.current.s) move.sub(forward);
    if (keys.current.a) move.sub(right);
    if (keys.current.d) move.add(right);
    if (move.lengthSq() > 0) {
      move.normalize().multiplyScalar(speed * dt);
      playerPos.current.add(move);
      playerYaw.current = Math.atan2(move.x, move.z);
    }
    // Clamp to arena
    const horiz = playerPos.current.clone(); horiz.y = 0;
    if (horiz.length() > ARENA_RADIUS - 1) {
      horiz.setLength(ARENA_RADIUS - 1);
      playerPos.current.x = horiz.x;
      playerPos.current.z = horiz.z;
    }

    // Gravity
    playerVelY.current -= 16 * dt;
    playerPos.current.y += playerVelY.current * dt;
    if (playerPos.current.y <= 0) { playerPos.current.y = 0; playerVelY.current = 0; onGround.current = true; }

    const camDistance = 9;
    const camTarget = playerPos.current.clone().add(new THREE.Vector3(0, 1.4, 0));
    const camOffset = new THREE.Vector3(
      -Math.sin(cameraYaw.current) * Math.cos(cameraPitch.current) * camDistance,
      3 + Math.sin(cameraPitch.current) * camDistance,
      -Math.cos(cameraYaw.current) * Math.cos(cameraPitch.current) * camDistance,
    );
    camera.position.lerp(camTarget.clone().add(camOffset), 0.18);
    camera.lookAt(camTarget);

    if (Date.now() - lastTrackAt.current > 120) {
      lastTrackAt.current = Date.now();
      onPosition([playerPos.current.x, playerPos.current.y, playerPos.current.z]);
    }

    // Bot AI: chase + attack
    bots.current.forEach((bot) => {
      if (!bot.alive) {
        if (Date.now() >= bot.respawnAt) {
          const angle = Math.random() * Math.PI * 2;
          bot.pos.set(Math.cos(angle) * 12, 0, Math.sin(angle) * 12);
          bot.hp = PLAYER_MAX_HP;
          bot.alive = true;
        }
        return;
      }
      const toPlayer = playerPos.current.clone().sub(bot.pos);
      const dist = toPlayer.length();
      if (dist > 1.8) {
        toPlayer.normalize().multiplyScalar(2.5 * dt);
        bot.pos.add(toPlayer);
      } else if (Math.random() < dt * 0.6) {
        // Attack
        onDamageTaken(8);
      }
    });
    setTick((x) => (x + 1) % 1000);
  });

  return (
    <>
      <Arena />
      <PlayerCharacter position={playerPos.current} swinging={swinging.current} />
      {presence.map((player) => <RemotePlayer key={player.user_id} player={player} />)}
      {bots.current.map((bot) => <BotCharacter key={bot.id} bot={bot} />)}
    </>
  );
};

const MobileSwordControls = () => {
  const setKeys = (next: Partial<Keys>) => {
    (window as unknown as { __swordFightSetKeys?: (next: Partial<Keys>) => void }).__swordFightSetKeys?.(next);
  };

  const keyButton = (label: string, keyName: keyof Keys) => (
    <button
      className="w-14 h-14 rounded-xl bg-white/15 border border-white/25 text-white font-bold active:bg-white/30 select-none touch-none"
      onTouchStart={(e) => { e.preventDefault(); setKeys({ [keyName]: true }); }}
      onTouchEnd={(e) => { e.preventDefault(); setKeys({ [keyName]: false }); }}
      onMouseDown={() => setKeys({ [keyName]: true })}
      onMouseUp={() => setKeys({ [keyName]: false })}
    >
      {label}
    </button>
  );

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 flex justify-between items-end pointer-events-none sm:hidden">
      <div className="pointer-events-auto flex flex-col items-center gap-1">
        {keyButton('▲', 'w')}
        <div className="flex gap-1">{keyButton('◀', 'a')}{keyButton('▼', 's')}{keyButton('▶', 'd')}</div>
      </div>
      <div className="pointer-events-auto flex gap-2">
        <button className="w-16 h-16 rounded-full bg-white/15 border border-white/25 text-white text-xs font-bold active:bg-white/30" onClick={() => (window as unknown as { __swordFightSwing?: () => void }).__swordFightSwing?.()}>SWING</button>
        <button className="w-16 h-16 rounded-full bg-white/15 border border-white/25 text-white text-xs font-bold active:bg-white/30" onTouchStart={(e) => { e.preventDefault(); setKeys({ space: true }); }} onTouchEnd={(e) => { e.preventDefault(); setKeys({ space: false }); }}>JUMP</button>
      </div>
    </div>
  );
};

const SwordFight = () => {
  const { user, profile } = useAuth();
  const [hp, setHp] = useState(PLAYER_MAX_HP);
  const [kills, setKills] = useState(0);
  const [presence, setPresence] = useState<PresenceUser[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const myUsername = (profile?.username as string) || user?.email?.split('@')[0] || 'Player';

  // Persist kill to Supabase
  const handleKill = async (_botName: string) => {
    setKills((k) => k + 1);
    try { await supabase.rpc('record_sword_fight_kill', { p_username: myUsername }); }
    catch (e) { console.warn('Failed to record kill', e); }
  };

  const handleDamage = (amount: number) => {
    setHp((prev) => {
      if (prev <= 0) return prev; // already dead — ignore further hits during respawn window
      const next = Math.max(0, prev - amount);
      if (next === 0) {
        try { void supabase.rpc('record_sword_fight_death'); } catch { /* */ }
        setTimeout(() => setHp(PLAYER_MAX_HP), 1500);
      }
      return next;
    });
  };

  // Clear our score when leaving the page
  useEffect(() => {
    return () => {
      try { void supabase.rpc('clear_sword_fight_score'); } catch { /* */ }
    };
  }, []);

  // Presence (per sword-fight room)
  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel('sword_fight_room', { config: { presence: { key: user.id } } });
    channelRef.current = channel;
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users: PresenceUser[] = [];
        Object.values(state).forEach((entries) => {
          (entries as Array<{ user_id?: string; username?: string; pos?: [number, number, number]; hp?: number }>).forEach((e) => {
            if (e.user_id && e.username && e.user_id !== user.id) users.push({ user_id: e.user_id, username: e.username, pos: e.pos || [0, 0, 0], hp: e.hp });
          });
        });
        setPresence(users);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ user_id: user.id, username: myUsername, pos: [0, 0, 5], hp });
        }
      });
    return () => { channelRef.current = null; supabase.removeChannel(channel); };
  }, [user, myUsername, hp]);

  if (!user) return <Navigate to="/login" replace />;

  const cameraConfig = useMemo(() => ({ fov: 75, position: [0, 1.6, 5] as [number, number, number] }), []);

  return (
    <div className="fixed inset-0 z-50 bg-black">
      <Canvas
        shadows
        camera={cameraConfig}
        gl={{ antialias: true }}
      >
        <color attach="background" args={['#1a0d2e']} />
        <fog attach="fog" args={['#1a0d2e', 30, 90]} />
        <Sky distance={450} sunPosition={[100, 50, 100]} inclination={0.4} azimuth={0.25} />
        <ambientLight intensity={0.5} />
        <directionalLight castShadow position={[10, 20, 10]} intensity={1} shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
        <GameScene
          onKill={handleKill}
          onDamageTaken={handleDamage}
          myUsername={myUsername}
          presence={presence}
          onPosition={(pos) => { void channelRef.current?.track({ user_id: user.id, username: myUsername, pos, hp }); }}
          onSwingAtPlayer={() => { toast.success('Player hit registered'); }}
        />
      </Canvas>

      {/* HUD */}
      <div className="absolute top-4 left-4 z-50 flex flex-col gap-2">
        <Link to="/games">
          <Button variant="secondary" className="gap-1.5"><ArrowLeft className="w-4 h-4" />Leave</Button>
        </Link>
        <div className="bg-black/70 backdrop-blur px-3 py-2 rounded text-white text-sm border border-primary/40">
          <div className="flex items-center gap-2 mb-1"><Swords className="w-4 h-4 text-primary" /> <span className="font-bold">Sword Fight</span></div>
          <div className="text-xs">HP <span className={hp < 30 ? 'text-red-400' : 'text-green-400'}>{hp}</span> / {PLAYER_MAX_HP}</div>
          <div className="text-xs">Kills: <span className="text-amber-300 font-bold">{kills}</span></div>
          <div className="text-xs text-white/70">Players online: {presence.length}</div>
        </div>
      </div>

      {/* HP bar (top center) */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50">
        <div className="bg-black/60 backdrop-blur px-3 py-1.5 rounded border border-primary/30">
          <div className="text-xs text-white/80 mb-0.5 text-center">HP</div>
          <div className="w-48 h-3 rounded overflow-hidden bg-black/50">
            <div
              className="h-full transition-all"
              style={{
                width: `${(hp / PLAYER_MAX_HP) * 100}%`,
                background: `linear-gradient(90deg, hsl(${Math.max(0, hp / PLAYER_MAX_HP * 120)} 90% 50%), hsl(${Math.max(0, hp / PLAYER_MAX_HP * 120)} 90% 65%))`,
              }}
            />
          </div>
        </div>
      </div>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 hidden sm:block text-white/70 text-xs bg-black/55 px-3 py-1.5 rounded">WASD move • Space jump • Drag to look • Click swing</div>
      <MobileSwordControls />

      <GameChat
        userId={user.id}
        username={myUsername}
        gameName="Sword Fight"
        gameId="sword-fight"
      />
    </div>
  );
};

// Wrapper to keep PlayerCharacter & PresenceUser referenced for the linter and future expansion.
const _refs = () => <PlayerCharacter position={new THREE.Vector3()} swinging={false} />;
void _refs;

export default SwordFight;
