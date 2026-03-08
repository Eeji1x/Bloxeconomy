import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { Layout } from "@/components/layout/Layout";
import Index from "./pages/Index";
import AuthHome from "./pages/AuthHome";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Users from "./pages/Users";
import UserRedirect from "./pages/UserRedirect";
import Profile from "./pages/Profile";
import Catalog from "./pages/Catalog";
import ItemDetail from "./pages/ItemDetail";
import Promocodes from "./pages/Promocodes";
import Trading from "./pages/Trading";
import Avatar from "./pages/Avatar";
import Friends from "./pages/Friends";
import Inbox from "./pages/Inbox";
import Admin from "./pages/Admin";
import AdminPlayers from "./pages/AdminPlayers";
import AdminUserManagement from "./pages/AdminUserManagement";
import Settings from "./pages/Settings";
import Leaderboards from "./pages/Leaderboards";
import Sodamons from "./pages/Sodamons";
import SodamonsItem from "./pages/SodamonsItem";
import SodamonsTop from "./pages/SodamonsTop";
import Banned from "./pages/Banned";
import EmeraldShop from "./pages/EmeraldShop";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const SITE_LOCKED = true; // Set to false to reopen the site

const LockdownScreen = () => (
  <div style={{
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#0a0a0a',
    color: '#ffffff',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    textAlign: 'center',
    padding: '2rem',
  }}>
    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔧</div>
    <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>
      Fixing Stuff
    </h1>
    <p style={{ fontSize: '1.1rem', color: '#888', maxWidth: '400px' }}>
      We're working on some important updates. The site will be back soon.
    </p>
  </div>
);

const App = () => {
  if (SITE_LOCKED) {
    return <LockdownScreen />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ThemeProvider>
            <AuthProvider>
              <Layout>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/auth" element={<AuthHome />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/signup" element={<Signup />} />
                  <Route path="/users" element={<Users />} />
                  <Route path="/users/:username" element={<UserRedirect />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/profile/:userId" element={<Profile />} />
                  <Route path="/catalog" element={<Catalog />} />
                  <Route path="/catalog/:itemSlug" element={<ItemDetail />} />
                  <Route path="/promocodes" element={<Promocodes />} />
                  <Route path="/trading" element={<Trading />} />
                  <Route path="/avatar" element={<Avatar />} />
                  <Route path="/friends" element={<Friends />} />
                  <Route path="/inbox" element={<Inbox />} />
                  <Route path="/admin" element={<Admin />} />
                  <Route path="/admin/players" element={<AdminPlayers />} />
                  <Route path="/admin/players/:userId" element={<AdminUserManagement />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/leaderboards" element={<Leaderboards />} />
                  <Route path="/sodamons" element={<Sodamons />} />
                  <Route path="/sodamons/item/:itemId" element={<SodamonsItem />} />
                  <Route path="/sodamons/top" element={<SodamonsTop />} />
                  <Route path="/emeralds" element={<EmeraldShop />} />
                  <Route path="/banned" element={<Banned />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Layout>
            </AuthProvider>
          </ThemeProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
