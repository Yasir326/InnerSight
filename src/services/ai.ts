import axios from 'axios';
import {getOnboardingData, OnboardingData} from './onboarding';
import {OPENAI_API_KEY} from '@env';

const buildPersonalizedContext = (
  onboardingData: OnboardingData | null,
): string => {
  if (!onboardingData) {
    return '';
  }

  let context = '\n\nPersonal Context:\n';

  // Add goals
  if (onboardingData.goals.length > 0) {
    const goalDescriptions = {
      stress: 'reducing stress and anxiety through reflection',
      growth: 'personal growth and self-understanding',
      gratitude: 'practicing gratitude and focusing on positives',
      clarity: 'achieving mental clarity and organizing thoughts',
      habits: 'building better habits and tracking progress',
      creativity: 'boosting creativity and unlocking potential',
    };

    const userGoals = onboardingData.goals
      .map(
        goal => goalDescriptions[goal as keyof typeof goalDescriptions] || goal,
      )
      .join(', ');

    context += `- The user's journaling goals include: ${userGoals}\n`;
  }

  // Add challenges
  if (onboardingData.challenges.length > 0) {
    const challengeDescriptions = {
      overwhelmed: 'feeling overwhelmed with too many thoughts',
      stuck: 'feeling stuck in same patterns and problems',
      anxious: 'dealing with anxiety and racing thoughts',
      direction: 'lacking direction and clarity about goals',
      relationships: 'struggling with relationship connections',
      confidence: 'dealing with low self-confidence and self-doubt',
    };

    const userChallenges = onboardingData.challenges
      .map(
        challenge =>
          challengeDescriptions[
            challenge as keyof typeof challengeDescriptions
          ] || challenge,
      )
      .join(', ');

    context += `- The user is currently facing challenges with: ${userChallenges}\n`;
  }

  // Add reflection insights
  if (onboardingData.reflections) {
    const {current_state, ideal_self, biggest_obstacle} =
      onboardingData.reflections;

    if (current_state?.trim()) {
      context += `- Current state of mind: "${current_state.trim()}"\n`;
    }

    if (ideal_self?.trim()) {
      context += `- Who they want to become: "${ideal_self.trim()}"\n`;
    }

    if (biggest_obstacle?.trim()) {
      context += `- Biggest obstacle they're facing: "${biggest_obstacle.trim()}"\n`;
    }
  }

  return context;
};

const generatePersonalizedGuidance = (
  onboardingData: OnboardingData | null,
): string => {
  if (!onboardingData) {
    return '';
  }

  let guidance = '\n\nPersonalized Guidance:\n';

  // Goal-specific guidance
  if (onboardingData.goals.includes('stress')) {
    guidance +=
      '- Focus on identifying stress triggers and coping mechanisms\n';
  }

  if (onboardingData.goals.includes('growth')) {
    guidance +=
      '- Explore patterns of behavior and opportunities for self-improvement\n';
  }

  if (onboardingData.goals.includes('gratitude')) {
    guidance +=
      '- Help them notice and appreciate positive aspects of their experience\n';
  }

  if (onboardingData.goals.includes('clarity')) {
    guidance +=
      '- Guide them to organize their thoughts and gain mental clarity\n';
  }

  // Challenge-specific guidance
  if (onboardingData.challenges.includes('overwhelmed')) {
    guidance +=
      '- Help break down overwhelming feelings into manageable pieces\n';
  }

  if (onboardingData.challenges.includes('anxious')) {
    guidance +=
      '- Address anxiety with grounding techniques and perspective shifts\n';
  }

  if (onboardingData.challenges.includes('stuck')) {
    guidance += '- Explore new perspectives and potential paths forward\n';
  }

  if (onboardingData.challenges.includes('confidence')) {
    guidance += '- Reinforce their strengths and encourage self-compassion\n';
  }

  return guidance;
};

export async function analyseJournalEntry(entry: string): Promise<string> {
  // Load onboarding data to personalize the response
  const onboardingData = await getOnboardingData();

  const personalContext = buildPersonalizedContext(onboardingData);
  const personalGuidance = generatePersonalizedGuidance(onboardingData);

  const prompt = `You are a calm, thoughtful psychiatrist. When I share a journal entry, reply in just 1–2 short lines:  
  – Acknowledge my feeling.  
  – Reflect back what you heard.  
  – End with one open question to help me dig deeper.  
  
  ${personalContext}${personalGuidance}
  
  Here's my entry:
  "${entry}"`;

  const res = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model: 'gpt-4o',
      stream: false,
      messages: [{role: 'user', content: prompt}],
    },
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
    },
  );

  return res.data.choices[0].message.content.trim();
}

