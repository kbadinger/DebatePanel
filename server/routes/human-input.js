const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

router.post('/', async (req, res) => {
  const { debateId, content, userId, userName } = req.body;

  try {
    // Verify the debate exists and belongs to the user
    const debate = await prisma.debate.findUnique({
      where: { id: debateId },
      include: {
        debateRounds: {
          orderBy: { roundNumber: 'desc' },
          take: 1
        }
      }
    });

    if (!debate) {
      return res.status(404).json({ error: 'Debate not found' });
    }

    if (debate.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (debate.status !== 'waiting-for-human') {
      return res.status(400).json({ error: 'Debate is not waiting for human input' });
    }

    // Get the current round number
    const currentRound = debate.debateRounds[0]?.roundNumber || 0;
    const nextRound = currentRound + 1;

    // Create the human response
    const humanResponse = await prisma.modelResponse.create({
      data: {
        debateRound: {
          create: {
            debateId: debate.id,
            roundNumber: nextRound
          }
        },
        modelId: `human-${userId}`,
        content,
        position: 'human-input',
        confidence: 100,
        round: nextRound,
        isHuman: true,
        userName: userName || 'Human Participant'
      }
    });

    // Update debate status back to running
    await prisma.debate.update({
      where: { id: debateId },
      data: { status: 'running' }
    });

    res.json({
      success: true,
      response: humanResponse
    });

  } catch (error) {
    console.error('Human input error:', error);
    res.status(500).json({ 
      error: 'Failed to process human input',
      details: error.message 
    });
  }
});

module.exports = router;











