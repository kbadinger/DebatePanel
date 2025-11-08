// Pricing calculations for debates

function calculateDebateCost(config) {
  // Simplified pricing calculation
  const basePrice = 0.10; // Base cost per debate
  const perRound = 0.05; // Cost per round
  const perModel = 0.03; // Cost per model
  
  const totalCost = basePrice + 
    (config.rounds * perRound) + 
    (config.models.length * perModel);
  
  return Math.round(totalCost * 100) / 100; // Round to cents
}

module.exports = { calculateDebateCost };











