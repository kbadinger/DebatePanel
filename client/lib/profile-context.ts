import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface ProfileContextResult {
  condensedContext: string;
  profilesUsed: string[];
  originalMentions: string[];
}

/**
 * Parse @mentions from text
 * Returns array of profile names (lowercase, without the @)
 */
export function parseProfileMentions(text: string): string[] {
  const mentionRegex = /@([a-zA-Z0-9-]+)/g;
  const mentions: string[] = [];
  let match;

  while ((match = mentionRegex.exec(text)) !== null) {
    const name = match[1].toLowerCase();
    if (!mentions.includes(name)) {
      mentions.push(name);
    }
  }

  return mentions;
}

/**
 * Fetch profiles by name for a user
 */
export async function fetchUserProfiles(
  userId: string,
  profileNames: string[]
): Promise<Array<{ id: string; name: string; content: unknown }>> {
  if (profileNames.length === 0) return [];

  const profiles = await prisma.profile.findMany({
    where: {
      userId,
      name: { in: profileNames }
    },
    select: {
      id: true,
      name: true,
      content: true
    }
  });

  return profiles;
}

/**
 * Use GPT-4o-mini to extract relevant context from profiles given the debate topic
 */
export async function extractRelevantContext(
  topic: string,
  description: string,
  profiles: Array<{ id: string; name: string; content: unknown }>
): Promise<string> {
  if (profiles.length === 0) return '';

  // Combine all profile content
  const profilesText = profiles
    .map(p => `Profile @${p.name}:\n${JSON.stringify(p.content, null, 2)}`)
    .join('\n\n---\n\n');

  const prompt = `You are helping prepare context for an AI debate.

DEBATE TOPIC: ${topic}
${description ? `ADDITIONAL CONTEXT: ${description}` : ''}

USER PROFILES:
${profilesText}

TASK: Extract ONLY the information from these profiles that is directly relevant to this specific debate topic. Be concise but include all relevant details. Focus on:
- Background that affects decision-making for this topic
- Goals and preferences related to this topic
- Constraints or requirements that matter for this decision
- Any specific context that would help AI debaters give better advice

If nothing is relevant, just say "No relevant context found."

Output your condensed context in 2-4 paragraphs, written in third person (e.g., "The user is..." or "Kevin is..."). Start directly with the context, no preamble.`;

  try {
    const result = await generateText({
      model: openai('gpt-4o-mini'),
      prompt,
      maxTokens: 500,
      temperature: 0.3, // Low temperature for consistent extraction
    });

    return result.text.trim();
  } catch (error) {
    console.error('Error extracting profile context:', error);
    // Fallback: return a truncated version of the raw profiles
    const fallback = profiles
      .map(p => `@${p.name}: ${JSON.stringify(p.content).slice(0, 200)}...`)
      .join('\n');
    return `[Profile context - raw fallback]\n${fallback}`;
  }
}

/**
 * Main entry point: process @mentions and return condensed context
 */
export async function processProfileMentions(
  userId: string,
  topic: string,
  description: string = ''
): Promise<ProfileContextResult> {
  const allText = `${topic} ${description}`;
  const mentions = parseProfileMentions(allText);

  if (mentions.length === 0) {
    return {
      condensedContext: '',
      profilesUsed: [],
      originalMentions: []
    };
  }

  // Limit to 3 profiles max
  const limitedMentions = mentions.slice(0, 3);
  if (mentions.length > 3) {
    console.log(`Profile limit: Using first 3 of ${mentions.length} mentioned profiles`);
  }

  // Fetch profiles
  const profiles = await fetchUserProfiles(userId, limitedMentions);

  if (profiles.length === 0) {
    console.log(`No profiles found for mentions: ${limitedMentions.join(', ')}`);
    return {
      condensedContext: '',
      profilesUsed: [],
      originalMentions: mentions
    };
  }

  // Extract relevant context using LLM
  const condensedContext = await extractRelevantContext(topic, description, profiles);

  return {
    condensedContext,
    profilesUsed: profiles.map(p => p.id),
    originalMentions: mentions
  };
}
