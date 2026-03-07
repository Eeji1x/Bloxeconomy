import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import {
  Pagination, PaginationContent, PaginationItem, PaginationLink,
  PaginationNext, PaginationPrevious
} from '@/components/ui/pagination';
import { Shield, Search, ArrowUpDown, Users, ChevronLeft } from 'lucide-react';

interface PlayerRow {
  user_id: string;
  username: string;
  numeric_id: number;
  emeralds: number;
  is_banned: boolean | null;
  is_online: boolean | null;
  created_at: string;
  last_seen: string | null;
}

type SortCol = 'numeric_id' | 'username' | 'created_at' | 'emeralds';

const AdminPlayers = () => {
  const { user, isAdmin, isLoading } = useAuth();
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [inventoryValues, setInventoryValues] = useState<Record<string, number>>({});
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState('');
  const [sortCol, setSortCol] = useState<SortCol>('numeric_id');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [limit, setLimit] = useState(25);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && isAdmin) fetchPlayers();
  }, [user, isAdmin, sortCol, sortDir, limit, page, search]);

  const fetchPlayers = async () => {
    setLoading(true);
    const from = page * limit;
    const to = from + limit - 1;

    let query = supabase
      .from('profiles')
      .select('user_id, username, numeric_id, emeralds, is_banned, is_online, created_at, last_seen', { count: 'exact' })
      .order(sortCol, { ascending: sortDir === 'asc' })
      .range(from, to);

    if (search.trim()) {
      query = query.or(`username.ilike.%${search.trim()}%,numeric_id.eq.${parseInt(search) || 0}`);
    }

    const { data, count } = await query;
    if (data) setPlayers(data as PlayerRow[]);
    if (count !== null) setTotalCount(count);

    // Fetch inventory values for these users
    if (data && data.length > 0) {
      const userIds = data.map((p: any) => p.user_id);
      const { data: invData } = await supabase
        .from('user_inventory')
        .select('user_id, catalog_items!inner(price)')
        .in('user_id', userIds);

      if (invData) {
        const vals: Record<string, number> = {};
        invData.forEach((item: any) => {
          const uid = item.user_id;
          vals[uid] = (vals[uid] || 0) + (item.catalog_items?.price || 0);
        });
        setInventoryValues(vals);
      }
    }

    setLoading(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || !isAdmin) return <Navigate to="/" replace />;

  const totalPages = Math.ceil(totalCount / limit);

  const getStatus = (p: PlayerRow) => {
    if (p.is_banned) return { label: 'Banned', cls: 'text-destructive bg-destructive/20' };
    return { label: 'OK', cls: 'text-accent bg-accent/20' };
  };

  const SortButton = ({ col, children }: { col: SortCol; children: React.ReactNode }) => (
    <button
      onClick={() => {
        if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortCol(col); setSortDir('asc'); }
        setPage(0);
      }}
      className="flex items-center gap-1 hover:text-primary transition-colors"
    >
      {children}
      {sortCol === col && <ArrowUpDown className="w-3 h-3 text-primary" />}
    </button>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/admin">
          <Button variant="ghost" size="icon"><ChevronLeft className="w-5 h-5" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            Players
          </h1>
          <p className="text-sm text-muted-foreground">{totalCount} total players</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search username or ID..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="pl-9 h-10 bg-input"
          />
        </div>

        <select
          value={limit}
          onChange={(e) => { setLimit(Number(e.target.value)); setPage(0); }}
          className="h-10 rounded-md border bg-input px-3 text-sm"
        >
          <option value={10}>10 per page</option>
          <option value={25}>25 per page</option>
          <option value={50}>50 per page</option>
          <option value={100}>100 per page</option>
        </select>
      </div>

      {/* Table */}
      <div className="cyber-card p-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border/50">
              <TableHead><SortButton col="numeric_id">ID</SortButton></TableHead>
              <TableHead><SortButton col="username">Username</SortButton></TableHead>
              <TableHead><SortButton col="created_at">Created</SortButton></TableHead>
              <TableHead>Last Online</TableHead>
              <TableHead>Status</TableHead>
              <TableHead><SortButton col="emeralds">Emeralds</SortButton></TableHead>
              <TableHead>Inv. Value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12">
                  <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : players.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  No players found
                </TableCell>
              </TableRow>
            ) : (
              players.map((p) => {
                const status = getStatus(p);
                return (
                  <TableRow key={p.user_id} className="border-border/30 hover:bg-primary/5">
                    <TableCell className="font-mono text-muted-foreground">#{p.numeric_id}</TableCell>
                    <TableCell>
                      <Link
                        to={`/admin/players/${p.user_id}`}
                        className="font-semibold text-primary hover:underline"
                      >
                        {p.username}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(p.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {p.is_online ? (
                        <span className="text-accent flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-accent" /> Online
                        </span>
                      ) : p.last_seen ? (
                        new Date(p.last_seen).toLocaleDateString()
                      ) : 'Never'}
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${status.cls}`}>
                        {status.label}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono">
                      💎 {p.emeralds.toLocaleString()}
                    </TableCell>
                    <TableCell className="font-mono text-muted-foreground">
                      💎 {(inventoryValues[p.user_id] || 0).toLocaleString()}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => setPage(p => Math.max(0, p - 1))}
                className={page === 0 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
              />
            </PaginationItem>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              const pageNum = totalPages <= 7 ? i : 
                page < 3 ? i :
                page > totalPages - 4 ? totalPages - 7 + i :
                page - 3 + i;
              return (
                <PaginationItem key={pageNum}>
                  <PaginationLink
                    isActive={page === pageNum}
                    onClick={() => setPage(pageNum)}
                    className="cursor-pointer"
                  >
                    {pageNum + 1}
                  </PaginationLink>
                </PaginationItem>
              );
            })}
            <PaginationItem>
              <PaginationNext
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                className={page >= totalPages - 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
};

export default AdminPlayers;
