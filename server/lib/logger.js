// Simple logger for debate processing

class DebateLogger {
  constructor() {
    this.debateId = null;
    this.startTime = null;
  }

  startDebate(debateId, config) {
    this.debateId = debateId;
    this.startTime = new Date();
    console.log(`[DEBATE START] ID: ${debateId}, Topic: ${config.topic}`);
    console.log(`[CONFIG] Rounds: ${config.rounds}, Models: ${config.models.length}`);
  }

  logRound(roundNumber, responses) {
    const elapsed = this.getElapsedTime();
    console.log(`[ROUND ${roundNumber}] Completed in ${elapsed}, Responses: ${responses}`);
  }

  logError(error) {
    console.error(`[ERROR] Debate ${this.debateId}:`, error.message);
    console.error(error.stack);
  }

  endDebate() {
    const elapsed = this.getElapsedTime();
    console.log(`[DEBATE END] ID: ${this.debateId}, Total time: ${elapsed}`);
  }

  getElapsedTime() {
    if (!this.startTime) return '0s';
    const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
  }
}

module.exports = { DebateLogger };











