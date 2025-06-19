import axios from 'axios';
import {storageService, type OnboardingData} from './storage';
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
    model: 'deepseek-reasoner',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
    },
  },
};

const getAIConfig = (): AIProviderConfig => {
  return AI_CONFIG[AI_CONFIG.provider];
};

// Helper function to switch AI provider
export const switchAIProvider = (provider: 'openai' | 'deepseek'): void => {
  AI_CONFIG.provider = provider;
};

// Helper function to get current provider info
export const getCurrentAIProvider = (): {
  provider: string;
  model: string;
  available: boolean;
} => {
  const config = getAIConfig();
  const hasApiKey =
    config.headers.Authorization !== 'Bearer undefined' &&
    config.headers.Authorization !== 'Bearer null';

  return {
    provider: AI_CONFIG.provider,
    model: config.model,
    available: hasApiKey,
  };
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

// Helper function to safely extract content from AI response
const extractContentFromResponse = (response: any): string | null => {
  try {
    // Check if response exists at all
    if (!response) {
      console.error('❌ No response object provided');
      return null;
    }

    // Get current provider info for response handling
    const currentProvider = AI_CONFIG.provider;

    // Check if response has data property
    if (!response.data) {
      console.error('❌ No data property in response');
      return null;
    }

    const data = response.data;

    // Standard format for both OpenAI and DeepSeek: choices[0].message.content
    if (
      data.choices &&
      Array.isArray(data.choices) &&
      data.choices.length > 0
    ) {
      const choice = data.choices[0];

      if (choice.message) {
        // Handle based on provider
        if (currentProvider === 'openai') {
          // OpenAI: Standard content field
          if (
            choice.message.content &&
            typeof choice.message.content === 'string'
          ) {
            return choice.message.content.trim();
          }
        } else if (currentProvider === 'deepseek') {
          // DeepSeek reasoner: content is the final answer, reasoning_content is the thinking process
          // Priority: content (final answer) > reasoning_content (if content is empty)
          
          if (
            choice.message.content &&
            typeof choice.message.content === 'string' &&
            choice.message.content.trim() !== ''
          ) {
            return choice.message.content.trim();
          }

          // DeepSeek reasoner fallback: if content is empty, try reasoning_content
          // This happens when the model puts the JSON in reasoning_content instead of content
          if (
            choice.message.reasoning_content &&
            typeof choice.message.reasoning_content === 'string'
          ) {
            // Check if reasoning_content looks like it contains JSON
            const reasoningContent = choice.message.reasoning_content.trim();
            if (
              reasoningContent.includes('{') &&
              reasoningContent.includes('}')
            ) {
              return reasoningContent;
            } else {
              return reasoningContent;
            }
          }
        }

        // Fallback: try standard content field regardless of provider
        if (
          choice.message.content &&
          typeof choice.message.content === 'string'
        ) {
          return choice.message.content.trim();
        }
      }

      // Alternative formats (some APIs use these)
      if (typeof choice.text === 'string') {
        return choice.text.trim();
      }

      if (typeof choice.content === 'string') {
        return choice.content.trim();
      }
    }

    // Alternative response formats (for other APIs)
    if (typeof data.content === 'string') {
      return data.content.trim();
    }

    if (data.message && typeof data.message.content === 'string') {
      return data.message.content.trim();
    }

    if (typeof data.text === 'string') {
      return data.text.trim();
    }

    if (data.response && typeof data.response === 'string') {
      return data.response.trim();
    }

    if (data.output && typeof data.output === 'string') {
      return data.output.trim();
    }

    // Nested structures
    if (
      data.result &&
      data.result.content &&
      typeof data.result.content === 'string'
    ) {
      return data.result.content.trim();
    }

    console.error(
      '❌ Could not find content in any expected response structure',
    );
    return null;
  } catch (error) {
    console.error(
      '❌ Exception while extracting content from response:',
      error,
    );
    return null;
  }
};

export async function analyseJournalEntry(entry: string): Promise<string> {
  // Load onboarding data to personalize the response
  const [onboardingError, onboardingData] = await safeAwait(
    storageService.getOnboardingData(),
  );

  if (onboardingError) {
    console.warn('Failed to load onboarding data:', onboardingError);
  }

  const personalContext = buildPersonalizedContext(onboardingData || null);
  const personalGuidance = generatePersonalizedGuidance(onboardingData || null);

  const prompt = `You are a calm and thoughtful psychiatrist helping me reflect on my journal entry. Keep your reply to 1–2 short sentences. Be warm, respectful, and clear.
  When I share something, respond with:  
  – A short acknowledgment of how I might be feeling.  
  – A brief reflection that shows you understand what I said.  
  – One gentle, open-ended question to help me explore the topic more deeply.
  
  
  ${personalContext}${personalGuidance}
  
  Here's my entry:
  "${entry}"`;

  const config = getAIConfig();
  const currentProvider = AI_CONFIG.provider;

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
    console.error(
      `❌ Error analyzing journal entry with ${currentProvider}:`,
      error,
    );
    return "I'm here to listen and support you. Sometimes it helps to simply acknowledge what you're feeling right now. What stands out most to you about this moment?";
  }

  const content = extractContentFromResponse(res);

  if (!content) {
    console.error(
      `❌ Failed to extract content from ${currentProvider} response`,
    );
    return "I'm here to listen and support you. Sometimes it helps to simply acknowledge what you're feeling right now. What stands out most to you about this moment?";
  }

  return content;
}

