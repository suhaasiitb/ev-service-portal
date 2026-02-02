# 🔋 EV Service Portal

A comprehensive React-based service management portal for Electric Vehicle (EV) maintenance stations. This application streamlines service operations by providing role-based dashboards for engineers and managers to efficiently track service tickets, walk-in jobs, inventory, and engineer performance metrics.

## 📖 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Database Schema](#database-schema)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Setup](#environment-setup)
- [Usage](#usage)
  - [User Roles](#user-roles)
  - [Engineer Dashboard](#engineer-dashboard)
  - [Manager Dashboard](#manager-dashboard)
- [Deployment](#deployment)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [License](#license)

---

## 🎯 Overview

The **EV Service Portal** is designed to digitize and optimize the service workflow for electric vehicle maintenance stations. It addresses common pain points in service management such as:

- Manual ticket tracking and assignment
- Lack of real-time visibility into service status
- Inefficient inventory management
- Difficulty in monitoring engineer performance
- Poor coordination between field engineers and service stations

The portal provides a centralized platform where:
- **Engineers** can view assigned tickets, close completed jobs, and log walk-in services
- **Managers** can monitor station performance, track inventory, and analyze service metrics
- **Customers** can raise service tickets through a public form

---

## ✨ Features

### Engineer Dashboard
- 📊 **Real-time KPI Metrics**
  - Tickets reported today
  - Tickets closed today
  - Currently open tickets
  - Average turnaround time (TAT)
  - Walk-in services today and last 7 days

- 🎫 **Ticket Management**
  - View all service tickets for your station
  - Filter by date and status
  - Sort by newest first or open tickets first
  - Close tickets with parts usage and cost tracking
  - Assign engineer to completed tickets

- 🚶 **Walk-In Service Management**
  - Log ad-hoc walk-in services
  - Track parts used and labor costs
  - Record issue descriptions and bike details
  - Search and filter walk-in history

- 👥 **Engineer Performance Tracking**
  - View tickets and walk-ins completed by each engineer (last 7 days)
  - Performance comparison across team members

### Manager Dashboard
- 📦 **Inventory Management**
  - View inventory by station
  - Track stock levels with low-stock alerts
  - Search parts by name, SKU, or compatible bike models
  - Edit inventory quantities (overwrite or add/remove)
  - View total stock value and SKU count
  - Sort by quantity (ascending/descending)

- 📈 **Service Analytics**
  - Station-wise ticket metrics
  - Engineer performance reports
  - Walk-in service trends
  - Cost tracking and revenue analysis

- 🎫 **Ticket Oversight**
  - View all tickets across stations
  - Monitor ticket status and resolution times
  - Track parts usage and costs

### Public Ticket Submission
- 📝 **Customer Portal** (`/ticket` route)
  - Simple form for bike owners to report issues
  - Bike number validation against registered bikes
  - Image upload support
  - Issue description with quick-select presets
  - Contact and location information

---

## 🛠️ Tech Stack

### Frontend
- **React** 18.3.1 - UI library
- **Vite** 7.2.2 - Build tool and dev server
- **React Router DOM** 7.9.5 - Client-side routing
- **Tailwind CSS** 3.4.13 - Utility-first CSS framework

### Backend & Services
- **Supabase** - Backend-as-a-Service
  - PostgreSQL database
  - Authentication (email/password)
  - Row Level Security (RLS)
  - Edge Functions (serverless functions)
  - Real-time subscriptions

### Authentication
- **@supabase/auth-ui-react** - Pre-built auth components
- **@supabase/supabase-js** - Supabase client SDK

### Development Tools
- **ESLint** - Code linting
- **PostCSS** & **Autoprefixer** - CSS processing
- **gh-pages** - Deployment to GitHub Pages

---

## 🏗️ Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Client Layer                      │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────┐  │
│  │   Public     │  │   Engineer   │  │  Manager  │  │
│  │ Ticket Form  │  │  Dashboard   │  │ Dashboard │  │
│  └──────────────┘  └──────────────┘  └───────────┘  │
└─────────────────────────────────────────────────────┘
                        ↕
┌─────────────────────────────────────────────────────┐
│              React Router (SPA Routing)             │
└─────────────────────────────────────────────────────┘
                        ↕
┌─────────────────────────────────────────────────────┐
│           Supabase Client (Auth + API)              │
└─────────────────────────────────────────────────────┘
                        ↕
┌─────────────────────────────────────────────────────┐
│                  Supabase Backend                   │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────┐  │
│  │ PostgreSQL   │  │     Auth     │  │   Edge    │  │
│  │   Database   │  │    Service   │  │ Functions │  │
│  └──────────────┘  └──────────────┘  └───────────┘  │
└─────────────────────────────────────────────────────┘
```

### Application Flow

1. **Authentication Flow**
   - User visits `/` (Login page)
   - Supabase Auth UI handles email/password authentication
   - `AuthWatcher` component listens for auth state changes
   - On successful login, user redirected to `/dashboard`

2. **Role-Based Routing**
   - `DashboardWrapper` fetches user role from `users` table
   - If role = "manager" → redirect to `/manager`
   - If role = "engineer" → show `TicketDashboard`

3. **Data Flow**
   - Custom hooks (`useTickets`, `useWalkins`, `useEngineers`) fetch data from Supabase
   - `useDashboardMetrics` computes KPIs from fetched data
   - Components render data with pagination, filtering, and sorting
   - User actions trigger Supabase mutations (insert/update)

---

## 🗄️ Database Schema

### Core Tables

#### `users`
User accounts with role-based access
```sql
- id (uuid, PK) - Maps to auth.users.id
- email (text)
- role (text) - "engineer" | "manager"
- station_id (uuid, FK → stations.id)
- created_at (timestamp)
```

#### `stations`
Service station locations
```sql
- id (uuid, PK)
- name (text)
- location (text)
- created_at (timestamp)
```

#### `bikes`
Registered electric vehicles
```sql
- id (uuid, PK)
- bike_number (text, unique)
- model_id (uuid, FK → bike_models.id)
- station_id (uuid, FK → stations.id)
- created_at (timestamp)
```

#### `bike_models`
Bike model types
```sql
- id (uuid, PK)
- model_name (text)
- created_at (timestamp)
```

#### `tickets`
Service tickets raised by customers
```sql
- id (uuid, PK)
- bike_id (uuid, FK → bikes.id)
- bike_number_text (text) - Denormalized for quick access
- station_id (uuid, FK → stations.id)
- issue_description (text)
- location (text)
- contact (text)
- image_url (text) - Optional photo of issue
- status (text) - "open" | "closed"
- reported_at (timestamp)
- closed_at (timestamp)
- closed_by (uuid, FK → users.id) - Engineer who closed
- cost_charged (decimal)
```

#### `walkins`
Walk-in service jobs (not raised via ticket)
```sql
- id (uuid, PK)
- bike_id (uuid, FK → bikes.id)
- bike_number_text (text)
- engineer_id (uuid, FK → users.id)
- station_id (uuid, FK → stations.id)
- model_id (uuid, FK → bike_models.id)
- issue_description (text)
- cost_charged (decimal)
- logged_at (timestamp)
```

#### `parts_catalog`
Master parts inventory catalog
```sql
- id (uuid, PK)
- part_name (text)
- sku (text, unique)
- unit_cost (decimal)
- created_at (timestamp)
```

#### `part_model_map`
Mapping of compatible parts to bike models
```sql
- part_id (uuid, FK → parts_catalog.id)
- model_id (uuid, FK → bike_models.id)
- (part_id, model_id) as composite PK
```

#### `inventory_master`
Station-wise parts inventory
```sql
- id (uuid, PK)
- station_id (uuid, FK → stations.id)
- part_id (uuid, FK → parts_catalog.id)
- quantity (integer)
- reorder_level (integer) - Low stock threshold
- last_updated_by (uuid, FK → users.id)
- updated_at (timestamp)
```

#### `ticket_parts`
Parts used for ticket resolution
```sql
- ticket_id (uuid, FK → tickets.id)
- part_id (uuid, FK → parts_catalog.id)
- quantity (integer)
```

#### `walkin_parts`
Parts used for walk-in services
```sql
- walkin_id (uuid, FK → walkins.id)
- part_id (uuid, FK → parts_catalog.id)
- quantity (integer)
```

### Relationships

```
stations (1) ──< (M) bikes
stations (1) ──< (M) users
stations (1) ──< (M) tickets
stations (1) ──< (M) walkins
stations (1) ──< (M) inventory_master

bike_models (1) ──< (M) bikes
bike_models (M) ──< (M) parts_catalog (via part_model_map)

bikes (1) ──< (M) tickets
bikes (1) ──< (M) walkins

users (1) ──< (M) tickets (as closed_by)
users (1) ──< (M) walkins (as engineer_id)

parts_catalog (1) ──< (M) inventory_master
parts_catalog (1) ──< (M) ticket_parts
parts_catalog (1) ──< (M) walkin_parts

tickets (1) ──< (M) ticket_parts
walkins (1) ──< (M) walkin_parts
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18.x or higher
- **npm** or **yarn**
- **Supabase account** (free tier available at [supabase.com](https://supabase.com))
- **Git**

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/ev-service-portal.git
   cd ev-service-portal
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Supabase**
   
   a. Create a new Supabase project at [app.supabase.com](https://app.supabase.com)
   
   b. Run the SQL migrations to create tables:
      - Navigate to SQL Editor in Supabase dashboard
      - Execute the schema creation scripts (see `supabase/` folder if available)
      - Or manually create tables based on the schema above
   
   c. Set up Row Level Security (RLS) policies:
      ```sql
      -- Example: Engineers can only see tickets for their station
      CREATE POLICY "Engineers see own station tickets"
      ON tickets FOR SELECT
      TO authenticated
      USING (
        station_id IN (
          SELECT station_id FROM users WHERE id = auth.uid()
        )
      );
      ```
   
   d. Deploy edge function for ticket submission:
      ```bash
      cd supabase/functions
      supabase functions deploy submit-ticket
      ```

### Environment Setup

1. **Create `.env` file in the project root**
   ```bash
   cp .env.example .env  # If .env.example exists
   # Or create .env manually:
   ```

2. **Add your Supabase credentials**
   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

3. **Get credentials from Supabase dashboard**
   - Go to Project Settings → API
   - Copy the Project URL and anon/public key

⚠️ **Security Note**: Never commit `.env` to version control. It should already be in `.gitignore`.

### Running Locally

1. **Start development server**
   ```bash
   npm run dev
   ```

2. **Open browser**
   - Navigate to `http://localhost:5173` (or the port shown in terminal)

3. **Login**
   - Use credentials from your Supabase users table
   - Or create test users via Supabase dashboard → Authentication

---

## 📱 Usage

### User Roles

The application supports two primary user roles:

1. **Engineer** - Field technicians assigned to service stations
   - Access: `/dashboard` route
   - Can view and close tickets
   - Can log walk-in services
   - Can track parts usage

2. **Manager** - Station managers with oversight access
   - Access: `/manager` route
   - Can view all tickets and walk-ins
   - Can manage inventory
   - Can view performance analytics

### Engineer Dashboard

**Accessing the Dashboard:**
1. Login with engineer credentials
2. Automatically redirected to `/dashboard`
3. View your station name in the header

**Key Actions:**

- **View Tickets**
  - Click "Tickets" tab to see active and historical tickets
  - Use date filter to narrow results
  - Toggle "Open First" to prioritize open tickets

- **Close a Ticket**
  - Click "Close" button on an open ticket
  - Modal opens with:
    - Ticket details (bike, issue, reported time)
    - Parts selection dropdown (model-compatible parts)
    - Quantity inputs for each part
    - Engineer assignment dropdown
    - Cost input field
  - Click "Close Ticket" to submit

- **Log Walk-In Service**
  - Click "+ New Walk-In Job" button
  - Enter bike number (validates against registered bikes)
  - Describe the issue
  - Select engineer
  - Add parts used
  - Enter cost charged
  - Submit to log the service

- **Monitor Performance**
  - View engineer performance table showing:
    - Tickets closed (last 7 days)
    - Walk-ins completed (last 7 days)
    - Total jobs per engineer

### Manager Dashboard

**Accessing the Dashboard:**
1. Login with manager credentials
2. Automatically redirected to `/manager`

**Inventory Management:**
1. Navigate to Inventory tab
2. Select a station from dropdown
3. View inventory summary (SKUs, quantity, value, low stock)
4. Use search bar to find parts
5. Click column headers to sort
6. Click "Edit" on any row to:
   - Set exact quantity (overwrite mode)
   - Add/remove stock (delta mode)

**Ticket Oversight:**
- View tickets across all stations
- Filter by date, station, status
- Track resolution times and costs

**Analytics:**
- View aggregated metrics
- Compare station performance
- Track parts usage trends

---

## 🌐 Deployment

### GitHub Pages (Current Setup)

The project is configured to deploy to GitHub Pages.

1. **Update `package.json`**
   ```json
   "homepage": "https://YOUR_USERNAME.github.io/ev-service-portal"
   ```
   Replace `YOUR_USERNAME` with your GitHub username.

2. **Build the project**
   ```bash
   npm run build
   ```

3. **Deploy to GitHub Pages**
   ```bash
   npm run deploy
   ```

4. **Configure GitHub Pages**
   - Go to repository Settings → Pages
   - Source: Deploy from branch `gh-pages`
   - Wait a few minutes for deployment

**Note:** The build script creates a `404.html` copy of `index.html` to handle SPA routing on GitHub Pages.

### Alternative Deployment Options

- **Vercel**
  ```bash
  npm install -g vercel
  vercel
  ```

- **Netlify**
  - Connect GitHub repository
  - Build command: `npm run build`
  - Publish directory: `dist`

- **Cloudflare Pages**
  - Similar to Netlify setup
  - Supports SPA routing natively

---

## 📂 Project Structure

```
ev-service-portal/
├── src/
│   ├── components/              # Reusable UI components
│   │   ├── common/              # Shared components
│   │   │   └── SearchablePartSelect.jsx
│   │   ├── kpi/                 # KPI cards
│   │   │   └── KpiCard.jsx
│   │   ├── tickets/             # Ticket-related components
│   │   │   ├── CloseTicketModal.jsx
│   │   │   └── TicketsTable.jsx
│   │   ├── walkins/             # Walk-in service components
│   │   │   ├── WalkInModal.jsx
│   │   │   └── WalkinsTable.jsx
│   │   ├── EngineerPerformanceTable.jsx
│   │   └── TicketForm.jsx       # Public ticket submission form
│   │
│   ├── hooks/                   # Custom React hooks
│   │   ├── useDashboardMetrics.js  # Computes KPI metrics
│   │   ├── useEngineers.js         # Fetches engineer data
│   │   ├── useTickets.js           # Fetches ticket data
│   │   └── useWalkins.js           # Fetches walk-in data
│   │
│   ├── pages/                   # Page components (routes)
│   │   ├── LoginPage.jsx           # Authentication page
│   │   ├── TicketPage.jsx          # Public ticket form
│   │   ├── DashboardWrapper.jsx    # Role-based routing wrapper
│   │   ├── TicketDashboard.jsx     # Engineer dashboard
│   │   ├── ManagerWrapper.jsx      # Manager routing wrapper
│   │   ├── ManagerInventoryDashboard.jsx
│   │   ├── ManagerTickets.jsx
│   │   └── ManagerWalkins.jsx
│   │
│   ├── lib/                     # Utility libraries
│   │   └── supabaseClient.js    # Supabase client instance
│   │
│   ├── assets/                  # Static assets (images, icons)
│   ├── App.jsx                  # Root component (unused in current setup)
│   ├── App.css                  # Global styles
│   ├── main.jsx                 # Application entry point
│   └── index.css                # Tailwind imports
│
├── supabase/                    # Supabase configuration
│   ├── config.toml              # Supabase CLI config
│   └── functions/               # Edge Functions
│       └── submit-ticket/       # Ticket submission function
│
├── public/                      # Static public assets
├── dist/                        # Build output (generated)
│
├── .env                         # Environment variables (not committed)
├── .gitignore                   # Git ignore rules
├── index.html                   # HTML template
├── package.json                 # Dependencies and scripts
├── vite.config.js               # Vite configuration
├── tailwind.config.js           # Tailwind CSS configuration
├── postcss.config.js            # PostCSS configuration
└── eslint.config.js             # ESLint configuration
```

---

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make your changes**
4. **Run linter**
   ```bash
   npm run lint
   ```
5. **Commit your changes**
   ```bash
   git commit -m "Add feature: your feature description"
   ```
6. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```
7. **Open a Pull Request**

### Development Guidelines

- Follow the existing code style
- Use functional components with hooks
- Write clear, descriptive variable and function names
- Add comments for complex logic
- Keep components small and focused
- Use custom hooks for data fetching and business logic

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- Built with [React](https://react.dev/)
- Powered by [Supabase](https://supabase.com/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)
- Icons from [Heroicons](https://heroicons.com/) (if used)

---

## 📞 Support

For questions or issues, please:
- Open an issue on GitHub
- Contact the development team
- Check the [Supabase documentation](https://supabase.com/docs)

---

## 🔮 Future Roadmap

- [ ] Mobile app (React Native)
- [ ] Real-time notifications for new tickets
- [ ] Advanced analytics dashboard
- [ ] Automated parts reordering
- [ ] SMS/Email notifications
- [ ] Multi-language support
- [ ] Export reports (PDF, CSV)
- [ ] Integration with bike telematics
- [ ] Predictive maintenance alerts

---

**Made with ❤️ for EV Service Management**
