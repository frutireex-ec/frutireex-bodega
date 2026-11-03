// Versión corta de la simulación del negocio para la batería (60 000 operaciones, unos segundos). La larga: node tests/negocio.sim.js [semilla] [1000000]
process.argv[2] = process.argv[2] || "11"; process.argv[3] = process.argv[3] || "60000";
require("./negocio.sim.js");