export async function generateTitleFromEntry(entry: string): Promise<string> {
  const prompt = `Create a short, meaningful title (3-6 words) for this journal entry. The title should capture the main theme or emotion. Return only the title, nothing else.

  Journal entry:
  "${entry}"`;

  const config = getAIConfig();
  const currentProvider = AI_CONFIG.provider;

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
    console.error(`❌ Error generating title with ${currentProvider}:`, error);
    // Return a fallback title based on current date
    const now = new Date();
    return `Journal Entry - ${now.toLocaleDateString()}`;
  }

  const content = extractContentFromResponse(res);

  if (!content) {
    console.error(
      `❌ Failed to extract title from ${currentProvider} response`,
    );
    const now = new Date();
    return `Journal Entry - ${now.toLocaleDateString()}`;
  }

  return content;
}

export async function generateAlternativePerspective(
  entry: string,
): Promise<string> {
  const [onboardingError, onboardingData] = await safeAwait(
    storageService.getOnboardingData(),
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
  const currentProvider = AI_CONFIG.provider;

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
    console.error(
      `❌ Error generating alternative perspective with ${currentProvider}:`,
      error,
    );
    return 'Every experience, even difficult ones, offers opportunities for growth and self-understanding. Your willingness to reflect and seek different perspectives shows remarkable strength and wisdom. Consider how this moment might be teaching you something valuable about yourself or your resilience.';
  }

  const content = extractContentFromResponse(res);

  if (!content) {
    console.error(
      `❌ Failed to extract alternative perspective from ${currentProvider} response`,
    );
    return 'Every experience, even difficult ones, offers opportunities for growth and self-understanding. Your willingness to reflect and seek different perspectives shows remarkable strength and wisdom. Consider how this moment might be teaching you something valuable about yourself or your resilience.';
  }

  return content;
}

