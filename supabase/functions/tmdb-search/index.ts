import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const OMDB_BASE = "http://www.omdbapi.com";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("OMDB_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "OMDB_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const query = url.searchParams.get("query");
    const imdbId = url.searchParams.get("imdb_id");

    if (!query && !imdbId) {
      return new Response(JSON.stringify({ error: "Provide query or imdb_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (imdbId) {
      // Fetch full details by IMDb ID
      const res = await fetch(`${OMDB_BASE}/?i=${imdbId}&plot=short&apikey=${apiKey}`);
      const d = await res.json();
      if (d.Response === "False") {
        return new Response(JSON.stringify({ error: d.Error || "Not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify(formatMovie(d)), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Search by title string — try exact title first, fall back to search
    const titleRes = await fetch(`${OMDB_BASE}/?t=${encodeURIComponent(query!)}&plot=short&apikey=${apiKey}`);
    const titleData = await titleRes.json();

    if (titleData.Response === "True") {
      return new Response(JSON.stringify({ results: [formatMovie(titleData)] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fall back to search
    const searchRes = await fetch(`${OMDB_BASE}/?s=${encodeURIComponent(query!)}&type=movie&apikey=${apiKey}`);
    const searchData = await searchRes.json();

    if (searchData.Response === "False" || !searchData.Search?.length) {
      return new Response(JSON.stringify({ results: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Return top 5 search results (basic info only — no plot from search endpoint)
    const results = searchData.Search.slice(0, 5).map((m: any) => ({
      id: m.imdbID,
      title: m.Title,
      release_year: m.Year ? parseInt(m.Year) : null,
      poster_url: m.Poster && m.Poster !== "N/A" ? m.Poster : null,
      overview: null,
      vote_average: null,
    }));

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("tmdb-search (OMDB) error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function formatMovie(d: any) {
  const rating = d.imdbRating && d.imdbRating !== "N/A" ? parseFloat(d.imdbRating) : null;
  return {
    id: d.imdbID,
    title: d.Title,
    release_year: d.Year ? parseInt(d.Year) : null,
    poster_url: d.Poster && d.Poster !== "N/A" ? d.Poster : null,
    overview: d.Plot && d.Plot !== "N/A" ? d.Plot : null,
    vote_average: rating,
    genres: d.Genre && d.Genre !== "N/A" ? d.Genre.split(", ") : [],
    runtime: d.Runtime && d.Runtime !== "N/A" ? d.Runtime : null,
  };
}
