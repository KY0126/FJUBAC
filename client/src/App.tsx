import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { lazy, Suspense } from "react";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { BrandMotionShell } from "./components/BrandMotionShell";
import { SiteChrome } from "./components/SiteChrome";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";

const RecruitmentPage = lazy(() => import("./pages/RecruitmentPage"));
const RecruitmentManagement = lazy(() => import("./pages/RecruitmentManagement"));
const AccountAccessPage = lazy(() => import("./pages/AccountAccessPage"));
const AnnouncementsPage = lazy(() => import("./pages/AnnouncementsPage"));
const EventsPage = lazy(() => import("./pages/EventsPage"));
const PublicLinksPage = lazy(() => import("./pages/PublicLinksPage"));
const LearningMapPage = lazy(() => import("./pages/LearningMapPage"));
const PublicOutcomesPage = lazy(() => import("./pages/PublicOutcomesPage"));
const DepartmentsPage = lazy(() => import("./pages/DepartmentsPage"));
const AccountManagementPage = lazy(() => import("./pages/AccountManagementPage"));
const PersonalCenterPage = lazy(() => import("./pages/PersonalCenterPage"));
const MemberWorkspacePage = lazy(() => import("./pages/MemberWorkspacePage"));
const ManagementWorkspacePage = lazy(() => import("./pages/ManagementWorkspacePage"));
const ProjectContentManagementPage = lazy(() => import("./pages/ProjectContentManagementPage"));
const ResearchArchive = lazy(() => import("./pages/ResearchArchive"));
const ProjectListPage = lazy(() => import("./pages/ProjectListPage"));
const ProjectDetailPage = lazy(() => import("./pages/ProjectDetailPage"));

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Suspense fallback={<main className="route-loading">正在載入頁面…</main>}>
      <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/research"} component={ResearchArchive} />
      <Route path={"/apply"} component={RecruitmentPage} />
      <Route path={"/recruitment"} component={RecruitmentPage} />
      <Route path={"/manage/recruitment"} component={RecruitmentManagement} />
      <Route path={"/account"} component={AccountAccessPage} />
      <Route path={"/me"} component={PersonalCenterPage} />
      <Route path={"/announcements"} component={AnnouncementsPage} />
      <Route path={"/events"} component={EventsPage} />
      <Route path={"/links"} component={PublicLinksPage} />
      <Route path={"/learning"} component={LearningMapPage} />
      <Route path={"/projects/:id"} component={ProjectDetailPage} />
      <Route path={"/projects"} component={ProjectListPage} />
      <Route path={"/outcomes"} component={PublicOutcomesPage} />
      <Route path={"/departments"} component={DepartmentsPage} />
      <Route path={"/workspace"} component={MemberWorkspacePage} />
      <Route path={"/manage/workspace"} component={ManagementWorkspacePage} />
      <Route path={"/manage/project-content"} component={ProjectContentManagementPage} />
      <Route path={"/manage/accounts"} component={AccountManagementPage} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <SiteChrome><BrandMotionShell><Router /></BrandMotionShell></SiteChrome>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
