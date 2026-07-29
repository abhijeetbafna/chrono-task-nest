# TaskNest 🪹

TaskNest is a modern, high-performance task management application designed for deep work, real-time planning, and habit tracking.

Built with React 19, Vite, TanStack Router & Query, Tailwind CSS, and Supabase.

---

## ✨ Features

- **Nested Sub-Tasks & Timelines**: Create hierarchical task structures with parent-child relationships and visual progress windows.
- **Emoji Buckets**: Group your work into custom project buckets with custom emoji icons (🏠, 💼, 🚀, 🎯, etc.).
- **Interactive Board View**: Drag-and-drop Kanban board with nested sub-task breakdowns.
- **Habit Tracker & Calendar**: Track daily habits, consistency streaks, and calendar schedule.
- **Customizable Profile & Settings**:
  - Light & Dark mode support with persistent preference.
  - 12-hour (AM/PM) vs 24-hour time format options.
  - Global timezone configuration.
  - Avatar presets & custom image upload.
- **Authentication**: Email/Password authentication with account existence verification and password reset flow.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Vite, TanStack Router, TanStack Query
- **Styling**: Tailwind CSS v4, Lucide Icons, Shadcn UI
- **Backend & Database**: Supabase (PostgreSQL, Auth, Realtime)

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+)
- npm or bun

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/abhijeetbafna/chrono-task-nest.git
   cd chrono-task-nest
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   Create a `.env` file in the root directory:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
   ```

4. **Run the development server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:8080](http://localhost:8080) in your browser.

---

## 📜 License

MIT License. Designed & Developed for TaskNest.
