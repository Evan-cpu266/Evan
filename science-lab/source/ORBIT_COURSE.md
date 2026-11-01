# Orbit simulator collection

This separate, offline website contains 13 simulator topics covering forces, friction,
work, energy, power, momentum, impulse and collisions. The cards use eight interactive
physics models. Every card has a **Play simulator** button which opens and starts its
experiment. It contains no practice questions, quizzes, assessments or theory-only
lesson pages. Motion, constant acceleration and their graph lessons belong to the
separate original Orbit website.

Open `orbit-lessons.html` directly in a browser. It requires no account, installation,
server, network connection or Python runtime. Its historical filename is retained for
existing links. `Orbit-Simulators.html` is the same standalone application.

## Controls

Search the topic cards or filter by Forces, Work & energy, or Momentum. Open a card,
change the experiment values, then use Play, Pause, Reset, playback speed and the
timeline. Return to the library to choose another experiment. Bookmarking a simulator
opens it paused. The website does not read, overwrite or store browser records.

The work model uses illustrative traversal timing rather than predicting acceleration
from an unspecified net force. The friction model uses a single coefficient for static
and sliding friction. Energy conversion excludes air resistance. Collisions are one
dimensional with no external impulse and restitution between zero and one.

## Build and verify

```sh
python orbit_course/build.py
node tests/orbit_course_experiments_test.cjs
python tests/orbit_separation_smoke.py
python tests/orbit_simulator_smoke.py
```

The browser tests require Playwright and Chromium. The build uses only Python's
standard library and includes these files, in order:

- `orbit_course/index.html` and `course.css`: responsive layout.
- `simulators.js`: curated simulator-only topic list.
- `experiments.js`: physics, animated SVG experiments and their controls.
- `app.js` and `standalone.js`: library navigation and startup.

The exported HTML contains all styling, artwork and JavaScript. It uses no external
assets, remote fonts, embedded websites or executable inline event handlers.
