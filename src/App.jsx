import TicketPage from "./pages/TicketPage";
console.log("URL:", import.meta.env.VITE_SUPABASE_URL);
console.log("KEY:", import.meta.env.VITE_SUPABASE_ANON_KEY);

export default function App() {
  return <TicketPage />;
}