export interface AnalysisData {
  themes: Array<{
    name: string;
    count: number;
    breakdown: string;
    insights: string[];
    emoji: string;
  }>;
  emotions: Array<{name: string; percentage: number; color: string}>;
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

const getEmotionColor = (emotionName: string): string => {
  const emotion = emotionName.toLowerCase();

  // Positive emotions - warm, bright colors
  if (
    emotion.includes('happy') ||
    emotion.includes('joy') ||
    emotion.includes('elated')
  ) {
    return '#F59E0B'; // Bright amber
  }
  if (
    emotion.includes('grateful') ||
    emotion.includes('thankful') ||
    emotion.includes('appreciative')
  ) {
    return '#10B981'; // Emerald green
  }
  if (
    emotion.includes('hopeful') ||
    emotion.includes('optimistic') ||
    emotion.includes('confident')
  ) {
    return '#3B82F6'; // Blue
  }
  if (
    emotion.includes('excited') ||
    emotion.includes('enthusiastic') ||
    emotion.includes('energetic')
  ) {
    return '#F97316'; // Orange
  }
  if (
    emotion.includes('peaceful') ||
    emotion.includes('calm') ||
    emotion.includes('serene')
  ) {
    return '#06B6D4'; // Cyan
  }
  if (
    emotion.includes('content') ||
    emotion.includes('satisfied') ||
    emotion.includes('fulfilled')
  ) {
    return '#8B5CF6'; // Purple
  }
  if (
    emotion.includes('love') ||
    emotion.includes('affection') ||
    emotion.includes('caring')
  ) {
    return '#EC4899'; // Pink
  }

  // Neutral/contemplative emotions - muted colors
  if (
    emotion.includes('contemplative') ||
    emotion.includes('reflective') ||
    emotion.includes('thoughtful')
  ) {
    return '#64748B'; // Slate
  }
  if (
    emotion.includes('curious') ||
    emotion.includes('wondering') ||
    emotion.includes('questioning')
  ) {
    return '#7C3AED'; // Violet
  }
  if (
    emotion.includes('determined') ||
    emotion.includes('focused') ||
    emotion.includes('motivated')
  ) {
    return '#059669'; // Green
  }
  if (
    emotion.includes('nostalgic') ||
    emotion.includes('reminiscent') ||
    emotion.includes('wistful')
  ) {
    return '#D97706'; // Amber
  }

  // Challenging emotions - cooler, more muted tones
  if (
    emotion.includes('sad') ||
    emotion.includes('melancholy') ||
    emotion.includes('down')
  ) {
    return '#6366F1'; // Indigo
  }
  if (
    emotion.includes('anxious') ||
    emotion.includes('worried') ||
    emotion.includes('nervous')
  ) {
    return '#EF4444'; // Red
  }
  if (
    emotion.includes('frustrated') ||
    emotion.includes('annoyed') ||
    emotion.includes('irritated')
  ) {
    return '#DC2626'; // Dark red
  }
  if (
    emotion.includes('uncertain') ||
    emotion.includes('confused') ||
    emotion.includes('unsure')
  ) {
    return '#F59E0B'; // Amber
  }
  if (
    emotion.includes('overwhelmed') ||
    emotion.includes('stressed') ||
    emotion.includes('pressured')
  ) {
    return '#7C2D12'; // Brown
  }
  if (
    emotion.includes('lonely') ||
    emotion.includes('isolated') ||
    emotion.includes('disconnected')
  ) {
    return '#475569'; // Dark slate
  }
  if (
    emotion.includes('tired') ||
    emotion.includes('exhausted') ||
    emotion.includes('drained')
  ) {
    return '#6B7280'; // Gray
  }

  // Default fallback color
  return '#64748B'; // Slate
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
        color: String(
          emotion.color || getEmotionColor(emotion.name || 'Unknown'),
        ),
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
      emotions: [{name: 'Contemplative', percentage: 100, color: '#64748B'}],
      perspective:
        'Even brief moments of reflection demonstrate your commitment to self-awareness and growth.',
    };
  }

  const [onboardingError, onboardingData] = await safeAwait(
    storageService.getOnboardingData(),
  );

  if (onboardingError) {
    console.warn(
      'Failed to load onboarding data for analysis:',
      onboardingError,
    );
  }

  const personalContext = buildPersonalizedContext(onboardingData || null);
  const personalGuidance = generatePersonalizedGuidance(onboardingData || null);

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
    {"name": "Emotion1", "percentage": 60, "color": "#3B82F6"},
    {"name": "Emotion2", "percentage": 40, "color": "#10B981"}
  ],
  "perspective": "A thoughtful alternative perspective in 2-3 sentences"
}

