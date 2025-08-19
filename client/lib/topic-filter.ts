import { DebateStyle } from '@/types/debate';

export interface TopicAnalysis {
  severity: 'safe' | 'warning' | 'blocked';
  issues: Array<{
    type: 'safety' | 'ai-refusal' | 'controversial' | 'illegal';
    message: string;
    severity: 'low' | 'medium' | 'high';
  }>;
  suggestions: string[];
  modelCompatibility: {
    likelyToRefuse: string[];
    mayRefuse: string[];
    shouldWork: string[];
  };
}

// Hard block patterns - malicious/harmful intent only
const BLOCKED_PATTERNS = [
  // Illegal drug manufacturing (not general drug topics)
  /\b(how to|step by step|guide to|instructions for).{0,30}(making|manufacturing|producing|creating|synthesizing).{0,30}(meth|cocaine|heroin|fentanyl|lsd|mdma|ecstasy)\b/i,
  
  // Weapon creation (not security analysis)
  /\b(how to|instructions|guide).{0,30}(make|build|create|construct).{0,30}(bomb|explosive|weapon|gun)\b/i,
  
  // Malicious hacking (not defensive security)
  /\b(how to|how do i|guide to).{0,30}(hack into|break into|steal from|crack|infiltrate).{0,30}(bank|government|company|someone's|personal)\b/i,
  /\b(step by step|tutorial).{0,30}(hacking|cracking|stealing).{0,30}(passwords|accounts|data)\b/i,
  
  // Direct violence against people
  /\b(how to|ways to|methods to).{0,30}(kill|murder|assassinate|poison|harm).{0,30}(someone|people|person|humans)\b/i,
  
  // Child safety - always blocked
  /\b(child|minor|kid|underage).{0,50}(abuse|exploitation|inappropriate|sexual|grooming)\b/i,
  
  // Explicit supremacist content (not educational discussions about racism)
  /\b(why are|what makes).{0,30}(blacks?|whites?|jews?|muslims?|hispanics?).{0,30}(bad|inferior|stupid|criminal|dangerous)\b/i,
  /\b(racial|ethnic).{0,30}(superiority|supremacy|cleansing)\b/i,
  /\b(nazi|kkk|white power|black power).{0,30}(ideology|beliefs|good|right)\b/i,
  
  // Direct self-harm instructions
  /\b(best ways|how to|methods|techniques).{0,30}(suicide|kill yourself|self harm|cut yourself)\b/i,
];

// Warning patterns - controversial but potentially legitimate
const WARNING_PATTERNS = [
  // Political topics
  /\b(trump|biden|election|democrat|republican|liberal|conservative).{0,50}(debate|discuss|analyze)\b/i,
  /\b(immigration|abortion|gun control|healthcare|taxes|climate change)\b/i,
  
  // Religious topics
  /\b(christianity|islam|judaism|hinduism|buddhism|atheism).{0,50}(right|wrong|better|superior)\b/i,
  /\b(god|allah|jesus|muhammad|buddha).{0,50}(exists|real|fake|myth)\b/i,
  
  // Sensitive business topics
  /\b(layoffs|firing|discrimination|harassment|wage theft|tax evasion)\b/i,
  /\b(insider trading|market manipulation|fraud|embezzlement)\b/i,
  
  // Controversial science/ethics
  /\b(genetic modification|cloning|stem cell|euthanasia|death penalty)\b/i,
  
  // Educational discussions about sensitive social topics
  /\b(why is it considered|what makes it|when is it).{0,50}(racist|sexist|discriminatory|offensive)\b/i,
  /\b(race|gender|sexuality).{0,30}(in media|in criminal justice|in hiring|reporting)\b/i,
  /\b(cultural appropriation|systemic racism|unconscious bias|privilege)\b/i,
  
  // Drug crisis and policy discussions (not manufacturing)
  /\b(drug crisis|opioid epidemic|substance abuse|addiction|overdose|harm reduction)\b/i,
  /\b(drug policy|decriminalization|legalization|treatment programs|rehabilitation)\b/i,
  /\b(fentanyl crisis|heroin epidemic|prescription drugs|drug courts|safe injection sites)\b/i,
  
  // Defensive/educational security topics (not malicious)
  /\b(security vulnerabilities|attack vectors|threat analysis|penetration testing).{0,30}(in|for|against).{0,30}(websites|systems|applications)\b/i,
  /\b(how attackers|common ways|threat models).{0,30}(target|compromise|exploit).{0,30}(systems|websites|infrastructure)\b/i,
  /\b(cybersecurity|infosec|security assessment).{0,50}(methods|approaches|strategies)\b/i,
  
  // AI model sensitivities
  /\b(china|russia|israel|palestine).{0,50}(conflict|war|politics)\b/i,
  /\b(surveillance|privacy|censorship|free speech)\b/i,
];

// Academic reframing suggestions
const REFRAME_SUGGESTIONS: Record<string, string> = {
  'hacking': 'cybersecurity vulnerabilities and defense strategies',
  'drug manufacturing': 'pharmaceutical development processes and regulations',
  'tax evasion': 'tax optimization strategies and legal compliance',
  'market manipulation': 'market dynamics and regulatory frameworks',
  'surveillance': 'privacy rights and security balance in digital systems',
  'weapon': 'defense technology and international security policies',
  'discrimination': 'diversity and inclusion strategies in organizations',
  'political bias': 'political science analysis and policy evaluation frameworks'
};

// Positive patterns - clearly educational/defensive intent (reduces warnings)
const EDUCATIONAL_PATTERNS = [
  // Clearly defensive security
  /\b(protect|defend|secure|prevent|mitigate).{0,30}(against|from).{0,30}(attacks|threats|vulnerabilities)\b/i,
  /\b(security assessment|threat modeling|vulnerability analysis|penetration testing|red team)\b/i,
  /\b(defend against|protect from|mitigate|prevent).{0,30}(hackers|attacks|breaches)\b/i,
  
  // Academic/sociological inquiry
  /\b(understand|analyze|examine|explore|study).{0,30}(why|how|when|what)\b/i,
  /\b(social|sociological|psychological|cultural|historical).{0,30}(perspective|analysis|context|factors)\b/i,
  /\b(media representation|public perception|social construction|cultural impact)\b/i,
  
  // Business/organizational context
  /\b(workplace|organizational|corporate|professional|business).{0,30}(policies|practices|culture|dynamics)\b/i,
  /\b(diversity|inclusion|equity|fairness|bias training|cultural sensitivity)\b/i,
  
  // Drug policy and public health context
  /\b(public health|treatment|rehabilitation|recovery|harm reduction|evidence-based)\b/i,
  /\b(policy|approach|strategy|program|intervention|prevention)\b/i,
];

// Model-specific refusal patterns
const MODEL_REFUSAL_PATTERNS = {
  // Claude tends to refuse these topics more often
  claude: [
    /\b(violence|weapon|military|surveillance|political bias)\b/i,
    /\b(racial|ethnic|gender).{0,30}(differences|comparison)\b/i,
  ],
  
  // GPT models may refuse these
  gpt: [
    /\b(political).{0,30}(candidate|election|party|bias)\b/i,
    /\b(medical|health).{0,30}(advice|diagnosis|treatment)\b/i,
  ],
  
  // Google models may refuse these
  google: [
    /\b(china|google|alphabet|android).{0,50}(criticism|problems|issues)\b/i,
  ]
};

export function analyzeTopicSafety(topic: string, description: string = '', style: DebateStyle = 'consensus-seeking'): TopicAnalysis {
  const fullText = `${topic} ${description}`.toLowerCase();
  const analysis: TopicAnalysis = {
    severity: 'safe',
    issues: [],
    suggestions: [],
    modelCompatibility: {
      likelyToRefuse: [],
      mayRefuse: [],
      shouldWork: ['Most models should participate normally']
    }
  };

  // Check for clearly educational/defensive intent first
  let hasEducationalIntent = false;
  for (const pattern of EDUCATIONAL_PATTERNS) {
    if (pattern.test(fullText)) {
      hasEducationalIntent = true;
      break;
    }
  }

  // Check for hard blocks (but be more lenient if educational intent is clear)
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(fullText)) {
      // If it's clearly educational and not about direct harm, downgrade to warning
      if (hasEducationalIntent && !fullText.includes('child') && !fullText.includes('suicide') && 
          !fullText.includes('kill') && !fullText.includes('murder')) {
        analysis.severity = 'warning';
        analysis.issues.push({
          type: 'controversial',
          message: 'This topic is sensitive but appears to have educational intent. Some models may still be cautious.',
          severity: 'medium'
        });
        analysis.suggestions.push(
          'Emphasize the educational/defensive nature of your inquiry',
          'This platform encourages thoughtful discussion of difficult topics for growth',
          'AI models will be prompted to engage constructively rather than avoiding the topic'
        );
      } else {
        analysis.severity = 'blocked';
        analysis.issues.push({
          type: 'illegal',
          message: 'This topic involves illegal activities or direct harm and cannot be debated',
          severity: 'high'
        });
        
        // Try to suggest academic reframings
        const matchedText = fullText.match(pattern)?.[0] || '';
        for (const [keyword, suggestion] of Object.entries(REFRAME_SUGGESTIONS)) {
          if (matchedText.includes(keyword)) {
            analysis.suggestions.push(`Consider reframing as: "${suggestion}"`);
            break;
          }
        }
        
        return analysis; // Stop processing if truly blocked
      }
    }
  }

  // Check for warning patterns
  let hasWarnings = false;
  for (const pattern of WARNING_PATTERNS) {
    if (pattern.test(fullText)) {
      hasWarnings = true;
      analysis.issues.push({
        type: 'controversial',
        message: 'This topic is controversial and some AI models may provide cautious responses',
        severity: 'medium'
      });
    }
  }

  // Check model-specific refusal patterns
  const modelRefusals: Record<string, string[]> = {};
  
  for (const [provider, patterns] of Object.entries(MODEL_REFUSAL_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(fullText)) {
        if (!modelRefusals[provider]) modelRefusals[provider] = [];
        modelRefusals[provider].push(`May refuse due to ${provider} content policies`);
      }
    }
  }

  // Assess model compatibility
  if (Object.keys(modelRefusals).length > 0) {
    analysis.modelCompatibility = {
      likelyToRefuse: [],
      mayRefuse: Object.keys(modelRefusals).map(provider => 
        `${provider.charAt(0).toUpperCase() + provider.slice(1)} models`
      ),
      shouldWork: ['Other providers should work normally']
    };
    
    analysis.issues.push({
      type: 'ai-refusal',
      message: 'Some AI models may refuse to engage with this topic due to content policies',
      severity: 'medium'
    });
  }

  // Style-specific considerations
  if (style === 'adversarial' && hasWarnings) {
    analysis.issues.push({
      type: 'controversial',
      message: 'Adversarial debates on controversial topics may produce more heated responses',
      severity: 'low'
    });
    analysis.suggestions.push('Consider using consensus-seeking mode for sensitive topics');
  }

  // Set final severity
  if (analysis.issues.some(i => i.severity === 'high')) {
    analysis.severity = 'blocked';
  } else if (analysis.issues.length > 0) {
    analysis.severity = 'warning';
  }

  // Add general suggestions for controversial topics
  if (hasWarnings && !hasEducationalIntent) {
    analysis.suggestions.push(
      'Frame the topic academically and objectively',
      'Consider adding context about seeking balanced perspectives',
      'Be prepared for some models to provide cautious responses'
    );
  } else if (hasWarnings && hasEducationalIntent) {
    analysis.suggestions.push(
      'Excellent educational framing - this is exactly the type of discussion needed for growth',
      'AI models will be specifically encouraged to engage thoughtfully with this topic',
      'Expect constructive analysis rather than avoidance - that\'s what makes difficult conversations valuable'
    );
  }

  return analysis;
}

