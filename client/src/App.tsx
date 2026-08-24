import { Route, Switch } from "wouter";
import Home from "./pages/Home";
import AdminSettings from "./pages/AdminSettings";

export default function App() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/admin/twilio" component={AdminSettings} />
      <Route component={Home} />
    </Switch>
  );
}
