import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Sky, PointerLockControls } from '@react-three/drei';
import * as THREE from 'three';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { GameChat } from '@/components/games/GameChat';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Swords } from 'lucide-react';

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
}

const ARENA_RADIUS = 30;
const SWORD_RANGE = 4.5;
const SWORD_DAMAGE = 50;
const PLAYER_MAX_HP = 100;
const RESPAWN_MS = 3500;

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

// ─── Game scene + first-person controller ──────────────────────────────────
const GameScene = ({
  onKill,
  onDamageTaken,
  myUsername,
}: {
  onKill: (botName: string) => void;
  onDamageTaken: (amount: number) => void;
  myUsername: string;
}) => {
  const { camera } = useThree();
  const playerPos = useRef(new THREE.Vector3(0, 0, 5));
  const playerVelY = useRef(0);
  const onGround = useRef(true);
  const keys = useRef<Record<string, boolean>>({});
  const swinging = useRef(false);
  const swingAt = useRef(0);

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
      keys.current[e.code.toLowerCase()] = true;
      if (e.code === 'Space' && onGround.current) {
        playerVelY.current = 6;
        onGround.current = false;
      }
    };
    const onUp = (e: KeyboardEvent) => { keys.current[e.code.toLowerCase()] = false; };
    const onClick = () => {
      if (Date.now() - swingAt.current < 350) return;
      swinging.current = true;
      swingAt.current = Date.now();
      setTimeout(() => { swinging.current = false; }, 250);
      // Damage check
      const forward = new THREE.Vector3();
      camera.getWorldDirection(forward);
      forward.y = 0;
      forward.normalize();
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
      setTick((x) => x + 1);
    };

    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    window.addEventListener('mousedown', onClick);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      window.removeEventListener('mousedown', onClick);
    };
  }, [camera, onKill, myUsername]);

  useFrame((_, dt) => {
    // Player movement
    const speed = 6;
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();
    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0));

    const move = new THREE.Vector3();
    if (keys.current['keyw']) move.add(forward);
    if (keys.current['keys']) move.sub(forward);
    if (keys.current['keya']) move.sub(right);
    if (keys.current['keyd']) move.add(right);
    if (move.lengthSq() > 0) {
      move.normalize().multiplyScalar(speed * dt);
      playerPos.current.add(move);
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

    // Camera tracks player at eye height
    camera.position.set(playerPos.current.x, playerPos.current.y + 1.6, playerPos.current.z);

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
      {bots.current.map((bot) => <BotCharacter key={bot.id} bot={bot} />)}
      {/* Self avatar isn't rendered (we are first-person) but a sword in hand */}
    </>
  );
};

const SwordFight = () => {
  const { user, profile } = useAuth();
  const [hp, setHp] = useState(PLAYER_MAX_HP);
  const [kills, setKills] = useState(0);
  const [isPointerLocked, setIsPointerLocked] = useState(false);
  const [presence, setPresence] = useState<PresenceUser[]>([]);

  const myUsername = (profile?.username as string) || user?.email?.split('@')[0] || 'Player';

  // Persist kill to Supabase
  const handleKill = async (_botName: string) => {
    setKills((k) => k + 1);
    try { await supabase.rpc('record_sword_fight_kill', { p_username: myUsername }); }
    catch (e) { console.warn('Failed to record kill', e); }
  };

  const handleDamage = (amount: number) => {
    setHp((prev) => {
      const next = Math.max(0, prev - amount);
      if (next === 0) {
        // Death
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
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users: PresenceUser[] = [];
        Object.values(state).forEach((entries) => {
          (entries as Array<{ user_id?: string; username?: string }>).forEach((e) => {
            if (e.user_id && e.username) users.push({ user_id: e.user_id, username: e.username, pos: [0, 0, 0] });
          });
        });
        setPresence(users);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ user_id: user.id, username: myUsername });
        }
      });
    return () => { supabase.removeChannel(channel); };
  }, [user, myUsername]);

  // Lock pointer on click into canvas
  useEffect(() => {
    const onLock = () => setIsPointerLocked(document.pointerLockElement !== null);
    document.addEventListener('pointerlockchange', onLock);
    return () => document.removeEventListener('pointerlockchange', onLock);
  }, []);

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
        <PointerLockControls />
        <GameScene onKill={handleKill} onDamageTaken={handleDamage} myUsername={myUsername} />
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

      {/* Crosshair */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none">
        <div className="w-2 h-2 rounded-full border border-white/80" />
      </div>

      {/* Controls hint */}
      {!isPointerLocked && (
        <div className="absolute inset-0 flex items-center justify-center z-40 bg-black/60 pointer-events-none">
          <div className="text-center text-white">
            <div className="text-2xl font-bold mb-2" style={{ fontFamily: 'Orbitron, sans-serif' }}>Sword Fight</div>
            <div className="text-sm mb-1">Click anywhere to lock cursor and play.</div>
            <div className="text-xs text-white/70">WASD move • Space jump • Click swing • Esc to release cursor</div>
          </div>
        </div>
      )}

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
