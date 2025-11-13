/**
 * @title Submit Ticket (Secure, Stable)
 * @category Tickets
 * @access public
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  // Handle CORS preflight (important for browser calls)
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { "Access-Control-Allow-Origin": "*" },
      });
    }

    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get("URL");
    const supabaseServiceRoleKey = Deno.env.get("SERVICE_ROLE_KEY");
    const supabase = createClient(supabaseUrl!, supabaseServiceRoleKey!);

    // Ensure the request contains multipart/form-data
    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return new Response(
        JSON.stringify({ error: "Expected multipart/form-data" }),
        {
          status: 400,
          headers: { "Access-Control-Allow-Origin": "*" },
        }
      );
    }

    // Parse the multipart form data
    const formData = await req.formData();
    const bike_number_text = formData.get("bike_number_text")?.toString() ?? "";
    const issue_description = formData.get("issue_description")?.toString() ?? "";
    const location = formData.get("location")?.toString() ?? "";
    const contact = formData.get("contact")?.toString() ?? "";
    const image = formData.get("image") as File | null;

    // Basic validation
    if (!bike_number_text || !issue_description) {
      return new Response(
        JSON.stringify({
          error: "Bike number and issue description are required",
        }),
        { status: 400, headers: { "Access-Control-Allow-Origin": "*" } }
      );
    }

    // Upload image to Supabase Storage (if provided)
    let image_path = null;
    if (image) {
      try {
        const fileName = `${Date.now()}_${image.name}`;
        const arrayBuffer = await image.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);

        const { error: uploadError } = await supabase.storage
          .from("ticket-images")
          .upload(fileName, uint8Array, {
            contentType: image.type || "image/jpeg",
            upsert: false,
          });

        if (uploadError) {
          console.error("Storage upload error:", uploadError.message);
          throw uploadError;
        }

        image_path = fileName;
      } catch (uploadErr) {
        console.error("Image upload exception:", uploadErr.message);
        throw uploadErr;
      }
    }

    // Fetch station_id from bikes table (if exists)
    let station_id: string | null = null;
    try {
      const { data: bike, error: bikeError } = await supabase
        .from("bikes")
        .select("station_id")
        .eq("bike_number", bike_number_text)
        .maybeSingle();

      if (bikeError) {
        console.warn("Bike lookup error:", bikeError.message);
      }

      if (bike) {
        station_id = bike.station_id;
      }
    } catch (lookupErr) {
      console.error("Station lookup exception:", lookupErr.message);
    }

    // Insert ticket record
    const { error: insertError } = await supabase.from("tickets").insert([
      {
        bike_number_text,
        issue_description,
        location,
        contact,
        image_path,
        reported_at: new Date().toISOString(),
        status: "open",
        station_id,
      },
    ]);

    if (insertError) {
      console.error("Ticket insert error:", insertError.message);
      throw insertError;
    }

    // ✅ Success response
    return new Response(
      JSON.stringify({
        success: true,
        message: "Ticket created successfully",
      }),
      {
        status: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
        },
      }
    );
  } catch (err) {
    // 🧩 Ensure consistent JSON error response
    console.error("Submit Ticket Error:", err?.message || err);
    return new Response(
      JSON.stringify({
        error: err?.message || "Internal Server Error",
      }),
      {
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
        },
      }
    );
  }
});
