import { Navigate, Route, Routes } from "react-router-dom";
import { Suspense, lazy } from "react";
import ProtectedRoute from "./common/components/ProtectedRoute";
import PageLoader from "./common/components/PageLoader";
import { useAuth } from "./hooks/useAuth";
import AppShell from "./layouts/AppShell";
import LoginPage from "./features/auth/pages/LoginPage";
import ResetPasswordPage from "./features/auth/pages/ResetPasswordPage";
import SignupPage from "./features/auth/pages/SignupPage";
import {
  getFeaturePageLoader,
  isFeatureEnabled,
} from "./features/featureFlags";

const DashboardPage = lazy(() => import("./features/dashboard/pages/DashboardPage"));
const HomeSetupPage = lazy(() => import("./features/learning/pages/HomeSetupPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const SettingsPage = lazy(() => import("./features/learning/pages/SettingsPage"));
const StudyPlanPage = lazy(() => import("./features/learning/pages/StudyPlanPage"));

const lazyFeaturePage = (featureName, pageName) => {
  const loader = getFeaturePageLoader(featureName, pageName);
  return loader ? lazy(loader) : null;
};

const internshipPrepEnabled = isFeatureEnabled("internshipPrep");
const learningAssistantEnabled = isFeatureEnabled("learningAssistant");
const InternshipPrepHome = lazyFeaturePage("internshipPrep", "InternshipPrepHome");
const RoadmapPage = lazyFeaturePage("internshipPrep", "RoadmapPage");
const InterviewQuestionsPage = lazyFeaturePage("internshipPrep", "InterviewQuestionsPage");
const ResumeGuidePage = lazyFeaturePage("internshipPrep", "ResumeGuidePage");
const AptitudePage = lazyFeaturePage("internshipPrep", "AptitudePage");
const CompanyPrepPage = lazyFeaturePage("internshipPrep", "CompanyPrepPage");
const LearningAssistantPage = lazyFeaturePage("learningAssistant", "LearningAssistantPage");

const AppPage = ({ children }) => (
  <Suspense fallback={<PageLoader message="Loading page..." />}>
    {children}
  </Suspense>
);

const GuestRoute = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <PageLoader message="Loading your study workspace..." />;
  }

  if (user) {
    return <Navigate to="/home" replace />;
  }

  return children;
};

const App = () => {
  const { user } = useAuth();

  return (
    <Routes>
      <Route
        path="/"
        element={<Navigate to={user ? "/home" : "/login"} replace />}
      />
      <Route
        path="/login"
        element={
          <GuestRoute>
            <LoginPage />
          </GuestRoute>
        }
      />
      <Route
        path="/signup"
        element={
          <GuestRoute>
            <SignupPage />
          </GuestRoute>
        }
      />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/home" element={<AppPage><HomeSetupPage /></AppPage>} />
          <Route path="/dashboard" element={<AppPage><DashboardPage /></AppPage>} />
          <Route path="/study-plan" element={<AppPage><StudyPlanPage /></AppPage>} />
          <Route path="/profile" element={<AppPage><ProfilePage /></AppPage>} />
          <Route path="/settings" element={<AppPage><SettingsPage /></AppPage>} />
          {internshipPrepEnabled && InternshipPrepHome ? (
            <>
              <Route path="/internship-prep" element={<AppPage><InternshipPrepHome /></AppPage>} />
              <Route path="/internship-prep/roadmaps" element={<AppPage><RoadmapPage /></AppPage>} />
              <Route path="/internship-prep/questions" element={<AppPage><InterviewQuestionsPage /></AppPage>} />
              <Route path="/internship-prep/resume-guide" element={<AppPage><ResumeGuidePage /></AppPage>} />
              <Route path="/internship-prep/aptitude" element={<AppPage><AptitudePage /></AppPage>} />
              <Route path="/internship-prep/company-prep" element={<AppPage><CompanyPrepPage /></AppPage>} />
            </>
          ) : null}
          {learningAssistantEnabled && LearningAssistantPage ? (
            <Route path="/learning-assistant" element={<AppPage><LearningAssistantPage /></AppPage>} />
          ) : null}
        </Route>
      </Route>
      <Route
        path="*"
        element={<Navigate to={user ? "/home" : "/login"} replace />}
      />
    </Routes>
  );
};

export default App;
