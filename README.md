# Food For You 🍽️

> *Make cooking at home feel like ordering in.*

A premium React Native (Expo) recipe app with a DoorDash-inspired UI, a time-based RNG meal suggester, and a personalized Taste Engine that strictly filters and prioritizes recipes based on your preferences.

---

## Stack

| Layer | Tech |
|---|---|
| Framework | Expo SDK 51 + Expo Router v3 (file-based) |
| Language | TypeScript (strict) |
| Backend / DB | Supabase (Postgres + Auth + RLS) |
| UI | React Native, expo-linear-gradient, @expo/vector-icons |

---

## Project Structure

```
food-for-you/
├── app/
│   ├── _layout.tsx              # Root Stack navigator
│   ├── (tabs)/
│   │   ├── _layout.tsx          # Tab bar (Home / Saved / Taste)
│   │   ├── index.tsx            # 🏠 Home screen
│   │   ├── favorites.tsx        # ❤️  Saved recipes grid
│   │   └── preferences.tsx      # ⚙️  Taste Engine
│   └── recipe/
│       └── [id].tsx             # Recipe detail (dynamic route)
├── components/
│   ├── RecipeCard.tsx           # HeroCard, RecipeCard, ChoiceCard
│   ├── SectionHeader.tsx
│   ├── TagChip.tsx
│   └── LoadingScreen.tsx
├── constants/
│   └── Colors.ts                # Design system tokens
├── hooks/
│   ├── useSession.ts            # Supabase auth session
│   ├── usePreferences.ts        # Taste Engine CRUD
│   └── useRecipes.ts            # Fetch + filter + RNG logic
├── lib/
│   ├── supabase.ts              # Supabase client
│   └── types.ts                 # DB interfaces + helper fns
└── supabase/
    └── schema.sql               # Full DB schema + seed data
```

---

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Set up Supabase

1. Create a free project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and paste the full contents of `supabase/schema.sql`
3. Copy your **Project URL** and **anon public key** from Settings → API

### 3. Configure environment

```bash
cp .env.example .env.local
# Then edit .env.local with your Supabase URL and anon key
```

### 4. Start the app

```bash
npx expo start
```

Scan the QR code with **Expo Go** or run on a simulator.

---

## Feature Guide

### Recipe of the Day
The first recipe with `is_recipe_of_the_day = true` in the database is displayed as a full-width hero card at the top of the Home screen. There is a unique partial index ensuring only one recipe can hold this flag at a time.

### Time-Based RNG (`useRecipes.getRNGChoices`)
- The device clock maps to a meal time: **5am–11am → Breakfast**, **11am–5pm → Lunch**, **5pm+ → Dinner**
- Eligible recipes are filtered by `meal_time` array
- A **weighted random selection** algorithm picks 3 choices, where each recipe's selection probability is proportional to its **affinity score** (see below)
- The "Shuffle" button increments a seed counter, causing `useMemo` to re-run and pick a fresh 3

### Taste Engine (`isRecipeBanned` + `recipeAffinityScore` in `lib/types.ts`)

**Hard bans (dislikes):**
- A recipe is hidden if any ingredient in `ingredients_list` matches a `disliked_ingredient`
- A recipe is hidden if its `cuisine` matches a `disliked_cuisine`
- This filtering runs before ANY recipe reaches the UI

**Soft weighting (likes):**
- Cuisine match: +3 points
- Each matching liked ingredient: +1 point
- Each tag shared with a favorited recipe: +2 points
- Higher score = higher probability of being selected by the RNG

---

## Database Schema Overview

```
users               → mirrors auth.users
user_preferences    → one row per user; stores like/dislike arrays
recipes             → all recipe content
user_favorites      → junction: user ↔ recipe
```

Row Level Security is enabled on all tables. Users can only read/write their own rows.
