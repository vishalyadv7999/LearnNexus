import {
  GraduationCap,
  Bot,
  BriefcaseBusiness,
  Home,
  LayoutDashboard,
  Menu,
  Settings,
  UserCircle,
  X,
} from "lucide-react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import { isFeatureEnabled } from "../features/featureFlags";

const bottomNavItems = [
  { label: "Setup", to: "/home", icon: Home },
  { label: "Dash", to: "/dashboard", icon: LayoutDashboard },
  { label: "Learn", to: "/study-plan", icon: GraduationCap },
  ...(isFeatureEnabled("internshipPrep")
    ? [{ label: "Internship", to: "/internship-prep", icon: BriefcaseBusiness }]
    : []),
  ...(isFeatureEnabled("learningAssistant")
    ? [{ label: "Assistant", to: "/learning-assistant", icon: Bot }]
    : []),
  { label: "Profile", to: "/profile", icon: UserCircle },
  { label: "Settings", to: "/settings", icon: Settings },
];

const shouldAddSetupBackstop = (pathname) => pathname !== "/home";

const AppShell = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const location = useLocation();

  useEffect(() => {
    if (!shouldAddSetupBackstop(location.pathname)) {
      return;
    }

    const currentState = window.history.state || {};
    const currentIndex = Number(currentState.idx);
    const alreadyInserted =
      currentState.usr?.learnnexusSetupBackstopInserted === true;

    if (alreadyInserted || (Number.isFinite(currentIndex) && currentIndex > 0)) {
      return;
    }

    const currentUrl = `${location.pathname}${location.search}${location.hash}`;
    const setupState = {
      ...currentState,
      usr: {
        ...(currentState.usr || {}),
        learnnexusSetupBackstop: true,
      },
      key: "learnnexus-setup-backstop",
      idx: 0,
    };
    const restoredState = {
      ...currentState,
      usr: {
        ...(currentState.usr || {}),
        learnnexusSetupBackstopInserted: true,
      },
      idx: 1,
    };

    window.history.replaceState(setupState, "", "/home");
    window.history.pushState(restoredState, "", currentUrl);
  }, [location.hash, location.pathname, location.search]);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const closeMobileSidebar = useCallback(() => {
    setIsMobileOpen(false);
  }, []);

  const openMobileSidebar = useCallback(() => {
    setIsMobileOpen(true);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950">
      {location.pathname !== "/dashboard" ? (
        <button
          aria-label="Open navigation"
          className="fixed left-4 top-4 z-40 inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-slate-950/80 text-white shadow-2xl backdrop-blur-xl transition hover:border-cyan-300/35 lg:hidden"
          onClick={() => setIsMobileOpen((current) => !current)}
          type="button"
        >
          {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      ) : null}
      <Sidebar
        isCollapsed={isCollapsed}
        isMobileOpen={isMobileOpen}
        onCloseMobile={closeMobileSidebar}
        onToggleCollapsed={() => setIsCollapsed((current) => !current)}
      />
      <main
        className={`relative min-h-screen transition-all duration-300 ${
          isCollapsed ? "lg:pl-24" : "lg:pl-72"
        }`}
      >
        {isOffline ? (
          <div className="sticky top-0 z-30 border-b border-amber-300/30 bg-amber-100 px-4 py-2 text-center text-sm font-semibold text-amber-900">
            You are offline. Saved progress will retry when the connection returns.
          </div>
        ) : null}
        {location.pathname === "/dashboard" ? (
          <Outlet context={{ openMobileSidebar }} />
        ) : (
          <div className="page-shell pt-20 lg:pt-6">
            <Outlet context={{ openMobileSidebar }} />
          </div>
        )}
      </main>
      <nav className="fixed inset-x-3 bottom-3 z-40 flex gap-1 overflow-x-auto rounded-[1.4rem] border border-white/10 bg-slate-950/82 p-2 text-white shadow-[0_18px_60px_rgba(2,6,23,0.55)] backdrop-blur-2xl lg:hidden">
        {bottomNavItems.map(({ icon: Icon, label, to }) => (
          <NavLink
            className={({ isActive }) =>
              `flex min-w-[4.5rem] flex-1 flex-col items-center gap-1 rounded-[1rem] px-2 py-2 text-[0.68rem] font-black transition ${
                isActive
                  ? "bg-gradient-to-r from-fuchsia-500/24 to-cyan-400/18 text-white shadow-[0_0_22px_rgba(34,211,238,0.14)]"
                  : "text-white/46 hover:bg-white/[0.06] hover:text-white"
              }`
            }
            key={label}
            to={to}
          >
            <Icon className="h-4 w-4" />
            <span className="truncate">{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
};

export default AppShell;
