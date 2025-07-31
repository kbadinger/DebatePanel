import fs from 'fs';
import path from 'path';

export class DebateLogger {
  private logDir: string;
  private currentDebateId: string;
  private logStream: fs.WriteStream | null = null;

  constructor() {
    this.logDir = path.join(process.cwd(), 'logs', 'debates');
    this.currentDebateId = '';
    
    // Ensure log directory exists
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  startDebate(debateId: string, topic: string, models: string[]) {
    this.currentDebateId = debateId;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `debate_${debateId}_${timestamp}.log`;
    const filepath = path.join(this.logDir, filename);
    
    this.logStream = fs.createWriteStream(filepath, { flags: 'a' });
    
    this.log('='.repeat(80));
    this.log(`DEBATE STARTED: ${new Date().toISOString()}`);
    this.log(`Debate ID: ${debateId}`);
    this.log(`Topic: ${topic}`);
    this.log(`Models: ${models.join(', ')}`);
    this.log('='.repeat(80));
  }

  logRound(roundNumber: number, prompt: string) {
    this.log(`\n${'='.repeat(80)}`);
    this.log(`ROUND ${roundNumber} - ${new Date().toISOString()}`);
    this.log('='.repeat(80));
    this.log('PROMPT:');
    this.log(prompt);
    this.log('-'.repeat(80));
  }

  logModelResponse(modelId: string, response: string, position: string, confidence: number, metadata?: any) {
    this.log(`\nMODEL: ${modelId}`);
    this.log(`Time: ${new Date().toISOString()}`);
    if (metadata) {
      this.log(`Metadata: ${JSON.stringify(metadata)}`);
    }
    this.log('RESPONSE:');
    this.log(response);
    this.log(`\nPOSITION: ${position}`);
    this.log(`CONFIDENCE: ${confidence}%`);
    this.log('-'.repeat(80));
  }

  logRoundAnalysis(consensus?: string, disagreements?: string[]) {
    this.log('\nROUND ANALYSIS:');
    this.log(`Consensus: ${consensus || 'No consensus reached'}`);
    if (disagreements && disagreements.length > 0) {
      this.log('Key Disagreements:');
      disagreements.forEach(d => this.log(`  - ${d}`));
    }
    this.log('-'.repeat(80));
  }

  logFinalSynthesis(synthesis: string, status: string) {
    this.log(`\n${'='.repeat(80)}`);
    this.log('DEBATE COMPLETED');
    this.log(`Status: ${status}`);
    this.log(`Time: ${new Date().toISOString()}`);
    this.log('='.repeat(80));
    this.log('FINAL SYNTHESIS:');
    this.log(synthesis);
    this.log('='.repeat(80));
  }

  logError(error: any) {
    this.log(`\nERROR: ${new Date().toISOString()}`);
    this.log(error.toString());
    if (error.stack) {
      this.log('Stack trace:');
      this.log(error.stack);
    }
  }

  endDebate() {
    if (this.logStream) {
      this.log(`\nDebate ended at: ${new Date().toISOString()}`);
      this.logStream.end();
      this.logStream = null;
    }
  }

  private log(message: string) {
    if (this.logStream) {
      this.logStream.write(message + '\n');
    }
    // Also log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DebateLog] ${message}`);
    }
  }

  // Get log file path for a debate
  static getLogPath(debateId: string): string | null {
    const logDir = path.join(process.cwd(), 'logs', 'debates');
    if (!fs.existsSync(logDir)) return null;
    
    const files = fs.readdirSync(logDir);
    const logFile = files.find(f => f.includes(`debate_${debateId}`));
    
    return logFile ? path.join(logDir, logFile) : null;
  }
}