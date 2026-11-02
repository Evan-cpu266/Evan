(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    const scope = {window: {}};
    require('node:vm').runInNewContext(require('node:fs').readFileSync(require('node:path').join(__dirname, '../chemistry_lab/catalog.js'), 'utf8'), scope);
    module.exports = factory(scope.window.ChemistryCatalog);
  } else {
    const api = factory(root.ChemistryCatalog || []);
    root.ScienceLibrary = api;
    root.ScienceCatalog = api.catalog;
    root.ScienceTopics = api.topics;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (chemistry) {
  'use strict';
  const subjects = Object.freeze([{id:'chemistry',label:'Chemistry'},{id:'physics',label:'Physics'}].map(Object.freeze));
  const topics = Object.freeze([
    ['atoms','Atoms & elements','chemistry'],['bonding','Bonds & molecules','chemistry'],['states','States & solutions','chemistry'],['reactions','Chemical reactions','chemistry'],['kinetics','Reaction rates','chemistry'],['thermodynamics','Heat & thermodynamics','chemistry'],['equilibrium','Equilibrium','chemistry'],['acids-bases','Acids & bases','chemistry'],['electrochemistry','Electrochemistry','chemistry'],
    ['motion','Motion & graphs','physics'],['forces','Forces & friction','physics'],['energy','Work & energy','physics'],['momentum','Momentum & collisions','physics'],['waves','Waves','physics'],['electricity','Electricity','physics'],['vectors','Vectors','physics']
  ].map(([id,label,subject])=>Object.freeze({id,label,subject})));
  const topicMap = new Map(topics.map(t=>[t.id,t]));
  const chemistryTopics = ['atoms','bonding','states','reactions','kinetics','thermodynamics','equilibrium','acids-bases','electrochemistry'];
  const advanced = new Set(['pes','lattice','vapor','kinetics','arrhenius','gibbs','equilibrium','gasEquilibrium','buffer','galvanic','electrolysis']);
  const chemistryGuides = {
    moles:['Keep mass fixed and choose a different molar mass.','Compare the amount in moles with the particle count.','Double the sample mass and look for proportional changes.'],
    isotopes:['Adjust the abundance of each isotope.','Watch the peaks and weighted mean move together.','An isotope mass is a mass number approximation in this model.'],
    electrons:['Choose an atomic number to build an element.','Change ionic charge and count the remaining electrons.','Shell diagrams illustrate electron counts, not literal electron paths.'],
    pes:['Choose an element and set the photon energy.','Compare photon energy with subshell binding energies.','The illustrated peak energies are approximate, not experimental measurements.'],
    trends:['Select two elements from the first eighteen.','Compare atomic size, ionization energy and electronegativity.','Look for patterns across periods and down groups.'],
    geometry:['Choose a molecular geometry.','Rotate the structure to see bond directions and central lone pairs.','Compare bond polarity with the overall molecular dipole.'],
    lattice:['Choose ionic charges and a separation.','Move the ions closer and compare the potential energy.','This is an isolated ion pair, not an entire crystal lattice.'],
    imf:['Choose a type of particle attraction.','Compare motion at the same temperature.','Displayed particles are a conceptual sample, not a literal molecular count.'],
    gas:['Choose volume, temperature and amount of gas.','Press play and watch the particles and piston.','The pressure calculation assumes an ideal gas.'],
    solution:['Add solute to a chosen amount of solution.','Compare dissolved material with any undissolved excess.','Change temperature to investigate the model solubility curve.'],
    vapor:['Set the temperature and solvent fraction.','Compare vapor pressure with that of the pure solvent.','The model uses Antoine and Raoult relations over its stated ranges.'],
    stoichiometry:['Set the initial amounts of hydrogen and oxygen.','Identify the limiting reactant and theoretical water yield.','Adjust yield to compare actual and theoretical production.'],
    titration:['Choose the initial acid and base concentrations.','Increase the base volume and observe the pH.','The equivalence point is modeled for a strong acid and strong base at 25 °C.'],
    kinetics:['Choose zero, first or second reaction order.','Set the initial concentration and rate constant.','Compare the concentration profile with its integrated rate law.'],
    arrhenius:['Choose a temperature and activation energy.','Compare rate constants at two temperatures.','The activation barrier diagram illustrates the Arrhenius relationship.'],
    calorimetry:['Choose a mass, specific heat and initial temperature.','Add or remove heat and compare the temperature change.','The sample has a constant specific heat and no modeled phase transition.'],
    gibbs:['Choose enthalpy, entropy and temperature.','Calculate the standard Gibbs energy change.','A negative ΔG° describes standard-state favorability, not reaction speed.'],
    equilibrium:['Choose forward and reverse rate constants.','Watch concentrations approach their equilibrium values.','At equilibrium the opposing rates are equal; reactions continue.'],
    gasEquilibrium:['Adjust temperature or compression for N₂O₄ ⇌ 2NO₂.','Compare the equilibrium composition and K values.','The model assumes ideal gases and constant reaction enthalpy over its range.'],
    acidbase:['Choose a strong or weak acid or base.','Change concentration and, for weak species, the equilibrium constant.','Compare ionization, pH and pOH at 25 °C.'],
    buffer:['Choose amounts of conjugate acid and base.','Add a measured amount of strong acid or base.','The Henderson–Hasselbalch approximation requires both buffer components to remain.'],
    galvanic:['Choose zinc-ion and copper-ion concentrations.','Follow electron flow between the electrodes.','Compare the calculated potential with the standard 1.10 V at 298.15 K.'],
    electrolysis:['Set current, time and current efficiency.','Observe copper plating at the cathode.','Compare deposited mass with the charge passed through the cell.']
  };
  const records = Array.from(chemistry).map(item=>({id:'chem-'+item.model,subject:'chemistry',title:item.title,summary:item.summary,formula:item.formula,topic:chemistryTopics[item.unit-1],level:advanced.has(item.model)?'ap':'high-school',engine:'chemistry',model:item.model,guide:chemistryGuides[item.model]}));
  const physics = [
    ['phys-forces','forces','Forces & Motion','Push a cart and discover how net force and mass change its acceleration.','Fₙₑₜ = ma','forces',['Start with a cart at rest on a frictionless track.','Change mass while keeping the net force fixed.','Compare the acceleration and position after the same time.']],
    ['phys-friction','friction','Friction Lab','Find the push needed to overcome friction and set a block in motion.','|f| ≤ μmg','forces',['Set the mass and friction coefficient.','Increase the applied force until the block moves.','This simplified model uses one coefficient for static and sliding friction.']],
    ['phys-work','work','Work & Force','Pull a block through a distance and explore the effect of force direction.','W = Fd cos θ','energy',['Keep force and distance fixed while changing the angle.','Compare pulls at 0°, 90° and 180°.','The traversal illustrates distance; it does not model the net force.']],
    ['phys-energy','energy','Energy Conservation','Follow a falling object as gravitational potential energy becomes kinetic energy.','E = mgh + ½mv²','energy',['Choose mass, release height and gravity.','Pause halfway through the fall and compare the energy bars.','Air resistance is ignored, so total mechanical energy stays constant.']],
    ['phys-power','power','Power & Energy Transfer','Transfer energy over a chosen time and compare average power.','P = W / Δt','energy',['Choose the work transferred and the transfer time.','Keep work fixed and halve the time.','The animation represents energy transfer at a constant rate.']],
    ['phys-momentum','momentum','Momentum Lab','Set a cart’s mass and signed velocity to explore momentum.','p = mv','momentum',['Choose the mass and velocity.','Reverse the velocity and compare momentum direction.','Double mass or speed and compare the momentum magnitude.']],
    ['phys-impulse','impulse','Impulse & Change','Apply a force over time and follow a cart’s changing momentum.','J = FΔt = Δp','momentum',['Choose an initial velocity, force and contact time.','Try a force opposite to the initial velocity.','Compare impulse with the change in the cart’s momentum.']],
    ['phys-collision','collision','Collision Lab','Collide two carts and explore elastic and inelastic outcomes.','Σp before = Σp after','momentum',['Set masses and velocities so cart 1 catches cart 2.','Choose restitution 1 for elastic or 0 for sticking carts.','Record trials and compare momentum and kinetic energy before and after contact.']]
  ];
  physics.forEach(([id,model,title,summary,formula,topic,guide])=>records.push({id,model,title,summary,formula,topic,guide,subject:'physics',level:'high-school',engine:'physics'}));
  const extras = [
    ['physics-projectile','Projectile Motion','Launch a projectile and explore its flight, maximum height and range.','R = v₀² sin(2θ) / g','motion',['Choose launch speed, angle and gravitational acceleration.','Compare complementary launch angles at the same speed.','The ideal projectile lands at its launch height and experiences no air resistance.']],
    ['physics-acceleration','Motion & Acceleration Graphs','Watch a moving cart while position, velocity and acceleration graphs develop.','x = x₀ + v₀t + ½at²','motion',['Choose an initial position, velocity and constant acceleration.','Switch between position, velocity and acceleration graphs.','Compare the graph slope with the motion you observe.']],
    ['physics-waves','Wave Lab','Explore a traveling wave and connect frequency, wavelength and wave speed.','v = fλ','waves',['Change frequency, wavelength and amplitude.','Compare one wavelength with one full oscillation.','The wave travels through the diagram while the medium oscillates in place.']],
    ['physics-pendulum','Pendulum Lab','Drag and release a pendulum through angles up to 90°, and explore how amplitude changes its period.','T = 4√(L/g) K(sin(|θ₀|/2))','motion',['Choose a length, gravity and an initial angle from −90° to +90°.','Drag the bob, watch the live angle, then release it to start swinging from rest.','Angles are measured from downward vertical. The nonlinear model assumes an ideal point mass, a massless rod and no damping.']],
    ['physics-circuit','Ohm’s Law Circuit','Connect a source and resistor and investigate current, voltage and power.','V = IR · P = VI','electricity',['Choose the source voltage and resistance.','Keep voltage fixed and double the resistance.','This is an ideal direct-current circuit; the moving charges are illustrative.']],
    ['physics-vectors','Vector Addition','Add two vectors and explore the resultant’s components, magnitude and direction.','R⃗ = A⃗ + B⃗','vectors',['Set the horizontal and vertical components of each vector.','Compare the head-to-tail diagram with the resultant arrow.','The direction is measured from the positive horizontal axis.']]
  ];
  extras.forEach(([id,title,summary,formula,topic,guide])=>records.push({id,model:id,title,summary,formula,topic,guide,subject:'physics',level:'high-school',engine:'chemistry'}));
  const featured = ['phys-forces','chem-electrons','chem-geometry','physics-projectile','chem-acidbase','physics-circuit','physics-waves','chem-gas','chem-solution'];
  const ordered = featured.map(id=>records.find(record=>record.id===id)).concat(records.filter(record=>!featured.includes(record.id)));
  const catalog = Object.freeze(ordered.map((record,index)=>Object.freeze({...record,index,topicLabel:topicMap.get(record.topic).label,guide:Object.freeze(record.guide.slice())})));
  const byId = id => catalog.find(item=>item.id===id) || null;
  const normalize = text => String(text || '').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('en');
  function filter(source, options) {
    const o=options||{},needle=normalize(o.search).trim();
    const subject=['chemistry','physics'].includes(o.subject)?o.subject:'all';
    const selectedTopics=new Set(Array.isArray(o.topics)?o.topics:[]), levels=new Set(Array.isArray(o.levels)?o.levels:[]),saved=new Set(o.savedIds instanceof Set?Array.from(o.savedIds):Array.isArray(o.savedIds)?o.savedIds:[]);
    function matches(item) {
      if(!needle||needle===item.subject)return true;
      const haystack=normalize([item.title,item.summary,item.formula,item.topicLabel].join(' '));
      return /^[a-z]{1,2}$/.test(needle)?haystack.split(/[^a-z0-9]+/).includes(needle):haystack.includes(needle);
    }
    const result=Array.from(source||catalog).filter(item=>(subject==='all'||item.subject===subject)&&(!selectedTopics.size||selectedTopics.has(item.topic))&&(!levels.size||levels.has(item.level))&&(!o.savedOnly||saved.has(item.id))&&matches(item));
    if(o.sort==='az'||o.sort==='za') result.sort((a,b)=>(o.sort==='za'?-1:1)*a.title.localeCompare(b.title,'en',{sensitivity:'base',numeric:true}));
    return result;
  }
  return Object.freeze({catalog,subjects,topics,filter,byId});
});
