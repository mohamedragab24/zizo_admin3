import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Admin from "./pages/Admin";
import { SalonProvider } from "./lib/salonStore";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Admin} />
      <Route path="/admin" component={Admin} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <SalonProvider>
            <Toaster richColors position="top-center" />
            <Router />
          </SalonProvider>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
