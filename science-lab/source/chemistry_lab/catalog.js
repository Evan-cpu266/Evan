(function (root) {
  'use strict';
  const units = [
    'Atomic Structure & Properties',
    'Molecular & Ionic Structure',
    'Intermolecular Forces & Properties',
    'Chemical Reactions',
    'Kinetics',
    'Thermodynamics',
    'Equilibrium',
    'Acids & Bases',
    'Electrochemistry'
  ];
  const topics = [
    ['moles',1,'Moles & Molar Mass','Turn a measured mass into moles and particles. Explore how molar mass changes the amount of substance.','n = m / M'],
    ['isotopes',1,'Isotopes & Mass Spectrometry','Change isotope abundances and see the mass spectrum and weighted atomic mass respond.','M̄ = Σ(fᵢMᵢ)'],
    ['electrons',1,'Electron Configuration & Ions','Build atoms and ions, explore electron shells, and follow changes in their electron configurations.','electrons = Z − charge'],
    ['pes',1,'Photoelectron Spectroscopy','Send photons into an atom and explore how electron subshells produce a photoelectron spectrum.','KE = hν − binding energy'],
    ['trends',1,'Periodic Trends','Compare the first 18 elements through atomic size, ionization energy and electronegativity.','Structure shapes properties'],
    ['geometry',2,'Molecular Geometry & Polarity','Rotate molecular models and compare VSEPR shapes, bond angles, lone pairs and polarity.','Electron groups → shape'],
    ['lattice',2,'Ionic Attraction & Coulomb’s Law','Move opposite ions closer together and explore how charge and separation affect their attraction.','U = kq₁q₂ / r'],
    ['imf',3,'Intermolecular Forces','Explore particle attractions and compare dispersion forces, dipole interactions and hydrogen bonding.','Attraction meets thermal motion'],
    ['gas',3,'Ideal Gases & Particle Motion','Adjust a gas and watch its particles and piston. Connect pressure, volume, temperature and amount.','PV = nRT'],
    ['solution',3,'Solutions, Solubility & Concentration','Dissolve a salt, explore saturation and see how the dissolved amount sets the solution concentration.','M = n / V'],
    ['vapor',3,'Vapor Pressure','Change temperature and solvent composition to explore vapor pressure above an ideal solution.','P = Xsolvent P°'],
    ['stoichiometry',4,'Stoichiometry & Limiting Reactants','Combine hydrogen and oxygen, identify the limiting reactant and explore theoretical and percent yield.','2H₂ + O₂ → 2H₂O'],
    ['titration',4,'Strong Acid–Base Titration','Add base from a burette and follow the pH as the acid is neutralized and the equivalence point is reached.','H⁺ + OH⁻ → H₂O'],
    ['kinetics',5,'Reaction Rates & Integrated Rate Laws','Watch reactants disappear over time and compare zero, first and second order concentration profiles.','Rate = k[A]ⁿ'],
    ['arrhenius',5,'Activation Energy & Temperature','Change temperature and activation energy to explore the Arrhenius relationship and an energy barrier.','k = A e^(−Eₐ/RT)'],
    ['calorimetry',6,'Heat Transfer & Calorimetry','Transfer heat into or out of a sample and follow its temperature and energy change.','q = mcΔT'],
    ['gibbs',6,'Entropy & Gibbs Free Energy','Explore how enthalpy, entropy and temperature combine to determine the standard Gibbs energy change.','ΔG° = ΔH° − TΔS°'],
    ['equilibrium',7,'Reversible Reactions & Equilibrium','Watch a reversible system approach equilibrium as the forward and reverse rates become equal.','Kc = [B] / [A]'],
    ['gasEquilibrium',7,'Gas Equilibrium & Le Châtelier','Change temperature and compression in the N₂O₄ ⇌ 2NO₂ system and compare Kc and Kp.','Kp = Kc(RT)^Δn'],
    ['acidbase',8,'Strong & Weak Acids and Bases','Compare ionization, pH and pOH for strong and weak monoprotic acids and bases.','pH = −log₁₀[H⁺]'],
    ['buffer',8,'Buffers & Added Acid or Base','Adjust a conjugate acid–base pair and observe how it responds to added strong acid or base.','pH ≈ pKₐ + log₁₀([A⁻]/[HA])'],
    ['galvanic',9,'Galvanic Cells & the Nernst Equation','Connect a zinc–copper cell, follow electron flow and explore how ion concentrations affect cell potential.','E = E° − (RT/nF) ln Q'],
    ['electrolysis',9,'Electrolysis & Faraday’s Law','Pass charge through a copper-ion solution and watch metal plate onto the cathode.','m = ItMη / (nF)']
  ];
  root.ChemistryUnits = Object.freeze(units);
  root.ChemistryCatalog = Object.freeze(topics.map(([model,unit,title,summary,formula]) => Object.freeze({
    id:model,model,unit,title,summary,formula,category:units[unit-1],note:''
  })));
})(window);