export async function generateTitleFromEntry(entry: string): Promise<string> {
  const prompt = `Create a short, meaningful title (3-6 words) for this journal entry. The title should capture the main theme or emotion. Return only the title, nothing else.

  Journal entry:
  "${entry}"`;

  const res = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model: 'gpt-4o',
      stream: false,
      messages: [{role: 'user', content: prompt}],
    },
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
    },
  );

  return res.data.choices[0].message.content.trim();
}

export async function generateAlternativePerspective(
  entry: string,
): Promise<string> {
  // Load onboarding data to personalize the perspective
  const onboardingData = await getOnboardingData();

  const personalContext = buildPersonalizedContext(onboardingData);

  const prompt = `You are a wise, compassionate therapist. Read this journal entry and provide an alternative perspective that helps the person see their situation differently. Your response should:

- Reframe challenges as opportunities for growth
- Highlight strengths and resilience they might not recognize
- Offer a more balanced or positive lens on their experience
- Encourage self-compassion and understanding
- Provide gentle wisdom that promotes reflection
- Be 3-4 sentences that feel supportive and insightful

${personalContext}

Focus on helping them see:
- What this experience might be teaching them
- Hidden strengths they're demonstrating
- How this moment fits into their larger journey
- A more compassionate view of themselves

Journal entry:
"${entry}"

Provide only the alternative perspective, no other text.`;

  const res = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model: 'gpt-4o',
      stream: false,
      messages: [{role: 'user', content: prompt}],
    },
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
    },
  );

  return res.data.choices[0].message.content.trim();
}

export interface AnalysisData {
  themes: Array<{
    name: string; 
    count: number;
    breakdown: string;
    insights: string[];
  }>;
  emotions: Array<{name: string; percentage: number}>;
  perspective: string;
}

export async function analyzeJournalEntryData(
  entry: string,
): Promise<AnalysisData> {
  const prompt = `Analyze this journal entry and return a JSON response with the following structure:

{
  "themes": [
    {
      "name": "Theme1", 
      "count": 3,
      "breakdown": "A detailed explanation of how this theme appears in the entry",
      "insights": ["Key insight 1", "Key insight 2", "Key insight 3"]
    }
  ],
  "emotions": [
    {"name": "Emotion1", "percentage": 60},
    {"name": "Emotion2", "percentage": 30}
  ],
  "perspective": "A thoughtful alternative perspective that helps the user reflect"
}

Guidelines:
- Identify 2-4 main themes (topics like Work, Family, Health, Relationships, Self-Care, Growth, etc.)
- Count should represent the relative importance/frequency of each theme (1-5 scale)
- For each theme, provide:
  * breakdown: 2-3 sentences explaining how this theme manifests in their entry
  * insights: 2-4 specific observations, patterns, or reflections about this theme
- Identify 2-4 main emotions with percentages that add up to 100
- For perspective: Provide a compassionate, insightful alternative viewpoint that:
  * Reframes their situation in a more positive or balanced light
  * Highlights strengths or growth opportunities they might not see
  * Offers a different lens through which to view their experience
  * Encourages self-compassion and reflection
  * Is 2-3 sentences that feel supportive and wise
- Return ONLY valid JSON, no other text

Journal entry:
"${entry}"`;

  const res = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model: 'gpt-4o',
      stream: false,
      messages: [{role: 'user', content: prompt}],
    },
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
    },
  );

  try {
    const analysisData = JSON.parse(res.data.choices[0].message.content.trim());
    return analysisData;
  } catch (error) {
    console.error('Error parsing AI analysis response:', error);

    const fallbackThemes = [
      {
        name: 'Self-Reflection', 
        count: 4,
        breakdown: 'Your entry shows deep introspection and willingness to examine your thoughts and feelings.',
        insights: [
          'You demonstrate strong self-awareness',
          'You\'re actively processing your experiences',
          'You show courage in facing difficult emotions'
        ]
      },
      {
        name: 'Daily Life', 
        count: 3,
        breakdown: 'You\'re navigating the complexities of everyday experiences and finding meaning in routine moments.',
        insights: [
          'You notice details in your daily experiences',
          'You seek meaning in ordinary moments',
          'You\'re building awareness of life patterns'
        ]
      },
      {
        name: 'Emotions', 
        count: 3,
        breakdown: 'Your emotional landscape is rich and varied, showing both vulnerability and strength.',
        insights: [
          'You acknowledge your feelings honestly',
          'You\'re developing emotional intelligence',
          'You show resilience in processing emotions'
        ]
      },
    ];

    const fallbackEmotions = [
      {name: 'Contemplative', percentage: 40},
      {name: 'Hopeful', percentage: 30},
      {name: 'Uncertain', percentage: 20},
      {name: 'Grateful', percentage: 10},
    ];

    return {
      themes: fallbackThemes,
      emotions: fallbackEmotions,
      perspective:
        'Your willingness to write and reflect shows incredible self-awareness and courage. Sometimes the act of putting thoughts into words is itself a form of healing and growth.',
    };
  }
}
