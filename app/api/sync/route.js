// app/api/sync/route.js

import { supabase } from "@/lib/supabaseClient";

const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;

export async function GET() {
  if (!TMDB_API_KEY) {
    return new Response(
      JSON.stringify({ error: "TMDB API key not configured" }),
      { status: 500 }
    );
  }

  try {
    console.log("🚀 Starting comprehensive TMDB data sync...");

    // First, sync genres (both movie and TV)
    await syncGenres();
    
    // Sync multiple pages of popular movies
    await syncMovies();
    
    // Sync multiple pages of popular TV shows
    await syncTVShows();

    // Sync trending content
    await syncTrendingContent();

    // Sync top-rated content
    await syncTopRatedContent();

    // Sync people (actors, directors, crew)
    await syncPeople();

    // Sync movie collections
    await syncCollections();

    // Generate sample awards data
    await syncAwards();

    // Generate sample reviews
    await syncReviews();

    // Generate sample watchlist entries
    await syncWatchlist();

    console.log("✅ All TMDB data synced successfully!");
    return new Response(
      JSON.stringify({ 
        message: "All TMDB data synced successfully!",
        timestamp: new Date().toISOString(),
        status: "completed",
        tables_populated: ["genres", "movies", "tv_shows", "people", "collections", "awards", "reviews", "watchlist"]
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("❌ API Sync Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}

async function syncGenres() {
  console.log("📋 Syncing movie and TV genres...");
  
  // Sync movie genres
  const movieGenresUrl = `https://api.themoviedb.org/3/genre/movie/list?api_key=${TMDB_API_KEY}`;
  const movieResponse = await fetch(movieGenresUrl, { cache: "no-store" });
  
  if (!movieResponse.ok) throw new Error("Failed to fetch movie genres");
  
  const movieData = await movieResponse.json();
  
  for (const genre of movieData.genres) {
    const { error } = await supabase
      .from("genres")
      .upsert({ id: genre.id, name: genre.name }, { onConflict: "id" });
    
    if (error) console.error(`❌ Error inserting movie genre ${genre.name}:`, error.message);
  }

  // Sync TV genres
  const tvGenresUrl = `https://api.themoviedb.org/3/genre/tv/list?api_key=${TMDB_API_KEY}`;
  const tvResponse = await fetch(tvGenresUrl, { cache: "no-store" });
  
  if (!tvResponse.ok) throw new Error("Failed to fetch TV genres");
  
  const tvData = await tvResponse.json();
  
  for (const genre of tvData.genres) {
    const { error } = await supabase
      .from("genres")
      .upsert({ id: genre.id, name: genre.name }, { onConflict: "id" });
    
    if (error) console.error(`❌ Error inserting TV genre ${genre.name}:`, error.message);
  }
  
  console.log("✅ Movie and TV genres synced");
}

async function syncMovies() {
  console.log("🎬 Syncing movies from multiple pages...");
  
  // Sync multiple pages of popular movies
  for (let page = 1; page <= 3; page++) {
    console.log(`📄 Fetching movies page ${page}...`);
    
    const moviesUrl = `https://api.themoviedb.org/3/movie/popular?api_key=${TMDB_API_KEY}&page=${page}`;
    const response = await fetch(moviesUrl, { cache: "no-store" });
    
    if (!response.ok) {
      console.error(`Failed to fetch movies page ${page}`);
      continue;
    }
    
    const data = await response.json();
    
    for (const movie of data.results) { // Process all movies from each page
    try {
      // Get detailed movie information
      const detailsUrl = `https://api.themoviedb.org/3/movie/${movie.id}?api_key=${TMDB_API_KEY}&append_to_response=credits`;
      const detailsResponse = await fetch(detailsUrl, { cache: "no-store" });
      
      if (!detailsResponse.ok) continue;
      
      const detailsData = await detailsResponse.json();

      // Insert movie
      const movieToInsert = {
        id: detailsData.id,
        title: detailsData.title,
        release_date: detailsData.release_date,
        poster: detailsData.poster_path
          ? `https://image.tmdb.org/t/p/w500${detailsData.poster_path}`
          : null,
        synopsis: detailsData.overview,
        rating: detailsData.vote_average,
        vote_count: detailsData.vote_count,
        duration: detailsData.duration,
        budget: detailsData.budget,
        revenue: detailsData.revenue,
        original_language: detailsData.original_language,
        backdrop_path: detailsData.backdrop_path
          ? `https://image.tmdb.org/t/p/w1280${detailsData.backdrop_path}`
          : null
      };

      const { error: movieError } = await supabase
        .from("movies")
        .upsert(movieToInsert, { onConflict: "id" });
      
      if (movieError) {
        console.error(`❌ Error inserting movie ${detailsData.title}:`, movieError.message);
        continue;
      }

      // Insert movie-genre relationships
      if (detailsData.genres && detailsData.genres.length > 0) {
        const movieGenres = detailsData.genres.map((genre) => ({
          movie_id: detailsData.id,
          genre_id: genre.id
        }));

        const { error: genreError } = await supabase
          .from("movie_genres")
          .upsert(movieGenres, { onConflict: "movie_id,genre_id" });
        
        if (genreError) {
          console.error(`❌ Error inserting movie genres:`, genreError.message);
        }
      }

      // Insert people (cast)
      if (detailsData.credits && detailsData.credits.cast) {
        const cast = detailsData.credits.cast.slice(0, 10); // Limit to top 10 cast members
        
        for (const person of cast) {
          // Insert person
          const personToInsert = {
            id: person.id,
            name: person.name,
            profile_path: person.profile_path
              ? `https://image.tmdb.org/t/p/w500${person.profile_path}`
              : null,
            known_for_department: person.known_for_department || 'Acting'
          };

          const { error: personError } = await supabase
            .from("people")
            .upsert(personToInsert, { onConflict: "id" });
          
          if (!personError) {
            // Insert movie credit
            const creditToInsert = {
              movie_id: detailsData.id,
              person_id: person.id,
              character_name: person.character,
              job: 'Actor',
              department: 'Acting',
              order_index: person.order
            };

            const { error: creditError } = await supabase
              .from("movie_credits")
              .upsert(creditToInsert, { onConflict: "movie_id,person_id,job" });
            
            if (creditError) {
              console.error(`❌ Error inserting movie credit:`, creditError.message);
            }
          }
        }
      }

      // Insert collection if exists
      if (detailsData.belongs_to_collection) {
        const collectionToInsert = {
          id: detailsData.belongs_to_collection.id,
          name: detailsData.belongs_to_collection.name,
          overview: detailsData.belongs_to_collection.overview,
          poster: detailsData.belongs_to_collection.poster_path
            ? `https://image.tmdb.org/t/p/w500${detailsData.belongs_to_collection.poster_path}`
            : null,
          backdrop_path: detailsData.belongs_to_collection.backdrop_path
            ? `https://image.tmdb.org/t/p/w1280${detailsData.belongs_to_collection.backdrop_path}`
            : null
        };

        const { error: collectionError } = await supabase
          .from("collections")
          .upsert(collectionToInsert, { onConflict: "id" });
        
        if (!collectionError) {
          // Link movie to collection
          const { error: linkError } = await supabase
            .from("movie_collections")
            .upsert({ movie_id: detailsData.id, collection_id: detailsData.belongs_to_collection.id }, 
                    { onConflict: "movie_id,collection_id" });
          
          if (linkError) {
            console.error(`❌ Error linking movie to collection:`, linkError.message);
          }
        }
      }

      console.log(`✅ Synced movie: ${detailsData.title}`);
    } catch (error) {
      console.error(`❌ Error processing movie ${movie.id}:`, error.message);
    }
    }
  }
  
  console.log("✅ Movies synced from multiple pages");
}

async function syncTVShows() {
  console.log("📺 Syncing TV shows from multiple pages...");
  
  // Sync multiple pages of popular TV shows
  for (let page = 1; page <= 2; page++) {
    console.log(`📄 Fetching TV shows page ${page}...`);
    
    const tvUrl = `https://api.themoviedb.org/3/tv/popular?api_key=${TMDB_API_KEY}&page=${page}`;
    const response = await fetch(tvUrl, { cache: "no-store" });
    
    if (!response.ok) {
      console.error(`Failed to fetch TV shows page ${page}`);
      continue;
    }
    
    const data = await response.json();
    
    for (const tvShow of data.results) { // Process all TV shows from each page
    try {
      // Get detailed TV show information
      const detailsUrl = `https://api.themoviedb.org/3/tv/${tvShow.id}?api_key=${TMDB_API_KEY}&append_to_response=credits`;
      const detailsResponse = await fetch(detailsUrl, { cache: "no-store" });
      
      if (!detailsResponse.ok) continue;
      
      const detailsData = await detailsResponse.json();

      // Insert TV show
      const tvShowToInsert = {
        id: detailsData.id,
        title: detailsData.name,
        first_air_date: detailsData.first_air_date,
        last_air_date: detailsData.last_air_date,
        poster: detailsData.poster_path
          ? `https://image.tmdb.org/t/p/w500${detailsData.poster_path}`
          : null,
        synopsis: detailsData.overview,
        rating: detailsData.rating,
        vote_count: detailsData.vote_count,
        number_of_seasons: detailsData.number_of_seasons,
        number_of_episodes: detailsData.number_of_episodes,
        status: detailsData.status,
        original_language: detailsData.original_language,
        backdrop_path: detailsData.backdrop_path
          ? `https://image.tmdb.org/t/p/w1280${detailsData.backdrop_path}`
          : null
      };

      const { error: tvError } = await supabase
        .from("tv_shows")
        .upsert(tvShowToInsert, { onConflict: "id" });
      
      if (tvError) {
        console.error(`❌ Error inserting TV show ${detailsData.name}:`, tvError.message);
        continue;
      }

      // Insert TV show-genre relationships
      if (detailsData.genres && detailsData.genres.length > 0) {
        const tvGenres = detailsData.genres.map((genre) => ({
          tv_show_id: detailsData.id,
          genre_id: genre.id
        }));

        const { error: genreError } = await supabase
          .from("tv_show_genres")
          .upsert(tvGenres, { onConflict: "tv_show_id,genre_id" });
        
        if (genreError) {
          console.error(`❌ Error inserting TV show genres:`, genreError.message);
        }
      }

      // Insert people (cast)
      if (detailsData.credits && detailsData.credits.cast) {
        const cast = detailsData.credits.cast.slice(0, 10); // Limit to top 10 cast members
        
        for (const person of cast) {
          // Insert person
          const personToInsert = {
            id: person.id,
            name: person.name,
            profile_path: person.profile_path
              ? `https://image.tmdb.org/t/p/w500${person.profile_path}`
              : null,
            known_for_department: person.known_for_department || 'Acting'
          };

          const { error: personError } = await supabase
            .from("people")
            .upsert(personToInsert, { onConflict: "id" });
          
          if (!personError) {
            // Insert TV show credit
            const creditToInsert = {
              tv_show_id: detailsData.id,
              person_id: person.id,
              character_name: person.character,
              job: 'Actor',
              department: 'Acting',
              order_index: person.order
            };

            const { error: creditError } = await supabase
              .from("tv_show_credits")
              .upsert(creditToInsert, { onConflict: "tv_show_id,person_id,job" });
            
            if (creditError) {
              console.error(`❌ Error inserting TV show credit:`, creditError.message);
            }
          }
        }
      }

      console.log(`✅ Synced TV show: ${detailsData.name}`);
    } catch (error) {
      console.error(`❌ Error processing TV show ${tvShow.id}:`, error.message);
    }
    }
  }
  
  console.log("✅ TV shows synced from multiple pages");
}

async function syncTrendingContent() {
  console.log("🔥 Syncing trending content...");
  
  try {
    // Sync trending movies
    const trendingMoviesUrl = `https://api.themoviedb.org/3/trending/movie/week?api_key=${TMDB_API_KEY}`;
    const movieResponse = await fetch(trendingMoviesUrl, { cache: "no-store" });
    
    if (movieResponse.ok) {
      const movieData = await movieResponse.json();
      console.log(`📈 Found ${movieData.results.length} trending movies`);
      
      for (const movie of movieData.results.slice(0, 10)) {
        await syncSingleMovie(movie.id);
      }
    }

    // Sync trending TV shows
    const trendingTVUrl = `https://api.themoviedb.org/3/trending/tv/week?api_key=${TMDB_API_KEY}`;
    const tvResponse = await fetch(trendingTVUrl, { cache: "no-store" });
    
    if (tvResponse.ok) {
      const tvData = await tvResponse.json();
      console.log(`📈 Found ${tvData.results.length} trending TV shows`);
      
      for (const tvShow of tvData.results.slice(0, 10)) {
        await syncSingleTVShow(tvShow.id);
      }
    }
    
    console.log("✅ Trending content synced");
  } catch (error) {
    console.error("❌ Error syncing trending content:", error.message);
  }
}

async function syncTopRatedContent() {
  console.log("⭐ Syncing top-rated content...");
  
  try {
    // Sync top-rated movies
    const topMoviesUrl = `https://api.themoviedb.org/3/movie/top_rated?api_key=${TMDB_API_KEY}&page=1`;
    const movieResponse = await fetch(topMoviesUrl, { cache: "no-store" });
    
    if (movieResponse.ok) {
      const movieData = await movieResponse.json();
      console.log(`⭐ Found ${movieData.results.length} top-rated movies`);
      
      for (const movie of movieData.results.slice(0, 15)) {
        await syncSingleMovie(movie.id);
      }
    }

    // Sync top-rated TV shows
    const topTVUrl = `https://api.themoviedb.org/3/tv/top_rated?api_key=${TMDB_API_KEY}&page=1`;
    const tvResponse = await fetch(topTVUrl, { cache: "no-store" });
    
    if (tvResponse.ok) {
      const tvData = await tvResponse.json();
      console.log(`⭐ Found ${tvData.results.length} top-rated TV shows`);
      
      for (const tvShow of tvData.results.slice(0, 15)) {
        await syncSingleTVShow(tvShow.id);
      }
    }
    
    console.log("✅ Top-rated content synced");
  } catch (error) {
    console.error("❌ Error syncing top-rated content:", error.message);
  }
}

async function syncSingleMovie(movieId) {
  try {
    const detailsUrl = `https://api.themoviedb.org/3/movie/${movieId}?api_key=${TMDB_API_KEY}&append_to_response=credits`;
    const detailsResponse = await fetch(detailsUrl, { cache: "no-store" });
    
    if (!detailsResponse.ok) return;
    
    const detailsData = await detailsResponse.json();

    // Insert movie (same logic as in syncMovies)
    const movieToInsert = {
      id: detailsData.id,
      title: detailsData.title,
      release_date: detailsData.release_date,
      poster: detailsData.poster_path
        ? `https://image.tmdb.org/t/p/w500${detailsData.poster_path}`
        : null,
      synopsis: detailsData.overview,
      rating: detailsData.rating,
      vote_count: detailsData.vote_count,
      duration: detailsData.duration,
      budget: detailsData.budget,
      revenue: detailsData.revenue,
      original_language: detailsData.original_language,
      backdrop_path: detailsData.backdrop_path
        ? `https://image.tmdb.org/t/p/w1280${detailsData.backdrop_path}`
        : null
    };

    const { error: movieError } = await supabase
      .from("movies")
      .upsert(movieToInsert, { onConflict: "id" });
    
    if (!movieError && detailsData.genres) {
      const movieGenres = detailsData.genres.map((genre) => ({
        movie_id: detailsData.id,
        genre_id: genre.id
      }));

      await supabase
        .from("movie_genres")
        .upsert(movieGenres, { onConflict: "movie_id,genre_id" });
    }
  } catch (error) {
    console.error(`❌ Error syncing single movie ${movieId}:`, error.message);
  }
}

async function syncSingleTVShow(tvShowId) {
  try {
    const detailsUrl = `https://api.themoviedb.org/3/tv/${tvShowId}?api_key=${TMDB_API_KEY}&append_to_response=credits`;
    const detailsResponse = await fetch(detailsUrl, { cache: "no-store" });
    
    if (!detailsResponse.ok) return;
    
    const detailsData = await detailsResponse.json();

    // Insert TV show (same logic as in syncTVShows)
    const tvShowToInsert = {
      id: detailsData.id,
      title: detailsData.name,
      first_air_date: detailsData.first_air_date,
      last_air_date: detailsData.last_air_date,
      poster: detailsData.poster_path
        ? `https://image.tmdb.org/t/p/w500${detailsData.poster_path}`
        : null,
      synopsis: detailsData.overview,
      rating: detailsData.rating,
      vote_count: detailsData.vote_count,
      number_of_seasons: detailsData.number_of_seasons,
      number_of_episodes: detailsData.number_of_episodes,
      status: detailsData.status,
      original_language: detailsData.original_language,
      backdrop_path: detailsData.backdrop_path
        ? `https://image.tmdb.org/t/p/w1280${detailsData.backdrop_path}`
        : null
    };

    const { error: tvError } = await supabase
      .from("tv_shows")
      .upsert(tvShowToInsert, { onConflict: "id" });
    
    if (!tvError && detailsData.genres) {
      const tvGenres = detailsData.genres.map((genre) => ({
        tv_show_id: detailsData.id,
        genre_id: genre.id
      }));

      await supabase
        .from("tv_show_genres")
        .upsert(tvGenres, { onConflict: "tv_show_id,genre_id" });
    }
  } catch (error) {
    console.error(`❌ Error syncing single TV show ${tvShowId}:`, error.message);
  }
}

async function syncPeople() {
  console.log("👥 Syncing people (actors, directors, crew)...");
  
  try {
    // Get popular people from TMDB
    for (let page = 1; page <= 2; page++) {
      console.log(`📄 Fetching people page ${page}...`);
      
      const peopleUrl = `https://api.themoviedb.org/3/person/popular?api_key=${TMDB_API_KEY}&page=${page}`;
      const response = await fetch(peopleUrl, { cache: "no-store" });
      
      if (!response.ok) {
        console.error(`Failed to fetch people page ${page}`);
        continue;
      }
      
      const data = await response.json();
      
      for (const person of data.results) {
        const personData = {
          id: person.id,
          name: person.name,
          biography: person.biography || null,
          birthday: person.birthday || null,
          deathday: person.deathday || null,
          place_of_birth: person.place_of_birth || null,
          profile_path: person.profile_path 
            ? `https://image.tmdb.org/t/p/w500${person.profile_path}`
            : null,
          popularity: person.popularity || 0,
          known_for_department: person.known_for_department || 'Acting'
        };

        const { error } = await supabase
          .from("people")
          .upsert(personData, { onConflict: "id" });

        if (error) {
          console.error(`❌ Error inserting person ${person.name}:`, error.message);
        }
      }
    }
    
    console.log("✅ People synced successfully");
  } catch (error) {
    console.error("❌ Error syncing people:", error.message);
  }
}

async function syncCollections() {
  console.log("📚 Syncing movie collections...");
  
  try {
    // Get some popular movie collections
    const collectionIds = [
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, // Marvel, DC, etc.
      86311, 131295, 131296, 131635, // Popular franchises
      230, 295, 528, 556, 645 // Classic collections
    ];
    
    for (const collectionId of collectionIds) {
      try {
        const collectionUrl = `https://api.themoviedb.org/3/collection/${collectionId}?api_key=${TMDB_API_KEY}`;
        const response = await fetch(collectionUrl, { cache: "no-store" });
        
        if (!response.ok) continue;
        
        const collection = await response.json();
        
        const collectionData = {
          id: collection.id,
          name: collection.name,
          overview: collection.overview || null,
          poster: collection.poster_path 
            ? `https://image.tmdb.org/t/p/w500${collection.poster_path}`
            : null,
          backdrop_path: collection.backdrop_path 
            ? `https://image.tmdb.org/t/p/w1280${collection.backdrop_path}`
            : null
        };

        const { error } = await supabase
          .from("collections")
          .upsert(collectionData, { onConflict: "id" });

        if (error) {
          console.error(`❌ Error inserting collection ${collection.name}:`, error.message);
        }
      } catch (error) {
        console.error(`❌ Error syncing collection ${collectionId}:`, error.message);
      }
    }
    
    console.log("✅ Collections synced successfully");
  } catch (error) {
    console.error("❌ Error syncing collections:", error.message);
  }
}

async function syncAwards() {
  console.log("🏆 Creating sample awards data...");
  
  try {
    const sampleAwards = [
      {
        id: 1,
        name: "Academy Award for Best Picture",
        category: "Best Picture",
        year: 2023,
        winner: true,
        movie_id: null,
        tv_show_id: null,
        person_id: null
      },
      {
        id: 2,
        name: "Golden Globe Award for Best Motion Picture",
        category: "Best Motion Picture - Drama",
        year: 2023,
        winner: true,
        movie_id: null,
        tv_show_id: null,
        person_id: null
      },
      {
        id: 3,
        name: "Emmy Award for Outstanding Drama Series",
        category: "Outstanding Drama Series",
        year: 2023,
        winner: true,
        movie_id: null,
        tv_show_id: null,
        person_id: null
      },
      {
        id: 4,
        name: "BAFTA Award for Best Film",
        category: "Best Film",
        year: 2023,
        winner: true,
        movie_id: null,
        tv_show_id: null,
        person_id: null
      },
      {
        id: 5,
        name: "Screen Actors Guild Award",
        category: "Outstanding Performance by a Cast",
        year: 2023,
        winner: false,
        movie_id: null,
        tv_show_id: null,
        person_id: null
      }
    ];

    for (const award of sampleAwards) {
      const { error } = await supabase
        .from("awards")
        .upsert(award, { onConflict: "id" });

      if (error) {
        console.error(`❌ Error inserting award ${award.name}:`, error.message);
      }
    }
    
    console.log("✅ Sample awards created successfully");
  } catch (error) {
    console.error("❌ Error creating awards:", error.message);
  }
}

async function syncReviews() {
  console.log("⭐ Creating sample reviews...");
  
  try {
    // Get some movies and TV shows to create reviews for
    const { data: movies } = await supabase
      .from("movies")
      .select("id")
      .limit(10);

    const { data: tvShows } = await supabase
      .from("tv_shows")
      .select("id")
      .limit(5);

    const { data: users } = await supabase
      .from("users")
      .select("id")
      .limit(3);

    if (!movies || !tvShows || !users) {
      console.log("⚠️ No data available for creating reviews");
      return;
    }

    const sampleReviews = [
      "Amazing cinematography and stellar performances!",
      "A masterpiece that will be remembered for years to come.",
      "Great storyline but could have been shorter.",
      "Excellent character development and plot twists.",
      "Visually stunning with incredible special effects.",
      "A bit slow-paced but worth watching.",
      "Outstanding acting and direction.",
      "One of the best films/shows I've ever seen!",
      "Good entertainment value for the whole family.",
      "Compelling narrative with emotional depth."
    ];

    let reviewId = 1;

    // Create reviews for movies
    for (const movie of movies.slice(0, 5)) {
      for (const user of users) {
        const review = {
          id: reviewId++,
          user_id: user.id,
          movie_id: movie.id,
          tv_show_id: null,
          rating: Math.floor(Math.random() * 5) + 1, // 1-5 stars
          review_text: sampleReviews[Math.floor(Math.random() * sampleReviews.length)],
          created_at: new Date().toISOString()
        };

        const { error } = await supabase
          .from("reviews")
          .upsert(review, { onConflict: "id" });

        if (error) {
          console.error(`❌ Error inserting review ${reviewId}:`, error.message);
        }
      }
    }

    // Create reviews for TV shows
    for (const tvShow of tvShows.slice(0, 3)) {
      for (const user of users) {
        const review = {
          id: reviewId++,
          user_id: user.id,
          movie_id: null,
          tv_show_id: tvShow.id,
          rating: Math.floor(Math.random() * 5) + 1, // 1-5 stars
          review_text: sampleReviews[Math.floor(Math.random() * sampleReviews.length)],
          created_at: new Date().toISOString()
        };

        const { error } = await supabase
          .from("reviews")
          .upsert(review, { onConflict: "id" });

        if (error) {
          console.error(`❌ Error inserting review ${reviewId}:`, error.message);
        }
      }
    }
    
    console.log("✅ Sample reviews created successfully");
  } catch (error) {
    console.error("❌ Error creating reviews:", error.message);
  }
}

async function syncWatchlist() {
  console.log("📝 Creating sample watchlist entries...");
  
  try {
    // Get some movies and TV shows to add to watchlists
    const { data: movies } = await supabase
      .from("movies")
      .select("id")
      .limit(15);

    const { data: tvShows } = await supabase
      .from("tv_shows")
      .select("id")
      .limit(10);

    const { data: users } = await supabase
      .from("users")
      .select("id")
      .limit(3);

    if (!movies || !tvShows || !users) {
      console.log("⚠️ No data available for creating watchlist entries");
      return;
    }

    let watchlistId = 1;

    // Create watchlist entries for each user
    for (const user of users) {
      // Add some movies to watchlist
      const userMovies = movies.slice(0, Math.floor(Math.random() * 8) + 3); // 3-10 movies per user
      for (const movie of userMovies) {
        const watchlistEntry = {
          id: watchlistId++,
          user_id: user.id,
          movie_id: movie.id,
          tv_show_id: null,
          added_at: new Date().toISOString()
        };

        const { error } = await supabase
          .from("watchlist")
          .upsert(watchlistEntry, { onConflict: "id" });

        if (error) {
          console.error(`❌ Error inserting watchlist entry ${watchlistId}:`, error.message);
        }
      }

      // Add some TV shows to watchlist
      const userTVShows = tvShows.slice(0, Math.floor(Math.random() * 5) + 2); // 2-6 TV shows per user
      for (const tvShow of userTVShows) {
        const watchlistEntry = {
          id: watchlistId++,
          user_id: user.id,
          movie_id: null,
          tv_show_id: tvShow.id,
          added_at: new Date().toISOString()
        };

        const { error } = await supabase
          .from("watchlist")
          .upsert(watchlistEntry, { onConflict: "id" });

        if (error) {
          console.error(`❌ Error inserting watchlist entry ${watchlistId}:`, error.message);
        }
      }
    }
    
    console.log("✅ Sample watchlist entries created successfully");
  } catch (error) {
    console.error("❌ Error creating watchlist entries:", error.message);
  }
}