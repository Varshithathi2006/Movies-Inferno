// Mock Database for Development
// This provides a simple in-memory database simulation for development purposes

class MockDatabase {
  constructor() {
    this.data = {
      movies: [
        {
          id: 1,
          title: "The Shawshank Redemption",
          description: "Two imprisoned men bond over a number of years, finding solace and eventual redemption through acts of common decency.",
          poster_url: "https://image.tmdb.org/t/p/w500/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg",
          release_year: 1994,
          vote_average: 9.3,
          movie_genres: [
            { genres: { name: "Drama" } }
          ]
        },
        {
          id: 2,
          title: "The Godfather",
          description: "The aging patriarch of an organized crime dynasty transfers control of his clandestine empire to his reluctant son.",
          poster_url: "https://image.tmdb.org/t/p/w500/3bhkrj58Vtu7enYsRolD1fZdja1.jpg",
          release_year: 1972,
          vote_average: 9.2,
          movie_genres: [
            { genres: { name: "Crime" } },
            { genres: { name: "Drama" } }
          ]
        },
        {
          id: 3,
          title: "The Dark Knight",
          description: "When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests of his ability to fight injustice.",
          poster_url: "https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
          release_year: 2008,
          vote_average: 9.0,
          movie_genres: [
            { genres: { name: "Action" } },
            { genres: { name: "Crime" } },
            { genres: { name: "Drama" } }
          ]
        }
      ],
      tv_shows: [
        {
          id: 1,
          title: "Breaking Bad",
          description: "A high school chemistry teacher diagnosed with inoperable lung cancer turns to manufacturing and selling methamphetamine in order to secure his family's future.",
          poster_url: "https://image.tmdb.org/t/p/w500/ggFHVNu6YYI5L9pCfOacjizRGt.jpg",
          first_air_year: 2008,
          vote_average: 9.5,
          tv_show_genres: [
            { genres: { name: "Crime" } },
            { genres: { name: "Drama" } },
            { genres: { name: "Thriller" } }
          ]
        },
        {
          id: 2,
          title: "Game of Thrones",
          description: "Nine noble families fight for control over the lands of Westeros, while an ancient enemy returns after being dormant for millennia.",
          poster_url: "https://image.tmdb.org/t/p/w500/u3bZgnGQ9T01sWNhyveQz0wH0Hl.jpg",
          first_air_year: 2011,
          vote_average: 9.3,
          tv_show_genres: [
            { genres: { name: "Action" } },
            { genres: { name: "Adventure" } },
            { genres: { name: "Drama" } }
          ]
        }
      ]
    };
  }

  async query(sql, params = []) {
    console.log('Mock Database Query:', sql, params);
    
    // Parse basic SQL queries
    const sqlLower = sql.toLowerCase().trim();
    
    if (sqlLower.includes('select now()')) {
      return { rows: [{ now: new Date() }] };
    }
    
    if (sqlLower.includes('select') && sqlLower.includes('from')) {
      return this.handleSelect(sql, params);
    }
    
    if (sqlLower.includes('insert into')) {
      return this.handleInsert(sql, params);
    }
    
    if (sqlLower.includes('update')) {
      return this.handleUpdate(sql, params);
    }
    
    if (sqlLower.includes('delete from')) {
      return this.handleDelete(sql, params);
    }
    
    // Default response
    return { rows: [], rowCount: 0 };
  }

  handleSelect(sql, params) {
    const sqlLower = sql.toLowerCase();
    
    if (sqlLower.includes('movies')) {
      let results = [...this.data.movies];
      
      // Apply ordering
      if (sqlLower.includes('order by')) {
        if (sqlLower.includes('vote_average desc')) {
          results.sort((a, b) => b.vote_average - a.vote_average);
        } else if (sqlLower.includes('release_year desc')) {
          results.sort((a, b) => b.release_year - a.release_year);
        } else if (sqlLower.includes('title')) {
          results.sort((a, b) => a.title.localeCompare(b.title));
        }
      }
      
      // Apply limit
      const limitMatch = sqlLower.match(/limit (\d+)/);
      if (limitMatch) {
        const limit = parseInt(limitMatch[1]);
        results = results.slice(0, limit);
      }
      
      return { rows: results, rowCount: results.length };
    }
    
    if (sqlLower.includes('tv_shows')) {
      let results = [...this.data.tv_shows];
      
      // Apply ordering
      if (sqlLower.includes('order by')) {
        if (sqlLower.includes('vote_average desc')) {
          results.sort((a, b) => b.vote_average - a.vote_average);
        } else if (sqlLower.includes('first_air_year desc')) {
          results.sort((a, b) => b.first_air_year - a.first_air_year);
        } else if (sqlLower.includes('title')) {
          results.sort((a, b) => a.title.localeCompare(b.title));
        }
      }
      
      // Apply limit
      const limitMatch = sqlLower.match(/limit (\d+)/);
      if (limitMatch) {
        const limit = parseInt(limitMatch[1]);
        results = results.slice(0, limit);
      }
      
      return { rows: results, rowCount: results.length };
    }
    
    return { rows: [], rowCount: 0 };
  }

  handleInsert(sql, params) {
    console.log('Mock insert operation:', sql, params);
    return { rows: [], rowCount: 1 };
  }

  handleUpdate(sql, params) {
    console.log('Mock update operation:', sql, params);
    return { rows: [], rowCount: 1 };
  }

  handleDelete(sql, params) {
    console.log('Mock delete operation:', sql, params);
    return { rows: [], rowCount: 1 };
  }
}

export default MockDatabase;