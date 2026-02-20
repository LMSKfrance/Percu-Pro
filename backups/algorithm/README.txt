PercuProV1 Algorithm Pack v3 (taste + artist lenses)

What changed vs v2
- Added ArtistLenses folder with decision heuristics inspired by interviews and features.
- Added AfroFunk and AfroDisco influence tags for 70s/80s groove logic.
- Added FUTURIST_FUNK mode for Detroit futurism + machine funk.

Install
1) copy ./algorithm into repo root
2) load texts with Vite import.meta.glob("../../algorithm/**/*.txt", { as:"raw", eager:true })
3) build generator/critique modules that follow NTU_master schema

Important
- This pack is a spec. Implement as deterministic rules first.
