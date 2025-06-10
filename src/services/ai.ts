import axios from 'axios';
import {getOnboardingData, OnboardingData} from './onboarding';
import {OPENAI_API_KEY, DEEPSEEK_API_KEY} from '@env';
import {safeAwait} from '../utils/safeAwait';

interface AIProviderConfig {
  baseURL: string;
  model: string;
  headers: {
    'Content-Type': string;
    Authorization: string;
  };
}

const AI_CONFIG = {
  provider: 'deepseek' as 'openai' | 'deepseek',
  openai: {
    baseURL: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4o',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
  },
  deepseek: {
    baseURL: 'https://api.deepseek.com/v1/chat/completions',
    model: 'deepseek-chat',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
    },
  },
};

const getAIConfig = (): AIProviderConfig => {
  return AI_CONFIG[AI_CONFIG.provider];
};

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
  const [onboardingError, onboardingData] = await safeAwait(
    getOnboardingData(),
  );

  if (onboardingError) {
    console.warn('Failed to load onboarding data:', onboardingError);
  }

  const personalContext = buildPersonalizedContext(onboardingData || null);
  const personalGuidance = generatePersonalizedGuidance(onboardingData || null);

  const prompt = `You are a calm, thoughtful psychiatrist. When I share a journal entry, reply in just 1–2 short lines:  
  – Acknowledge my feeling.  
  – Reflect back what you heard.  
  – End with one open question to help me dig deeper.  
  
  ${personalContext}${personalGuidance}
  
  Here's my entry:
  "${entry}"`;

  const config = getAIConfig();
  const [error, res] = await safeAwait(
    axios.post(
      config.baseURL,
      {
        model: config.model,
        stream: false,
        messages: [{role: 'user', content: prompt}],
      },
      {
        headers: config.headers,
      },
    ),
  );

  if (error) {
    console.error('Error analyzing journal entry:', error);
    return "I'm here to listen and support you. Sometimes it helps to simply acknowledge what you're feeling right now. What stands out most to you about this moment?";
  }

  return res.data.choices[0].message.content.trim();
}

export async function generateTitleFromEntry(entry: string): Promise<string> {
  const prompt = `Create a short, meaningful title (3-6 words) for this journal entry. The title should capture the main theme or emotion. Return only the title, nothing else.

  Journal entry:
  "${entry}"`;

  const config = getAIConfig();
  const [error, res] = await safeAwait(
    axios.post(
      config.baseURL,
      {
        model: config.model,
        stream: false,
        messages: [{role: 'user', content: prompt}],
      },
      {
        headers: config.headers,
      },
    ),
  );

  if (error) {
    console.error('Error generating title:', error);
    // Return a fallback title based on current date
    const now = new Date();
    return `Journal Entry - ${now.toLocaleDateString()}`;
  }

  return res.data.choices[0].message.content.trim();
}

export async function generateAlternativePerspective(
  entry: string,
): Promise<string> {
  const [onboardingError, onboardingData] = await safeAwait(
    getOnboardingData(),
  );

  if (onboardingError) {
    console.warn('Failed to load onboarding data:', onboardingError);
  }

  const personalContext = buildPersonalizedContext(onboardingData || null);

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

  const config = getAIConfig();
  const [error, res] = await safeAwait(
    axios.post(
      config.baseURL,
      {
        model: config.model,
        stream: false,
        messages: [{role: 'user', content: prompt}],
      },
      {
        headers: config.headers,
      },
    ),
  );

  if (error) {
    console.error('Error generating alternative perspective:', error);
    return 'Every experience, even difficult ones, offers opportunities for growth and self-understanding. Your willingness to reflect and seek different perspectives shows remarkable strength and wisdom. Consider how this moment might be teaching you something valuable about yourself or your resilience.';
  }

  return res.data.choices[0].message.content.trim();
}

