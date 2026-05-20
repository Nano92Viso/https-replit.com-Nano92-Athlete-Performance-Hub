import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import Players from "@/pages/Players";
import PlayerProfile from "@/pages/PlayerProfile";
import Sessions from "@/pages/Sessions";
import SessionDetail from "@/pages/SessionDetail";
import SessionGenerator from "@/pages/SessionGenerator";
import WeeklyPlanner from "@/pages/WeeklyPlanner";
import PlayerReport from "@/pages/PlayerReport";
import TestComparator from "@/pages/TestComparator";
import Reports from "@/pages/Reports";
import Library from "@/pages/Library";
import Settings from "@/pages/Settings";
import Demo from "@/pages/Demo";
import Teams from "@/pages/Teams";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/players" component={Players} />
      <Route path="/players/:id/report" component={PlayerReport} />
      <Route path="/players/:id/compare" component={TestComparator} />
      <Route path="/players/:id" component={PlayerProfile} />
      <Route path="/sessions/generate" component={SessionGenerator} />
      <Route path="/sessions/:id" component={SessionDetail} />
      <Route path="/sessions" component={Sessions} />
      <Route path="/planner" component={WeeklyPlanner} />
      <Route path="/reports" component={Reports} />
      <Route path="/library" component={Library} />
      <Route path="/teams" component={Teams} />
      <Route path="/settings" component={Settings} />
      <Route path="/demo" component={Demo} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
