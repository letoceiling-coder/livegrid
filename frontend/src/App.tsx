import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ScrollToTop from "./components/ScrollToTop";
import NavigationProgress from "./components/NavigationProgress";
import { lazy, Suspense } from "react";

// CRM pages
const CrmLogin = lazy(() => import("./crm/pages/Login"));
const CrmLayout = lazy(() => import("./crm/components/CrmLayout"));
const RequireRole = lazy(() => import("./crm/components/RequireRole"));
const CrmDashboard = lazy(() => import("./crm/pages/Dashboard"));
const CrmComplexList = lazy(() => import("./crm/pages/complexes/ComplexList"));
const CrmComplexForm = lazy(() => import("./crm/pages/complexes/ComplexForm"));
const CrmApartmentList = lazy(() => import("./crm/pages/apartments/ApartmentList"));
const CrmApartmentForm = lazy(() => import("./crm/pages/apartments/ApartmentForm"));
const CrmAttributes = lazy(() => import("./crm/pages/attributes/AttributesPage"));
const CrmFeed = lazy(() => import("./crm/pages/feed/FeedPage"));
const CrmRequests = lazy(() => import("./crm/pages/requests/RequestsPage"));
const CrmSettings = lazy(() => import("./crm/pages/settings/SettingsPage"));
import Index from "./pages/Index";
import AppLayout from "./layouts/AppLayout";
import PageSuspenseFallback from "./components/PageSuspenseFallback";
import FavoritesPage from "./pages/FavoritesPage";

// Redesign pages
const HomeNew = lazy(() => import("./pages/HomeNew"));
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

// CRM2 — universal entity UI
const Crm2Layout = lazy(() => import("./crm2/components/Crm2Layout"));
const Crm2Hub = lazy(() => import("./crm2/pages/EntityHubPage"));
const Crm2EntityList = lazy(() => import("./crm2/pages/EntityListPage"));
const Crm2EntityForm = lazy(() => import("./crm2/pages/EntityFormPage"));
const Crm2TypesBuilder = lazy(() => import("./crm2/pages/EntityTypesBuilderPage"));
const Crm2EntityHistory = lazy(() => import("./crm2/pages/EntityHistoryPage"));

// Admin pages
const AdminLayout = lazy(() => import("./admin/layout/AdminLayout"));
const AdminDashboard = lazy(() => import("./admin/pages/AdminDashboard"));
const AdminPages = lazy(() => import("./admin/pages/AdminPages"));
const AdminPageEditor = lazy(() => import("./admin/pages/AdminPageEditor"));
const AdminMedia = lazy(() => import("./admin/pages/AdminMedia"));
const AdminUsers = lazy(() => import("./admin/pages/AdminUsers"));
const AdminRoles = lazy(() => import("./admin/pages/AdminRoles"));
const AdminSettings = lazy(() => import("./admin/pages/AdminSettings"));
const AdminTokens = lazy(() => import("./admin/pages/AdminTokens"));
const EditorPage = lazy(() => import("./admin/components/editor/EditorPage"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
        <ScrollToTop />
        <NavigationProgress />
        <Suspense fallback={<PageSuspenseFallback />}>
          <Routes>
            {/* Admin routes */}
            <Route element={<RequireRole roles={["ADMIN"]} />}>
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminDashboard />} />
                <Route path="pages" element={<AdminPages />} />
                <Route path="page-editor/:slug" element={<AdminPageEditor />} />
                <Route path="media" element={<AdminMedia />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="roles" element={<AdminRoles />} />
                <Route path="settings" element={<AdminSettings />} />
                <Route path="tokens" element={<AdminTokens />} />
              </Route>
              <Route path="/admin/editor/:pageId" element={<EditorPage />} />
            </Route>

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
              <Route path="requests" element={<CrmRequests />} />
              <Route path="settings" element={<CrmSettings />} />
            </Route>

            {/* Universal entity CRM (schema-driven) */}
            <Route path="/crm2" element={<Crm2Layout />}>
              <Route index element={<Crm2Hub />} />
              <Route path="types" element={<Crm2TypesBuilder />} />
              <Route path="entities/:type" element={<Crm2EntityList />} />
              <Route path="entities/:type/create" element={<Crm2EntityForm />} />
              <Route path="entities/:type/:id" element={<Crm2EntityForm />} />
              <Route path="entities/:type/:id/history" element={<Crm2EntityHistory />} />
            </Route>

            {/* Public site: shared header + footer */}
            <Route element={<AppLayout />}>
              <Route index element={<HomeNew />} />
              <Route path="catalog" element={<RedesignCatalog />} />
              <Route path="complex/:slug" element={<RedesignComplex />} />
              <Route path="apartment/:id" element={<RedesignApartment />} />
              <Route path="map" element={<RedesignMap />} />
              <Route path="layouts/:complex" element={<RedesignLayouts />} />
              <Route path="favorites" element={<FavoritesPage />} />

              <Route path="old" element={<Index />} />
              <Route path="old/catalog" element={<Catalog />} />
              <Route path="old/catalog-zhk" element={<CatalogZhk />} />
              <Route path="old/zhk/:slug" element={<ZhkDetail />} />
              <Route path="old/object/:slug" element={<ObjectDetail />} />
              <Route path="old/news" element={<News />} />
              <Route path="old/news/:slug" element={<NewsDetail />} />

              <Route path="login" element={<Login />} />
              <Route path="register" element={<Register />} />
              <Route path="forgot-password" element={<ForgotPassword />} />
              <Route path="reset-password" element={<ResetPassword />} />

              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
