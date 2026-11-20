[![gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![rank](https://make.fun/badge/gta6-01/Ciciliades/suncoast-heat/rank.svg)](https://make.fun/bounty/gta6-01)
[![reward](https://make.fun/badge/gta6-01/Ciciliades/suncoast-heat/reward.svg)](https://make.fun/bounty/gta6-01)

# Suncoast Heat

A 3D third-person open-world crime RPG that runs in a desktop browser from
its own files. Mara Quinn comes home to Suncoast. The crew remembers her.
So do the police.

## Concept

Explore a tropical coastal city on foot and by car: beachfront boulevard,
downtown towers, marina and residential blocks, under a warm sunset sky.
Take on story missions for the Dockside Crew, stay ahead of the Bay Police,
and build Mara's reputation one job at a time. All art is procedural and
original; all names, story and music are original. Nothing is taken from
Rockstar or GTA.

## Controls

Keyboard and mouse. Click the game canvas to capture the mouse while
playing; press Esc to release it and pause.

- WASD — move on foot / drive (W accelerate, S brake and reverse)
- Mouse — look around; click to shoot when on foot
- Shift — run
- Space — brake while driving
- E — enter or exit a car, interact
- H — horn
- Esc or P — pause

## Features

- Open world: beach, coastal boulevard, marina, downtown and residential
  districts, with traffic and pedestrians
- Driving: enter, steal and drive cars, including a sports car; car
  stealing raises your wanted level
- Wanted system: 1 to 5 stars, police pursuit with ramming, roadblocks
  at higher heat, and an escape cooldown
- Combat: fists, pistol and SMG, with health and armour pickups
- Missions: 3 story missions with dialogue and results screens, plus one
  delivery side activity with a countdown
- RPG: stats (health, stamina, driving, shooting, charisma) with XP and
  level-ups that change rewards and handling
- HUD: health, money, wanted stars, mission objective, speedometer,
  weapon, and a circular minimap with waypoint and police blips
- Save: single-slot save with Continue from the title screen
- Sound: synthesised WebAudio effects only — engine, horn, siren,
  gunshot and UI clicks. No audio files, no network calls.

## How to run

No build step. Serve the `game/` folder with any static file server and
open `index.html` in a desktop browser with WebGL, for example:

```
cd game && python3 -m http.server 8080
```

Then open http://localhost:8080 in Chrome. Everything the game loads is
a file under `game/`; Three.js is vendored at `game/vendor/`.

## Project structure

```
suncoast-heat/
├── main.ts               # Node entrypoint: copies game/ + screenshots/, writes dossier.json
├── README.md
├── LICENSE
├── .makefun/owner.json   # payout wallet for the entry
├── vendor/makefun-game.ts
├── game/
│   ├── index.html        # import map (three), HUD DOM, menus
│   ├── css/game.css
│   ├── vendor/           # vendored Three.js (three.module.min.js, three.core.js)
│   └── src/
│       ├── config.js     # palette, tuning, names, key bindings
│       ├── core/         # loop, input, camera, collision, state
│       ├── render/       # scene, lights, sky, fog
│       ├── world/        # city, districts, landmarks, props
│       ├── entities/     # player, vehicles, traffic, pedestrians, police, gang, pickups
│       ├── systems/      # audio, combat, dust, missions, wanted
│       └── ui/           # HUD, menus, minimap
└── screenshots/          # 4 JPEG renders of the game itself
```

## Honest notes

- The sound effects are synthesised and have not been tested by ear.
- Escaping the police is possible in principle but unproven end to end.
- Ramming traffic adds wanted stars.
- Not built: bat, shotgun, radio, and side activities beyond the
  delivery job.
- The build prompts for this entry were drafted with the help of an AI
  assistant in a separate chat and pasted by the person as the first
  message of each build chat.