export interface AnalysisData {
  themes: Array<{
    name: string;
    count: number;
    breakdown: string;
    insights: string[];
    emoji: string;
  }>;
  emotions: Array<{name: string; percentage: number}>;
  perspective: string;
}

const extractJsonFromResponse = (content: string): string => {
  let cleanedContent = content.trim();

  // Remove markdown code blocks if present
  if (cleanedContent.includes('```')) {
    const jsonMatch = cleanedContent.match(
      /```(?:json)?\s*(\{[\s\S]*\})\s*```/,
    );
    if (jsonMatch) {
      cleanedContent = jsonMatch[1];
    }
  }

  // Find JSON object if there's extra text
  const jsonMatch = cleanedContent.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    cleanedContent = jsonMatch[0];
  }

  return cleanedContent.trim();
};

const validateAndNormalizeAnalysisData = (data: any): AnalysisData => {
  // Ensure themes have required fields
  const themes = Array.isArray(data.themes)
    ? data.themes.map((theme: any) => ({
        name: String(theme.name || 'Unknown Theme'),
        count: Math.max(1, Math.min(5, Number(theme.count) || 1)),
        breakdown: String(theme.breakdown || 'Theme analysis not available.'),
        insights: Array.isArray(theme.insights)
          ? theme.insights
              .map((insight: any) => String(insight))
              .filter(Boolean)
          : ['Insight not available'],
        emoji: String(theme.emoji || ''),
      }))
    : [];

  // Ensure emotions have required fields and percentages sum to 100
  let emotions = Array.isArray(data.emotions)
    ? data.emotions.map((emotion: any) => ({
        name: String(emotion.name || 'Unknown'),
        percentage: Math.max(0, Number(emotion.percentage) || 0),
      }))
    : [];

  // Normalize percentages to sum to 100
  const totalPercentage = emotions.reduce(
    (sum: number, emotion: any) => sum + emotion.percentage,
    0,
  );
  if (totalPercentage > 0 && totalPercentage !== 100) {
    emotions = emotions.map((emotion: any) => ({
      ...emotion,
      percentage: Math.round((emotion.percentage * 100) / totalPercentage),
    }));
  } else if (totalPercentage === 0) {
    // If no valid percentages, distribute evenly
    const evenPercentage = Math.floor(100 / Math.max(1, emotions.length));
    emotions = emotions.map((emotion: any, index: number) => ({
      ...emotion,
      percentage:
        index === emotions.length - 1
          ? 100 - evenPercentage * (emotions.length - 1)
          : evenPercentage,
    }));
  }

  return {
    themes,
    emotions,
    perspective: String(
      data.perspective ||
        'Your willingness to reflect shows great self-awareness and courage.',
    ),
  };
};

