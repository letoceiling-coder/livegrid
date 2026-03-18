import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ScrollToTop from "./components/ScrollToTop";
import { lazy, Suspense } from "react";
import Index from "./pages/Index";

// Redesign pages
const RedesignIndex = lazy(() => import("./redesign/pages/RedesignIndex"));
const RedesignCatalog = lazy(() => import("./redesign/pages/RedesignCatalog"));
const RedesignComplex = lazy(() => import("./redesign/pages/RedesignComplex"));
const RedesignApartment = lazy(() => import("./redesign/pages/RedesignApartment"));
const RedesignMap = lazy(() => import("./redesign/pages/RedesignMap"));
const RedesignLayouts = lazy(() => import("./redesign/pages/RedesignLayouts"));
import Catalog from "./pages/Catalog";
import CatalogZhk from "./pages/CatalogZhk";
import ZhkDetail from "./pages/ZhkDetail";
import ObjectDetail from "./pages/ObjectDetail";
import News from "./pages/News";
import NewsDetail from "./pages/NewsDetail";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";

// Admin pages
const AdminLayout = lazy(() => import("./admin/layout/AdminLayout"));
const AdminDashboard = lazy(() => import("./admin/pages/AdminDashboard"));
const AdminPages = lazy(() => import("./admin/pages/AdminPages"));
const AdminPageEditor = lazy(() => import("./admin/pages/AdminPageEditor"));
const AdminMedia = lazy(() => import("./admin/pages/AdminMedia"));
const AdminUsers = lazy(() => import("./admin/pages/AdminUsers"));
const AdminSettings = lazy(() => import("./admin/pages/AdminSettings"));
const AdminTokens = lazy(() => import("./admin/pages/AdminTokens"));
const EditorPage = lazy(() => import("./admin/components/editor/EditorPage"));

const queryClient = new QueryClient();

const Loading = () => (
  <div className="h-screen flex items-center justify-center">
    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ScrollToTop />
        <Suspense fallback={<Loading />}>
          <Routes>
            {/* Main routes (redesign) */}
            <Route path="/" element={<RedesignIndex />} />
            <Route path="/catalog" element={<RedesignCatalog />} />
            <Route path="/complex/:slug" element={<RedesignComplex />} />
            <Route path="/apartment/:id" element={<RedesignApartment />} />
            <Route path="/map" element={<RedesignMap />} />
            <Route path="/layouts/:complex" element={<RedesignLayouts />} />

            {/* Old routes (kept for backward compatibility) */}
            <Route path="/old" element={<Index />} />
            <Route path="/old/catalog" element={<Catalog />} />
            <Route path="/old/catalog-zhk" element={<CatalogZhk />} />
            <Route path="/old/zhk/:slug" element={<ZhkDetail />} />
            <Route path="/old/object/:slug" element={<ObjectDetail />} />
            <Route path="/old/news" element={<News />} />
            <Route path="/old/news/:slug" element={<NewsDetail />} />

            {/* Auth routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Admin routes */}
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="pages" element={<AdminPages />} />
              <Route path="page-editor/:slug" element={<AdminPageEditor />} />
              <Route path="media" element={<AdminMedia />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="settings" element={<AdminSettings />} />
              <Route path="tokens" element={<AdminTokens />} />
            </Route>
            <Route path="/admin/editor/:pageId" element={<EditorPage />} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
