import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://qxubkvaahbfacabajjwo.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4dWJrdmFhaGJmYWNhYmFqandvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0MzE4NTcsImV4cCI6MjA3ODAwNzg1N30.uKCGo5Qf3txZglK8zQhUe-ZntKOjus_ZCGSABwIe6i4";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testFetchWithJobs() {
    const { data: techData, error: techErr } = await supabase
        .from("users")
        .select("id, name, email, phone, role, station_id")
        .ilike("role", "%technician%");

    const { data: jobsData, error: jobsErr } = await supabase
        .from("technician_jobs")
        .select("id, technician_id, status, job_type, started_at, completed_at");

    console.log("Jobs fetched:", jobsData?.length, "Err:", jobsErr);

    const formatted = (techData || []).map(tech => {
        const activeJob = (jobsData || []).find(j =>
            j.technician_id === tech.id &&
            (!j.completed_at && j.status !== 'completed' && j.status !== 'cancelled')
        );
        return {
            ...tech,
            is_on_job: !!activeJob,
            current_job: activeJob || null
        };
    });

    console.log("Technicians with job status:", formatted.map(t => ({ name: t.name, is_on_job: t.is_on_job, job: t.current_job })));
}

testFetchWithJobs();
