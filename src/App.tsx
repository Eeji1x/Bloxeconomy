import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
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
import Admin from "./pages/Admin";
import Settings from "./pages/Settings";
import Leaderboards from "./pages/Leaderboards";
import Banned from "./pages/Banned";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
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
              <Route path="/admin" element={<Admin />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/leaderboards" element={<Leaderboards />} />
              <Route path="/banned" element={<Banned />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Layout>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
