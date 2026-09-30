import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
    const { data, error } = await supabase
        .from("bikes")
        .select(`
            *,
            bike_models(model_name),
            stations(name),
            assignments:rider_bike_assignments(
                id,
                battery_code,
                rider_id,
                unassigned_at,
                riders(name)
            ),
            pdi_requests(
                id,
                status
            )
        `)
        .order("bike_number")
        .limit(1);
        
    if (error) {
        console.error("SUPABASE ERROR:", error);
    } else {
        console.log("SUCCESS");
    }
}

test();
