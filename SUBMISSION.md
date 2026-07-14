# ReLoop — Devpost submission

## Title
ReLoop

## Tagline
A hyperlocal give-away map that turns "throw it out" into "give it away" — and shows the CO₂ you save.

## Inspiration / The "Why"
Every day, usable furniture, electronics, clothes, and kitchenware go in the bin
simply because giving them away takes more effort than throwing them out. That's
avoidable waste and avoidable carbon: a working monitor in landfill is roughly
30 kg CO₂e that a neighbour a few streets away would gladly have used. We wanted
to make the *give-it-away* path faster than the *bin-it* path — and make the
climate impact of that small choice visible enough to feel worth it.

## What it does
- Snap a photo of something you no longer need. An AI vision model identifies the
  item, writes the listing title and category, and estimates the CO₂ kept out of
  the atmosphere by reusing it.
- It drops onto a live neighbourhood map. Neighbours browse by distance, claim
  what they want, and arrange pickup.
- A community impact bar counts the total CO₂ saved and items rehomed, with
  relatable equivalents ("≈ 130 km not driven"). New posts and claims appear on
  everyone's map in real time.

## How we built it — the "How"
- **Frontend:** React + Vite + TypeScript + Tailwind CSS, with Leaflet for the map
  (custom category pins, geolocation, and a toggleable impact **heatmap**).
- **Backend:** Supabase — Postgres with **PostGIS** for real nearest-item search
  (`ST_DWithin`/`ST_Distance` via an `items_near` RPC), anonymous Auth so anyone
  can post without friction, Storage for photos, row-level security, and a
  `SECURITY DEFINER` RPC that makes claiming race-safe.
- **Realtime:** Supabase subscriptions push new give-aways and claims to every
  open client instantly.
- **AI:** A Supabase Edge Function (Deno) calls an OpenAI vision model to classify
  the photo. Crucially, the CO₂ number is computed server-side from a fixed
  lifecycle-based table (adjusted by the detected condition), so impact figures
  stay consistent and defensible rather than model-invented.

## Challenges
- Making impact numbers trustworthy instead of hallucinated — solved by keeping
  the CO₂ model server-side and using the AI only for classification.
- Keeping the app fully demoable with zero setup — it runs on mock data + a local
  AI fallback until a backend is connected, then upgrades seamlessly.

## What's next
- Reputation and messaging between neighbours, "wanted" posts, and partnerships
  with local councils and refill/repair shops to route harder-to-reuse items.

## Built with
react, typescript, vite, tailwindcss, leaflet, postgis, supabase, deno, openai

---

## 3-minute demo script

**0:00–0:20 — Hook & problem.**
"This is ReLoop. Most of us throw out usable stuff because giving it away is a
hassle. ReLoop makes giving faster than binning — and shows the carbon you save."

**0:20–0:45 — The map.**
Show the map centered on your location, pins for nearby give-aways, the feed with
distance and 'nearest' sorting. Toggle the **impact heatmap** to show where reuse
is concentrated.

**0:45–1:40 — The core flow (the star).**
Click **+ Give away**, add a photo of an item. Narrate as the **AI analyzes it**:
it fills in the category, a title, and "saves ~X kg CO₂." Post it — it **drops onto
the map instantly**. (If you have a second device/tab open, show it appearing there
live via realtime.)

**1:40–2:15 — Claim & impact.**
Claim an item from the feed. Watch the **community impact counter tick up** —
total CO₂ saved and items rehomed, with the "≈ km not driven" equivalent.

**2:15–2:45 — Under the hood (for Technical Execution).**
"It's not just an AI wrapper: PostGIS powers real distance search, Supabase gives
us anonymous auth, storage, row-level security, and realtime, and a race-safe claim
RPC. The vision model is one clean piece of a full stack."

**2:45–3:00 — Close.**
"ReLoop: give it away, keep it local, keep it out of landfill. Thanks for watching."