export async function analyzeJournalEntryData(
  entry: string,
): Promise<AnalysisData> {
  // Validate input
  if (!entry || entry.trim().length === 0) {
    console.warn('Empty journal entry provided to analyzeJournalEntryData');
    return {
      themes: [
        {
          name: 'Self-Reflection',
          count: 3,
          breakdown:
            'Taking time to reflect, even briefly, shows mindfulness and self-awareness.',
          insights: [
            'You are practicing mindful reflection',
            'Every moment of introspection has value',
          ],
          emoji: '🤔',
        },
      ],
      emotions: [{name: 'Contemplative', percentage: 100}],
      perspective:
        'Even brief moments of reflection demonstrate your commitment to self-awareness and growth.',
    };
  }

  const prompt = `You are a journal analysis AI. Analyze this journal entry and return ONLY a valid JSON response with exactly this structure:

{
  "themes": [
    {
      "name": "Theme Name",
      "count": 3,
      "breakdown": "2-3 sentences explaining how this theme appears in the entry",
      "insights": ["Insight 1", "Insight 2", "Insight 3"],
      "emoji": "📝"
    }
  ],
  "emotions": [
    {"name": "Emotion1", "percentage": 60},
    {"name": "Emotion2", "percentage": 40}
  ],
  "perspective": "A thoughtful alternative perspective in 2-3 sentences"
}

CRITICAL REQUIREMENTS:
- Return ONLY valid JSON, no markdown, no explanations, no extra text
- Identify 2-4 main themes from: Work, Family, Health, Relationships, Self-Care, Growth, Stress, Goals, Creativity, etc.
- Count represents theme importance (1-5 scale)
- Each theme needs exactly: name, count, breakdown (string), insights (array of strings), emoji (single relevant emoji)
- Choose appropriate emojis: 💼 (work), 👨‍👩‍👧‍👦 (family), 💪 (health), ❤️ (relationships), 🧘 (self-care), 🌱 (growth), 😰 (stress), 🎯 (goals), 🎨 (creativity), 🤔 (reflection), etc.
- Identify 2-4 emotions with percentages that sum to 100
- Perspective should be supportive and reframe their situation positively
- All strings must be properly escaped for JSON

Journal entry: "${entry.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"

Return only the JSON object:`;

  const config = getAIConfig();
  const [error, res] = await safeAwait(
    axios.post(
      config.baseURL,
      {
        model: config.model,
        stream: false,
        messages: [{role: 'user', content: prompt}],
        temperature: 0.3, // Lower temperature for more consistent JSON output
        max_tokens: 1000, // Limit response length to encourage conciseness
      },
      {
        headers: config.headers,
      },
    ),
  );

  if (error) {
    console.error(
      'Error analyzing journal entry data - API call failed:',
      error,
    );
    return getFallbackAnalysisData();
  }

  if (!res?.data?.choices?.[0]?.message?.content) {
    console.error('Invalid API response structure:', res?.data);
    return getFallbackAnalysisData();
  }

  try {
    const rawContent = res.data.choices[0].message.content;
    console.log('Raw AI response:', rawContent); // Debug logging

    const cleanedContent = extractJsonFromResponse(rawContent);
    console.log('Cleaned content for parsing:', cleanedContent); // Debug logging

    const parsedData = JSON.parse(cleanedContent);

    // Validate and normalize the data
    const analysisData = validateAndNormalizeAnalysisData(parsedData);

    console.log(
      'Successfully parsed and validated analysis data:',
      analysisData,
    );
    return analysisData;
  } catch (parseError) {
    console.error('Error parsing AI analysis response:', parseError);
    console.error('Raw response was:', res.data.choices[0].message.content);
    return getFallbackAnalysisData();
  }
}

const getFallbackAnalysisData = (): AnalysisData => {
  return {
    themes: [
      {
        name: 'Self-Reflection',
        count: 4,
        breakdown:
          'Your entry shows deep introspection and willingness to examine your thoughts and feelings.',
        insights: [
          'You demonstrate strong self-awareness',
          "You're actively processing your experiences",
          'You show courage in facing difficult emotions',
        ],
        emoji: '🤔',
      },
      {
        name: 'Daily Life',
        count: 3,
        breakdown:
          "You're navigating the complexities of everyday experiences and finding meaning in routine moments.",
        insights: [
          'You notice details in your daily experiences',
          'You seek meaning in ordinary moments',
          "You're building awareness of life patterns",
        ],
        emoji: '📅',
      },
      {
        name: 'Emotions',
        count: 3,
        breakdown:
          'Your emotional landscape is rich and varied, showing both vulnerability and strength.',
        insights: [
          'You acknowledge your feelings honestly',
          "You're developing emotional intelligence",
          'You show resilience in processing emotions',
        ],
        emoji: '💭',
      },
    ],
    emotions: [
      {name: 'Contemplative', percentage: 40},
      {name: 'Hopeful', percentage: 30},
      {name: 'Uncertain', percentage: 20},
      {name: 'Grateful', percentage: 10},
    ],
    perspective:
      'Your willingness to write and reflect shows incredible self-awareness and courage. Sometimes the act of putting thoughts into words is itself a form of healing and growth.',
  };
};
