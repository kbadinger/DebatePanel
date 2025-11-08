// Usage tracking for billing

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function trackUsage(userId, debateId, config) {
  try {
    // Calculate costs
    const estimatedCost = calculateDebateCost(config);
    
    // Update user balance (totalUsage doesn't exist in schema - tracking via UsageRecord instead)
    await prisma.subscription.update({
      where: { userId },
      data: {
        currentBalance: {
          decrement: estimatedCost
        }
      }
    });
    
    // Log usage
    await prisma.usage.create({
      data: {
        userId,
        debateId,
        type: 'debate',
        amount: estimatedCost,
        description: `Debate: ${config.topic}`,
        metadata: {
          rounds: config.rounds,
          models: config.models.length
        }
      }
    });
    
    console.log(`[USAGE] User ${userId} charged $${estimatedCost} for debate ${debateId}`);
    
  } catch (error) {
    console.error('[USAGE ERROR]', error);
    // Don't throw - we don't want billing errors to stop debates
  }
}

function calculateDebateCost(config) {
  const basePrice = 0.10;
  const perRound = 0.05;
  const perModel = 0.03;
  
  return basePrice + (config.rounds * perRound) + (config.models.length * perModel);
}

module.exports = { trackUsage };











