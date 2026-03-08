import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { Layout } from "@/components/layout/Layout";
import { supabase } from "@/integrations/supabase/client";
import Index from "./pages/Index";
import AuthHome from "./pages/AuthHome";
import Apply from "./pages/Apply";
import Privacy from "./pages/Privacy";
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

// Force logout key - change this value to force all users to re-login
const FORCE_LOGOUT_VERSION = "security-patch-2026-03-08";

const ForceLogoutWrapper = ({ children }: { children: React.ReactNode }) => {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const lastVersion = localStorage.getItem("force_logout_version");
    if (lastVersion !== FORCE_LOGOUT_VERSION) {
      // Force sign out, then mark as done
      supabase.auth.signOut().then(() => {
        localStorage.setItem("force_logout_version", FORCE_LOGOUT_VERSION);
        setReady(true);
      });
    } else {
      setReady(true);
    }
  }, []);

  if (!ready) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0a0a0a',
        color: '#888',
      }}>
        Loading...
      </div>
    );
  }

  return <>{children}</>;
};

const App = () => {
  return (
    <ForceLogoutWrapper>
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
    </ForceLogoutWrapper>
  );
};

export default App;
