import { Route, Switch } from "wouter";
import Home from "./pages/Home";
import AdminProviderSettings from "./pages/AdminProviderSettings";
import AdminDashboard from "./pages/AdminDashboard";
import AdminMessageDetail from "./pages/AdminMessageDetail";

export default function App() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/admin/messages/:messageId" component={AdminMessageDetail} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/settings" component={AdminProviderSettings} />
      <Route path="/admin/twilio" component={AdminProviderSettings} />
      <Route path="/admin/telnyx" component={AdminProviderSettings} />
      <Route component={Home} />
    </Switch>
  );
}
