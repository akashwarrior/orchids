# Orchids CLI Agent

This project demonstrates **Orchid's Database Agent** - an AI-powered tool that can analyze a Next.js project and implement database-related features with full frontend integration. The agent can currently:

- Set up database schemas using Drizzle ORM
- Create API endpoints for database operations
- Integrate database functionality into the existing UI
- Handle migrations and data seeding
- Handle real-time lint errors

## Quick Start

### Prerequisites
- Node.js 18+ or Bun
- PostgreSQL database (local or cloud)
- Google Gemini API key

### Installation

1. **Clone and install dependencies:**
    ```bash
    git clone https://github.com/akashwarrior/orchids.git
    cd orchids
    npm install
    ```

2. **Set up environment variables:**
    ```bash
    # Create CLI environment file and add the api key
    cp cli/.env.example cli/.env
    ```

3. **Configure database:**
    ```bash
    # Agent will use this url or you can mdify this url in system prompt
    "DATABASE_URL=postgresql://postgres:password@localhost:5432"
    ```

### Running the Application

1. **Start the development server:**
    ```bash
    npm run dev
    ```

2. **Open the CLI in a new terminal:**
    ```bash
    npm run orchids
    ```

3. **Try the database agent with example queries:**
    ```
    🌸 orchids › Can you store the recently played songs in a table
    🌸 orchids › Can you store the 'Made for you' and 'Popular albums' in a table
    ```

## 🎮 Using the Database Agent

The CLI provides an interactive interface where you can describe database features in natural language:

### Available Commands
- `help` - Show available commands
- `clear` - Clear the terminal
- `exit` - Exit the application

## 📁 Project Structure

```
orchids/
├── cli/
│   ├── src/
│   │   ├── agent/         # AI agent implementation
│   │   ├── index.ts       # CLI entry point
│   │   └── terminal.ts    # CLI interface
│   └── package.json
```

## 🧪 Test Queries

Try these example queries to see the agent in action:

1. **"Can you store the recently played songs in a table"**
   - Creates a `recently_played` table
   - Implements API endpoints
   - Integrates with the frontend player

2. **"Can you store the 'Made for you' and 'Popular albums' in a table"**
   - Creates `albums` and `playlists` tables
   - Seeds with sample data
   - Updates the home page to fetch real data