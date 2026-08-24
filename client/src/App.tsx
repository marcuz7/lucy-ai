import { Route, Switch } from "wouter";
import Home from "./pages/Home";
import AdminSettings from "./pages/AdminSettings";
import AdminDashboard from "./pages/AdminDashboard";
import AdminMessageDetail from "./pages/AdminMessageDetail";

export default function App() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/admin/messages/:messageId" component={AdminMessageDetail} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/twilio" component={AdminSettings} />
      <Route component={Home} />
    </Switch>
  );
}
