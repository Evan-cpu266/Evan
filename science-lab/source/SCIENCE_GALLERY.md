# Orbit Science

An original simulation gallery inspired by the browsable format of educational
science sites. It is independent of PhET and uses no PhET software, artwork,
logos or embedded pages. The requested reference URL could not be retrieved in
the build environment, which blocks that domain.

The collection contains **37 distinct simulation models**: 23 chemistry models,
eight existing physics models and six new physics models. Subject buttons select
Chemistry or Physics. The **Go to lesson** button opens a subject and lesson
chooser; each lesson includes a short guide and its interactive experiment.
There are no practice quizzes or theory-only cards.

Search includes title, summary, topic, formula and subject. Topic filters combine
with OR, level filters combine with OR, and groups combine with AND. Saved-only
mode, alphabetical sorting, grid/list layouts, active filter chips and an empty
state work together. Favorite IDs alone persist in `orbit.science.saved.v1`.
Blocked storage retains session favorites with a visible warning. No account,
private records, APIs, trackers or network requests are used by the website.

Simulation links use `#sim/<id>`. A shared/reloaded simulation opens paused.
Play cards start playback; the lesson chooser opens the guide and pauses. Player
navigation destroys the previous widget and its animation loop. Every model has
editable parameters, measurements, playback controls and explicit assumptions.
Full screen depends on browser support; download creates a clean standalone HTML
from the pristine document before runtime rendering or local favorite loading.

## Science models

Chemistry covers atoms, bonding, states and solutions, reactions, kinetics,
thermodynamics, equilibrium, acids/bases and electrochemistry. Existing chemistry
models and their stated assumptions are unchanged; see CHEMISTRY_SIMULATORS.md.

Physics includes forces, friction, work, conservation of mechanical energy,
power, momentum, impulse and two-cart collisions. Additional models cover:

- Projectile motion on level ground with uniform gravity and no air resistance.
- Constant acceleration with position, velocity and acceleration graphs.
- Traveling sinusoidal waves with `v = fλ`.
- Undamped, small-angle pendulums with release angles up to 15°.
- An ideal DC series circuit with one resistor and an ideal source.
- Component and head-to-tail addition of two plane vectors.

Animation playback is presentation time unless a model explicitly identifies it
as physical time. Read the model note and labeled readouts. Collision trials are
temporary and have their own CSV export. This gallery introduces no new personal
data requirements and leaves previous Orbit websites unchanged.

## Build and validation

Run `python science_gallery/build.py` and `python science_gallery/package.py`.
The latter creates standalone aliases, a website ZIP and a source ZIP whose
rebuild is byte-identical. Source dependencies are selected, original local files
from `chemistry_lab` and `orbit_course`, not their old app controllers.

Run `node tests/science_catalog_test.cjs`,
`node tests/science_physics_test.cjs`, and
`python tests/science_browser_smoke.py`. Existing chemistry and physics numerical
tests remain applicable to the unchanged engines. Browser checks use Playwright
and Chromium. Real Safari/iPhone hardware is not available in this environment.

## GitHub

Public site: https://evan-cpu266.github.io/Evan/science-lab/

Publication uses an isolated checkout of `gh-pages`, preserving existing public
sites. Only the `science-lab` directory and its standalone alias are updated.
The directory includes the runnable website, clean source and build instructions.