CRITICAL REQUIREMENTS:
- Return ONLY valid JSON, no markdown, no explanations, no extra text
- Do not include any reasoning or thinking process in your response
- Put the JSON directly in your final answer, not in reasoning steps
- Identify 2-4 main themes from: Work, Family, Health, Relationships, Self-Care, Growth, Stress, Goals, Creativity, etc.
- Count represents theme importance (1-5 scale)
- Each theme needs exactly: name, count, breakdown (string), insights (array of strings), emoji (single relevant emoji)
- Choose appropriate emojis.
- Identify 2-4 emotions with percentages that sum to 100
- Each emotion must include a "color" field with a hex color code that matches the emotion:
  * Positive emotions: warm colors (#F59E0B amber, #10B981 green, #3B82F6 blue, #F97316 orange)
  * Contemplative emotions: muted colors (#64748B slate, #7C3AED violet)
  * Challenging emotions: cooler tones (#6366F1 indigo, #EF4444 red, #F59E0B amber)
- Perspective should be supportive and reframe their situation positively
- All strings must be properly escaped for JSON

${personalContext}${personalGuidance}

Journal entry: "${entry.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"

Return only the JSON object:`;

  const config = getAIConfig();
  console.log('🔍 Analyzing journal entry with config:', {
    provider: AI_CONFIG.provider,
    model: config.model,
    entryLength: entry.length,
  });

  const [error, res] = await safeAwait(
    axios.post(
      config.baseURL,
      {
        model: config.model,
        stream: false,
        messages: [{role: 'user', content: prompt}],
        temperature: 0.3, // Lower temperature for more consistent JSON output
        max_tokens: 2000, // Increased from 1000 to ensure complete responses
      },
      {
        headers: config.headers,
      },
    ),
  );

  if (error) {
    console.error(
      '❌ Error analyzing journal entry data - API call failed:',
      error,
    );
    return getFallbackAnalysisData();
  }

  // Provider-specific response handling
  const currentProvider = AI_CONFIG.provider;

  if (res.data?.choices?.[0]?.message) {
    const message = res.data.choices[0].message;
    const choice = res.data.choices[0];
    
    if (currentProvider === 'deepseek') {
      // Check if DeepSeek response was truncated
      if (choice.finish_reason === 'length') {
        console.warn('⚠️ DeepSeek response was truncated due to token limit');
        
        // If content is empty but reasoning_content exists, the JSON might be in reasoning_content
        if (
          (!message.content || message.content.trim() === '') &&
          message.reasoning_content
        ) {
          // Try to find a complete JSON object in reasoning_content
          const reasoningContent = message.reasoning_content;
          const jsonMatch = reasoningContent.match(/\{[\s\S]*\}/);
          
          if (jsonMatch) {
            try {
              // Try to parse it to see if it's valid
              JSON.parse(jsonMatch[0]);
              // We'll let the normal extraction process handle this
            } catch (parseError) {
              console.warn(
                '⚠️ JSON in DeepSeek reasoning_content is malformed, using fallback',
              );
              return getFallbackAnalysisData();
            }
          } else {
            console.warn(
              '⚠️ No JSON structure found in truncated DeepSeek reasoning_content, using fallback',
            );
            return getFallbackAnalysisData();
          }
        }
      }
    } else if (currentProvider === 'openai') {
      // Check if OpenAI response was truncated
      if (choice.finish_reason === 'length') {
        console.warn('⚠️ OpenAI response was truncated due to token limit');
      }
      
      // OpenAI doesn't have reasoning_content, so if content is empty, it's an error
      if (!message.content || message.content.trim() === '') {
        console.error('❌ OpenAI response has empty content field');
        return getFallbackAnalysisData();
      }
    }
  }

  const rawContent = extractContentFromResponse(res);

  if (!rawContent) {
    console.error(
      `❌ Failed to extract content from ${currentProvider} analysis response`,
    );
    return getFallbackAnalysisData();
  }

  try {
    const cleanedContent = extractJsonFromResponse(rawContent);

    // Check if the JSON looks complete
    if (!cleanedContent.includes('"perspective"')) {
      console.warn('⚠️ JSON appears incomplete (missing perspective field)');
      return getFallbackAnalysisData();
    }

    const parsedData = JSON.parse(cleanedContent);

    // Validate and normalize the data
    const analysisData = validateAndNormalizeAnalysisData(parsedData);

    return analysisData;
  } catch (parseError) {
    console.error(
      `❌ Error parsing ${currentProvider} analysis response:`,
      parseError,
    );
    
    // Check if this was a truncation issue
    if (res.data?.choices?.[0]?.finish_reason === 'length') {
      console.error(
        `💔 ${currentProvider} response was truncated, this likely caused the JSON parsing error`,
      );
    }
    
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
      {
        name: 'Relationships',
        count: 2,
        breakdown:
          'Your connections with others play an important role in your personal growth and well-being.',
        insights: [
          'You value meaningful connections',
          "You're learning about interpersonal dynamics",
          'You seek understanding in your relationships',
        ],
        emoji: '❤️',
      },
    ],
    emotions: [
      {name: 'Contemplative', percentage: 40, color: '#64748B'},
      {name: 'Hopeful', percentage: 30, color: '#3B82F6'},
      {name: 'Uncertain', percentage: 20, color: '#F59E0B'},
      {name: 'Grateful', percentage: 10, color: '#10B981'},
    ],
    perspective:
      'Your willingness to write and reflect shows incredible self-awareness and courage.',
  };
};

// Test function to verify AI API connectivity
export const testAIConnection = async (): Promise<{
  success: boolean;
  message: string;
  details?: any;
}> => {
  try {
    const config = getAIConfig();

    const testPayload = {
      model: config.model,
      messages: [
        {
          role: 'user',
          content:
            'Hello, this is a test message. Please respond with "Connection successful".',
        },
      ],
      max_tokens: 50,
      temperature: 0.1,
    };

    const [error, res] = await safeAwait(
      axios.post(config.baseURL, testPayload, {
        headers: config.headers,
        timeout: 15000, // 15 second timeout
      }),
    );

    if (error) {
      console.error('❌ AI API connection test failed:', error);
      const errorDetails = {
        message: error.message,
        status: (error as any).response?.status,
        statusText: (error as any).response?.statusText,
        data: (error as any).response?.data,
      };
      return {
        success: false,
        message: `Connection failed: ${error.message || 'Unknown error'}`,
        details: errorDetails,
      };
    }

    // Try to extract content using our improved function
    const content = extractContentFromResponse(res);

    if (content) {
      return {
        success: true,
        message: `Connection successful. Response: ${content.substring(
          0,
          100,
        )}${content.length > 100 ? '...' : ''}`,
        details: {
          provider: AI_CONFIG.provider,
          model: config.model,
          responseLength: content.length,
          fullResponse: content,
        },
      };
    } else {
      console.error(
        '❌ AI API returned response but content extraction failed',
      );
      return {
        success: false,
        message: 'Connection established but response format is invalid',
        details: {
          provider: AI_CONFIG.provider,
          model: config.model,
          rawResponse: res.data,
        },
      };
    }
  } catch (error) {
    console.error('❌ AI API connection test exception:', error);
    return {
      success: false,
      message: `Connection test failed: ${error}`,
      details: {exception: String(error)},
    };
  }
};
