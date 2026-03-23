import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ScrollToTop from "./components/ScrollToTop";
import { lazy, Suspense } from "react";

// CRM pages
const CrmLogin = lazy(() => import("./crm/pages/Login"));
const CrmLayout = lazy(() => import("./crm/components/CrmLayout"));
const CrmDashboard = lazy(() => import("./crm/pages/Dashboard"));
const CrmComplexList = lazy(() => import("./crm/pages/complexes/ComplexList"));
const CrmComplexForm = lazy(() => import("./crm/pages/complexes/ComplexForm"));
const CrmApartmentList = lazy(() => import("./crm/pages/apartments/ApartmentList"));
const CrmApartmentForm = lazy(() => import("./crm/pages/apartments/ApartmentForm"));
const CrmAttributes = lazy(() => import("./crm/pages/attributes/AttributesPage"));
const CrmFeed = lazy(() => import("./crm/pages/feed/FeedPage"));
const CrmSettings = lazy(() => import("./crm/pages/settings/SettingsPage"));
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

// CRM Auth context
import { AuthProvider } from "./crm/context/AuthContext";

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
        <AuthProvider>
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

            {/* CRM routes */}
            <Route path="/crm/login" element={<CrmLogin />} />
            <Route path="/crm" element={<CrmLayout />}>
              <Route index element={<CrmDashboard />} />
              <Route path="complexes" element={<CrmComplexList />} />
              <Route path="complexes/new" element={<CrmComplexForm />} />
              <Route path="complexes/:id/edit" element={<CrmComplexForm />} />
              <Route path="apartments" element={<CrmApartmentList />} />
              <Route path="apartments/new" element={<CrmApartmentForm />} />
              <Route path="apartments/:id/edit" element={<CrmApartmentForm />} />
              <Route path="attributes" element={<CrmAttributes />} />
              <Route path="feed" element={<CrmFeed />} />
              <Route path="settings" element={<CrmSettings />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