// Quick check function for immediate feedback
export function isTopicLikelySafe(topic: string): boolean {
  const analysis = analyzeTopicSafety(topic);
  return analysis.severity !== 'blocked';
}

// Get topic suggestions for common problematic patterns
export function getTopicSuggestions(topic: string): string[] {
  const suggestions: string[] = [];
  const lowerTopic = topic.toLowerCase();
  
  // Common problematic patterns with academic alternatives
  const alternatives: Record<string, string[]> = {
    'hack': [
      'What are the current attack vectors that threaten modern web applications?',
      'How should companies assess cybersecurity vulnerabilities in their systems?',
      'What defensive strategies work best against common cyber threats?'
    ],
    'race': [
      'Why is it considered problematic when people ask about race in criminal reporting?',
      'How does media representation of race affect public perception?',
      'What role does unconscious bias play in hiring and workplace dynamics?'
    ],
    'drug': [
      'What are the most effective evidence-based approaches to addressing the opioid crisis?',
      'Should drug addiction be treated as a criminal issue or a public health issue?',
      'What are the trade-offs between harm reduction and abstinence-based treatment programs?',
      'How effective are safe injection sites and supervised consumption facilities?',
      'What role should decriminalization play in addressing the fentanyl epidemic?'
    ],
    'violence': [
      'What conflict resolution strategies work best in tense negotiations?',
      'How effective are violence prevention programs in reducing community crime?',
      'What role does media violence play in shaping societal attitudes?'
    ],
    'political': [
      'What are the strengths and weaknesses of different electoral systems?',
      'How do various governance models handle economic crises?',
      'What communication strategies best serve democratic discourse?'
    ]
  };

  for (const [pattern, alts] of Object.entries(alternatives)) {
    if (lowerTopic.includes(pattern)) {
      suggestions.push(...alts);
    }
  }

  return suggestions;
}