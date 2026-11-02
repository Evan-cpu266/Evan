# Orbit Science

[Open the chemistry and physics website](https://evan-cpu266.github.io/Evan/science-lab/)

37 original interactive simulations: **23 chemistry and 14 physics**.

Choose **Chemistry** or **Physics**, or use **Go to lesson** to choose a subject
and topic directly. Search, topic and level filters, favorite simulations,
lesson guides and phone layouts are included. No quizzes or sign-in.

**Pendulum Lab:** set a release angle up to 90° on either side, drag the bob
with a mouse or touch, watch its live angle and let go to start swinging.
Large-angle motion uses the nonlinear pendulum equation. Arrow keys adjust
the focused bob; Enter or Space releases it.

## Build from source

```sh
cd source
python science_gallery/build.py
```

Open the generated `source/orbit-science.html`, or copy it to this directory's
`index.html` when publishing an update. Everything runs locally after download.
All model code, original SVG artwork and verification scripts are in `source`.

Model assumptions are stated within each simulator and in
[source/SCIENCE_GALLERY.md](source/SCIENCE_GALLERY.md). This is an independent
Orbit project, not affiliated with PhET or the University of Colorado Boulder.
