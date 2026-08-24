import { Route, Switch } from "wouter";
import Home from "./pages/Home";
import AdminSettings from "./pages/AdminSettings";
import AdminDashboard from "./pages/AdminDashboard";

export default function App() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/twilio" component={AdminSettings} />
      <Route component={Home} />
    </Switch>
  );
}
