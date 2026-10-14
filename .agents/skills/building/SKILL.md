---
name: building
description: Build or edit Kael AI office teams through a one-question-at-a-time discussion, then preview and apply the agreed team to the running local office. Use for /building, /builder, or $building in this Kael project.
---

# Kael building

## Jalur utama sejak v2.40

Untuk /builder, /building atau jadi builder, baca docs/OFFICE-ROLES.md dan gunakan sesi peran melalui scripts/office.mjs. Gunakan konteks hook Claude bila tersedia; jika tidak, open Builder dengan client yang sedang dipakai, simpan sessionId pada chat ini, dan context sebelum bekerja. Diskusi tetap pada client. Kirim usulan tim/SOP lewat action propose ke preview web; pemilik menerapkan di web. Jangan memakai bridge apply lama untuk melewati preview/persetujuan konfigurasi pada jalur ini. Rujukan preview/apply di bawah adalah kontrak CLI lama untuk pemakaian manual yang diminta eksplisit, bukan default sesi peran.


Work in the Kael project containing `scripts/building.mjs` and `docs/PRD.md`. If invoked outside it, use `C:/Kael AI` if that project exists; otherwise ask for its location. Read `docs/BUILDING.md` for the bridge contract and `docs/PRD.md` for relevant room/workflow requirements.

Start with “Mau build baru atau edit bagian yang sudah ada?” unless the user has already specified the goal. Ask **one question per turn**, in Indonesian, and wait for the answer. Use existing answers; do not run a rigid questionnaire or ask again about choices already made.

Discuss the purpose, desired output, workflow, manager, specialist roles and names. Suggest a small appropriate team with clear handoffs, review criteria and the Founder's role. Explain recommendations in plain language. For a YouTube team, consider research, script and packaging before adding unnecessary roles. Let the user adjust the proposal.

Use `node scripts/building.mjs inspect` to see current teams and revision. For a new team, prepare a JSON file with `{ "revision": <current>, "command": { "type": "division", "name": "…", "manager": "…", "workers": [{ "name": "…", "role": "…" }] } }`. The domain supports one manager and 1–12 workers. For edits, use `division-edit` with the existing division `id`, division `name`, manager's name, and `workers` containing existing worker `id`, `name`, `role`. This edit preserves existing member identities and all work. To add specialists to an existing manual division, include optional `addWorkers: [{name, role}]`; total workers must remain at most 12 and all member names must differ. New workers get new IDs; no existing worker is removed or reassigned. Inspect/preview/apply with revision conflict protection before adding; do not blindly replay a proposal.

Run `node scripts/building.mjs preview <file>` and present the concrete team/workflow. Apply the agreed configuration with `node scripts/building.mjs apply <file>` when the user's instructions authorize it. Respect existing approval and autonomy instructions; do not ask again when the concrete change is already authorized. If revision conflicts, inspect again and review the difference; do not overwrite or retry blindly. Report saved only after the API confirms it. Verify the saved team with inspect.

Never write `app-data/state.json` directly. If the local app is unavailable, preserve the proposal and start it using the project's documented dev command if authorized. The bridge accepts only team creation and identity/role edits; it cannot start work, approve results, publish content or grant access to a vault.

Room and character presets are assigned automatically to new teams. For requests to edit furniture, character details or office features, inspect the relevant source and PRD, implement the scoped change, run the appropriate checks and document actual limits. Do not invent an unsupported furniture editor or claim a runtime is connected merely because this skill is installed.

The conversation runs in the current Claude Code, Codex or Hermes session using its existing login/model. This skill does not install a runtime, bypass permissions or start autonomous employees. Nate and the monitor graph remain visual until a real Obsidian integration is implemented; never claim vault sync or semantic AI conversations from ambient animation.
