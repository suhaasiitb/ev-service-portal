import { useEffect, useState } from "react";
import { supabase } from "./lib/supabaseClient";

export default function App() {
  const [data, setData] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchData() {
      const { data, error } = await supabase.from("stations").select("*");
      if (error) setError(error.message);
      else setData(data);
    }
    fetchData();
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4 text-blue-700">
        🚀 EV Service Portal - Supabase Connection Test
      </h1>
      {error && <p className="text-red-500">Error: {error}</p>}
      {data.length > 0 ? (
        <ul className="space-y-2">
          {data.map((station) => (
            <li key={station.id} className="border p-2 rounded-lg">
              {station.name} ({station.station_code})
            </li>
          ))}
        </ul>
      ) : (
        <p>Loading stations...</p>
      )}
    </div>
  );
}
