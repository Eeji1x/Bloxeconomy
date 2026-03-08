import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { Layout } from "@/components/layout/Layout";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Users from "./pages/Users";
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
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
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
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/users" element={<Users />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/profile/:userId" element={<Profile />} />
                <Route path="/catalog" element={<Catalog />} />
                <Route path="/catalog/:itemId" element={<ItemDetail />} />
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

export default App;
