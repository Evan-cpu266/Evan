# Orbit Chemistry

A separate AP Chemistry simulator collection for Northwest Bilingual School,
Grade 12, 2026–2027. The gallery contains 23 interactive models across all nine
syllabus units. Every card opens a working simulator with a **Play simulator**
button. Theory-only lesson pages, practice questions, quizzes and assessments
are not included.

| Unit | Included experiments |
| --- | --- |
| 1 · Atomic structure | Moles; isotope spectra; electron configurations and ions; PES; periodic trends |
| 2 · Molecular and ionic structure | VSEPR geometry and polarity; Coulomb ion-pair attraction |
| 3 · Intermolecular forces and properties | Particle attractions; ideal gases; solutions and concentration; vapor pressure |
| 4 · Reactions | Stoichiometry and limiting reactants; strong acid–base titration |
| 5 · Kinetics | Integrated rate laws; activation energy and the Arrhenius equation |
| 6 · Thermodynamics | Calorimetry and heat transfer; entropy and Gibbs energy |
| 7 · Equilibrium | Reversible reactions; gas equilibrium and Le Châtelier’s principle |
| 8 · Acids and bases | Strong/weak acid/base ionization; buffers |
| 9 · Electrochemistry | Daniell cells and the Nernst equation; copper electrolysis |

Open `chemistry-simulators.html` directly in a browser, or host it as a static
website. It contains all JavaScript, styling and artwork. No account, server,
API key, external font or internet connection is needed after downloading.
The original Orbit physics websites remain separate.

## Using an experiment

Filter by unit or search for a topic. Choose **Play simulator** to launch an
experiment. Change its values, then use Play/Pause, Reset, playback speed or
the timeline. Parameter changes pause and reset playback. A bookmarked
simulator opens paused. The application does not store or transmit records.

The playback timeline describes the visual presentation. Models with a separate
physical time field show that simulated time in their measurements. Particle
counts are representative rather than literal numbers of molecules. Each
experiment states its assumptions beside the controls.

## Scientific scope

Shell diagrams illustrate electron counts and configurations rather than actual
electron paths. PES energies are approximate illustrative data. Molecular
geometry includes central lone pairs and polarity, rather than complete Lewis
structures or resonance calculations. Coulomb energy is for an isolated ion
pair, not a full crystal lattice.

Intermolecular-force particle behavior and reaction animations are conceptual.
Gas behavior assumes ideal gases. Vapor pressure uses Antoine and Raoult
relations within the stated ranges. Solubility curves use interpolated reference
data and the solution volume convention stated by the model. Strong acid–base
titration and acid/base ionization use water autoionization at 25 °C. Buffer
calculations use the Henderson–Hasselbalch approximation while both components
remain. Gas equilibrium treats an ideal N₂O₄/NO₂ mixture with constant reaction
enthalpy over the model range. The Daniell cell uses a standard 1.10 V potential
at 298.15 K. Electrolysis models copper deposition with adjustable efficiency.

## Build and verification

```sh
python chemistry_lab/build.py
node tests/chem_structure_test.cjs
node tests/chem_reactions_test.cjs
node tests/chem_equilibrium_test.cjs
python tests/chemistry_static_smoke.py
python tests/chemistry_browser_smoke.py
python chemistry_lab/package.py
```

Building and packaging use Python's standard library. Browser checks require
Playwright and Chromium. Numerical tests use Node without dependencies. The
source package contains only chemistry code, documentation and verification.

The model descriptors in `structure.js`, `reactions.js` and `equilibrium.js`
define validated inputs, calculations, optional time samples and SVG diagrams.
`experiments.js` provides common playback and controls. `catalog.js`, `app.js`
and `standalone.js` provide the simulator library and its navigation. All UI
rendering uses DOM methods compatible with strict Trusted Types previews.
