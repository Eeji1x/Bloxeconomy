import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { forceDeleteItem } from '@/lib/forceDeleteItem';

const AdminCMD = () => {
  const { profile } = useAuth();
  const [lines, setLines] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [siteStats, setSiteStats] = useState({
    totalUsers: 0,
    onlineUsers: 0,
    totalItems: 0,
    totalLimiteds: 0,
    totalTrades: 0,
    totalListings: 0,
  });
  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [lines]);

  const fetchStats = async () => {
    const [users, online, items, limiteds, trades, listings] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('is_online', true),
      supabase.from('catalog_items').select('id', { count: 'exact', head: true }),
      supabase.from('catalog_items').select('id', { count: 'exact', head: true }).eq('item_type', 'limited'),
      supabase.from('trades').select('id', { count: 'exact', head: true }),
      supabase.from('resale_listings').select('id', { count: 'exact', head: true }).eq('is_active', true),
    ]);

    setSiteStats({
      totalUsers: users.count || 0,
      onlineUsers: online.count || 0,
      totalItems: items.count || 0,
      totalLimiteds: limiteds.count || 0,
      totalTrades: trades.count || 0,
      totalListings: listings.count || 0,
    });
  };

  const getNeofetch = () => {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const uptime = 'Since Launch';

    const logo = [
      '   ██████╗  ██████╗ ██████╗  █████╗ ',
      '  ██╔════╝ ██╔═══██╗██╔══██╗██╔══██╗',
      '  ╚█████╗  ██║   ██║██║  ██║███████║',
      '   ╚═══██╗ ██║   ██║██║  ██║██╔══██║',
      '  ██████╔╝ ╚██████╔╝██████╔╝██║  ██║',
      '  ╚═════╝   ╚═════╝ ╚═════╝ ╚═╝  ╚═╝',
      '  ██████╗ ██╗      ██████╗ ██╗  ██╗  ',
      '  ██╔══██╗██║     ██╔═══██╗╚██╗██╔╝  ',
      '  ██████╔╝██║     ██║   ██║ ╚███╔╝   ',
      '  ██╔══██╗██║     ██║   ██║ ██╔██╗   ',
      '  ██████╔╝███████╗╚██████╔╝██╔╝ ██╗  ',
      '  ╚═════╝ ╚══════╝ ╚═════╝ ╚═╝  ╚═╝  ',
    ];

    const info = [
      '',
      `  \x1b[36mSite:\x1b[0m        BloxEconomy`,
      `  \x1b[36mURL:\x1b[0m         sodablx.lovable.app`,
      `  \x1b[36mDate:\x1b[0m        ${dateStr}`,
      `  \x1b[36mTime:\x1b[0m        ${timeStr}`,
      `  \x1b[36mUptime:\x1b[0m      ${uptime}`,
      `  \x1b[36mOwner:\x1b[0m       Eeji1x`,
      '',
      `  \x1b[33mUsers:\x1b[0m       ${siteStats.totalUsers} total, ${siteStats.onlineUsers} online`,
      `  \x1b[33mCatalog:\x1b[0m     ${siteStats.totalItems} items (${siteStats.totalLimiteds} limiteds)`,
      `  \x1b[33mTrades:\x1b[0m      ${siteStats.totalTrades} total`,
      `  \x1b[33mListings:\x1b[0m    ${siteStats.totalListings} active`,
    ];

    const result: string[] = [];
    const maxLen = Math.max(logo.length, info.length);
    for (let i = 0; i < maxLen; i++) {
      const left = logo[i] || '                                      ';
      const right = info[i] || '';
      result.push(left + right);
    }
    return result;
  };

  const generateInviteKey = (): string => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const segment = (len: number) =>
      Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    return `INV-${segment(5)}-${segment(5)}`;
  };

  const processCommand = async (cmd: string) => {
    const trimmed = cmd.trim().toLowerCase();
    const newLines = [...lines, `\x1b[32mroot@bloxeconomy\x1b[0m:\x1b[34m~\x1b[0m$ ${cmd}`];

    if (!trimmed) {
      setLines(newLines);
      return;
    }

    // Generate invite keys command
    const genMatch = trimmed.match(/^generate\s+inv\s+keys?\s+(\d+)$/);
    if (genMatch) {
      const count = Math.min(parseInt(genMatch[1]), 50); // cap at 50
      if (count <= 0) {
        setLines([...newLines, '  \x1b[31mError:\x1b[0m Number must be at least 1.']);
        return;
      }
      setLines([...newLines, `  Generating ${count} invite key(s)...`]);

      const userId = profile?.user_id;
      if (!userId) {
        setLines([...newLines, '  \x1b[31mError:\x1b[0m Not authenticated.']);
        return;
      }

      const { hashKey, inviteKeyPrefix } = await import('@/lib/hashKey');
      const rawKeys = Array.from({ length: count }, () => generateInviteKey());
      const keysToInsert = await Promise.all(rawKeys.map(async (k) => ({
        key_hash: await hashKey(k),
        key_prefix: inviteKeyPrefix(k),
        created_by: userId,
      })));

      const { error } = await supabase
        .from('invite_keys')
        .insert(keysToInsert);

      if (error) {
        setLines([...newLines, `  \x1b[31mError:\x1b[0m ${error.message}`]);
      } else {
        setLines([
          ...newLines,
          '',
          `  \x1b[32m✓\x1b[0m Successfully generated \x1b[33m${rawKeys.length}\x1b[0m invite key(s) (one-time reveal):`,
          '',
          ...rawKeys.map(k => `  \x1b[36m${k}\x1b[0m`),
          '',
          '  \x1b[33m!\x1b[0m Save these now — keys are hashed and cannot be recovered.',
          '',
        ]);
      }
      return;
    }

    // Force delete item command
    const deleteMatch = trimmed.match(/^force\s+delete\s+item\s+(.+)$/);
    if (deleteMatch) {
      const searchName = cmd.trim().replace(/^force\s+delete\s+item\s+/i, '');
      setLines([...newLines, `  Searching for "${searchName}"...`]);

      const { data: items } = await supabase
        .from('catalog_items')
        .select('id, name, item_type')
        .ilike('name', `%${searchName}%`);

      if (!items || items.length === 0) {
        setLines([...newLines, `  \x1b[31mError:\x1b[0m No item found matching "${searchName}".`]);
        return;
      }

      if (items.length > 1) {
        setLines([
          ...newLines, '',
          `  Found ${items.length} items matching "${searchName}":`, '',
          ...items.map(i => `  \x1b[36m${i.name}\x1b[0m (${i.item_type}) — ${i.id}`),
          '', '  Please use a more specific name.',
        ]);
        return;
      }

      const target = items[0];
      const { success, error } = await forceDeleteItem(target.id);
      if (success) {
        setLines([
          ...newLines, '',
          `  \x1b[32m✓\x1b[0m Force-deleted \x1b[33m${target.name}\x1b[0m (${target.item_type})`,
          '  Removed: inventory, serials, listings, values, tags, history', '',
        ]);
      } else {
        setLines([...newLines, `  \x1b[31mError:\x1b[0m ${error}`]);
      }
      return;
    }

    if (trimmed === 'neofetch') {
      await fetchStats();
      setLines([...newLines, '', ...getNeofetch(), '']);
    } else if (trimmed === 'help') {
      setLines([...newLines,
        '',
        '  Available commands:',
        '',
        '  \x1b[36mneofetch\x1b[0m                    - Display system information',
        '  \x1b[36mstats\x1b[0m                       - Show live site statistics',
        '  \x1b[36musers\x1b[0m                       - List online users',
        '  \x1b[36mwhoami\x1b[0m                      - Show current user info',
        '  \x1b[36mdate\x1b[0m                        - Show current date/time',
        '  \x1b[36mgenerate inv keys <N>\x1b[0m       - Generate N invite keys (max 50)',
        '  \x1b[36mforce delete item <name>\x1b[0m    - Force-delete item & all related data',
        '  \x1b[36mclear\x1b[0m                       - Clear terminal',
        '  \x1b[36mhelp\x1b[0m                        - Show this message',
        '',
      ]);
    } else if (trimmed === 'clear') {
      setLines([]);
    } else if (trimmed === 'whoami') {
      setLines([...newLines, `  ${profile?.username || 'unknown'} (ID: ${profile?.numeric_id || '?'})`]);
    } else if (trimmed === 'date') {
      setLines([...newLines, `  ${new Date().toString()}`]);
    } else if (trimmed === 'stats') {
      await fetchStats();
      setLines([...newLines,
        '',
        `  \x1b[36mTotal Users:\x1b[0m     ${siteStats.totalUsers}`,
        `  \x1b[36mOnline Users:\x1b[0m    ${siteStats.onlineUsers}`,
        `  \x1b[36mCatalog Items:\x1b[0m   ${siteStats.totalItems}`,
        `  \x1b[36mLimited Items:\x1b[0m   ${siteStats.totalLimiteds}`,
        `  \x1b[36mTotal Trades:\x1b[0m    ${siteStats.totalTrades}`,
        `  \x1b[36mActive Listings:\x1b[0m  ${siteStats.totalListings}`,
        '',
      ]);
    } else if (trimmed === 'users') {
      const { data } = await supabase
        .from('profiles')
        .select('username, numeric_id')
        .eq('is_online', true)
        .order('numeric_id');
      
      if (data && data.length > 0) {
        setLines([...newLines, '', `  Online users (${data.length}):`, '',
          ...data.map(u => `  \x1b[32m●\x1b[0m ${u.username} (ID: ${u.numeric_id})`),
          '',
        ]);
      } else {
        setLines([...newLines, '  No users online.']);
      }
    } else {
      setLines([...newLines, `  \x1b[31mCommand not found:\x1b[0m ${trimmed}. Type \x1b[36mhelp\x1b[0m for available commands.`]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      processCommand(input);
      setInput('');
    }
  };

  // Parse ANSI-like color codes to spans
  const renderLine = (line: string, idx: number) => {
    const parts: React.ReactNode[] = [];
    let remaining = line;
    let key = 0;

    const colorMap: Record<string, string> = {
      '31': 'hsl(var(--destructive))',
      '32': 'hsl(var(--accent))',
      '33': '#e5c07b',
      '34': '#61afef',
      '36': '#56b6c2',
      '0': '',
    };

    while (remaining.length > 0) {
      const match = remaining.match(/\x1b\[(\d+)m/);
      if (!match) {
        parts.push(<span key={key++}>{remaining}</span>);
        break;
      }

      const before = remaining.substring(0, match.index);
      if (before) parts.push(<span key={key++}>{before}</span>);

      const colorCode = match[1];
      remaining = remaining.substring(match.index! + match[0].length);

      // Find end of colored section
      const endMatch = remaining.match(/\x1b\[\d+m/);
      if (endMatch) {
        const coloredText = remaining.substring(0, endMatch.index);
        const color = colorMap[colorCode] || '';
        parts.push(
          <span key={key++} style={{ color: color || undefined }}>
            {coloredText}
          </span>
        );
        remaining = remaining.substring(endMatch.index!);
        // Skip the reset code
        const resetMatch = remaining.match(/^\x1b\[\d+m/);
        if (resetMatch) {
          remaining = remaining.substring(resetMatch[0].length);
        }
      } else {
        const color = colorMap[colorCode] || '';
        parts.push(
          <span key={key++} style={{ color: color || undefined }}>
            {remaining}
          </span>
        );
        remaining = '';
      }
    }

    return (
      <div key={idx} className="whitespace-pre" style={{ lineHeight: '1.4' }}>
        {parts.length > 0 ? parts : '\u00A0'}
      </div>
    );
  };

  return (
    <div
      className="bg-[#1e1e2e] rounded-xl border border-[#313244] overflow-hidden font-mono text-sm shadow-2xl"
      onClick={() => inputRef.current?.focus()}
    >
      {/* Title bar */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-[#181825] border-b border-[#313244]">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[#f38ba8]" />
          <div className="w-3 h-3 rounded-full bg-[#f9e2af]" />
          <div className="w-3 h-3 rounded-full bg-[#a6e3a1]" />
        </div>
        <span className="text-[#cdd6f4] text-xs ml-2">root@sodablox: ~</span>
      </div>

      {/* Terminal body */}
      <div
        ref={terminalRef}
        className="p-4 h-[500px] overflow-y-auto text-[#cdd6f4] cursor-text"
        style={{ scrollbarWidth: 'thin', scrollbarColor: '#45475a #1e1e2e' }}
      >
        {/* Welcome message */}
        {lines.length === 0 && (
          <div className="mb-2 text-[#6c7086]">
            BloxEconomy Terminal v1.0 — Type <span className="text-[#56b6c2]">help</span> for commands, <span className="text-[#56b6c2]">neofetch</span> for system info.
          </div>
        )}

        {lines.map((line, idx) => renderLine(line, idx))}

        {/* Input line */}
        <div className="flex items-center whitespace-pre">
          <span className="text-[#a6e3a1]">root@sodablox</span>
          <span className="text-[#cdd6f4]">:</span>
          <span className="text-[#89b4fa]">~</span>
          <span className="text-[#cdd6f4]">$ </span>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent outline-none text-[#cdd6f4] caret-[#f5c2e7]"
            autoFocus
            spellCheck={false}
          />
        </div>
      </div>
    </div>
  );
};

export default AdminCMD;
