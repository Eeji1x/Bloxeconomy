# BloxEconomy

A futuristic virtual economy: invite-only sign-ups, limited items with permanent global serials, an emerald-based currency, atomic trading, leaderboards, and a 3D web client (beta).

> **Note:** This project is built and deployed via [Lovable](https://lovable.dev). The frontend is React + Vite + Tailwind, and the backend (Lovable Cloud) is powered by Supabase under the hood.

---

## Quick start (Lovable)

1. **Open the project on Lovable.** Browse to your project URL — every change is reflected in the live preview.
2. **Connect Lovable Cloud** (already connected here). All database tables, edge functions, storage buckets, and auth are managed in-app under **Cloud → Tables / Functions / Auth**.
3. **Publish** with the Publish button (top-right of the editor). Frontend changes require an explicit "Update"; backend changes deploy immediately.

That's it. You don't need to run anything locally to develop on Lovable.

---

## Setting this source up locally

If you want to fork the repo and develop outside of Lovable, you'll need:

- **Node.js 18+** and **npm**
- A **Supabase** project (free tier works)

```bash
# 1. Clone & install
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>
npm install

# 2. Configure environment variables
cp .env.example .env
# Then edit .env (see below)

# 3. Run dev server
npm run dev
```

### Environment variables

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_or_publishable_key
VITE_SUPABASE_PROJECT_ID=your_project_ref
```

> **On Lovable**, this `.env` is auto-managed — never commit secrets manually.

### Database

The full schema (tables, RLS, triggers, functions) lives in `supabase/migrations/`. Run them in order via the Supabase SQL editor or the Supabase CLI:

```bash
npx supabase link --project-ref YOUR_REF
npx supabase db push
```

### Edge functions

Edge functions live in `supabase/functions/`. Each subdirectory is one function (e.g., `execute-trade`, `redeem-promocode`).

```bash
npx supabase functions deploy execute-trade
```

---

## Code snippets — talking to the backend

### TypeScript / JavaScript (browser)

```ts
import { supabase } from "@/integrations/supabase/client";

// Fetch the catalog
const { data: items, error } = await supabase
  .from("catalog_items")
  .select("id, name, price, image_url")
  .order("created_at", { ascending: false })
  .limit(20);

// Realtime: subscribe to chat
const channel = supabase
  .channel("game_chat_room")
  .on("postgres_changes",
    { event: "INSERT", schema: "public", table: "game_chat" },
    (payload) => console.log("new chat:", payload.new))
  .subscribe();
```

### Plain JSON (REST API)

```bash
curl "https://YOUR_REF.supabase.co/rest/v1/catalog_items?select=id,name,price&limit=5" \
  -H "apikey: YOUR_PUBLISHABLE_KEY" \
  -H "Authorization: Bearer YOUR_PUBLISHABLE_KEY"
```

### Java (any HTTP client)

```java
HttpRequest req = HttpRequest.newBuilder()
  .uri(URI.create("https://YOUR_REF.supabase.co/rest/v1/catalog_items?select=id,name,price&limit=5"))
  .header("apikey", "YOUR_PUBLISHABLE_KEY")
  .header("Authorization", "Bearer YOUR_PUBLISHABLE_KEY")
  .GET().build();

HttpResponse<String> res = HttpClient.newHttpClient()
  .send(req, HttpResponse.BodyHandlers.ofString());
System.out.println(res.body());
```

### Python

```python
import requests
r = requests.get(
  "https://YOUR_REF.supabase.co/rest/v1/catalog_items",
  params={"select": "id,name,price", "limit": 5},
  headers={
    "apikey": "YOUR_PUBLISHABLE_KEY",
    "Authorization": "Bearer YOUR_PUBLISHABLE_KEY",
  },
)
print(r.json())
```

---

## Project structure

```
src/
├── pages/             # Route components (Catalog, Trading, Games, Admin, …)
├── components/
│   ├── admin/         # Admin/Owner panels (CMD, BetaKeys, Lottery, …)
│   ├── games/         # 3D web client + chat
│   ├── home/          # Era-replica landing pages
│   ├── layout/        # Navbars, sidebars, layout wrappers
│   └── ui/            # shadcn/ui primitives
├── contexts/          # AuthContext, ThemeContext
├── hooks/             # useAuth, useUserRoles, useMaintenanceMode, …
├── lib/               # supabase client, helpers, constants
└── integrations/      # auto-generated Supabase types & client

supabase/
├── functions/         # Edge functions (execute-trade, redeem-promocode, …)
└── migrations/        # SQL schema migrations
```

---

## Tech stack

- **React 18** + **TypeScript** + **Vite 5**
- **Tailwind CSS v3** + **shadcn/ui**
- **react-three/fiber** + **drei** (3D web client)
- **Supabase** (Postgres, Auth, Realtime, Edge Functions, Storage) — provided by **Lovable Cloud**

---

## License

This source is provided as-is for educational reference. Do not deploy commercially without permission.
