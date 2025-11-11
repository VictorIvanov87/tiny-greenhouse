# RAG Seed Pack Format

All retrieval sources live under `data/rag/`. Each crop/variety pair owns a
folder with a YAML descriptor and optional Markdown companions:

```
data/rag/
  crops/
    <crop-id>/
      <variety>.yaml
      <variety>.md        # optional long-form notes
```

## YAML contract

Each YAML file must follow the structure below (new keys may be added if they
are documented here first):

```yaml
crop:
  id: basil                 # canonical crop identifier used in the DB
  variety: genovese         # variety or cultivar slug
  lang: en                  # ISO language code (currently only `en`)
  displayName: Genovese Basil
  defaultStage: vegetative  # optional fallback stage for filters
overview: |
  Short human summary; Markdown supported.
stages:
  - id: seedling            # referenced as `growth_stage`
    label: Seedling ramp    # friendly name (docs only)
    cues:
      - Cotyledons opened...
    guidance: |
      Stage-specific guidance paragraph(s).
# Additional stage entries...
defaults:                   # baseline recommendations grouped by domain
  environment:
    temperature_day: "24°C"
    humidity: "55-65%"
  irrigation:
    frequency: "Once daily"  # text, not structured recipes
warnings:                   # quick risks, optionally scoped to a stage
  - stage: vegetative
    text: Avoid >32°C for more than 48h.
faq:                        # optional quick answers
  - q: Can I root cuttings?
    a: Yes—details...
```

Anything under `overview`, `stages[*].guidance`, defaults/warnings/FAQ entries,
and companion Markdown files is chunked for embeddings. Files must stay under
~8 KB each to keep seeding quick.

## Adding content

1. Create `data/rag/crops/<crop>/<variety>.yaml` following the schema.
2. (Optional) Drop `*.md` files in the same folder for deeper dives.
3. Run `npm run rag:seed` from `backend/` to chunk the sources, create embeddings,
   and upsert them into `rag_chunks`.

The seeder derives `crop_id`, `lang`, and `stage` automatically from each chunk
so the runtime APIs can filter by the active greenhouse profile.
