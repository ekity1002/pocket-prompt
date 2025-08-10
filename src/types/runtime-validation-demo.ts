// Runtime Type Validation Demo
// TASK-0005: Demonstrates type guards working at runtime

import {
  isPrompt,
  isSupportedAISite,
  isExportFormat,
  validatePromptContent,
  validateTags,
  createDefaultUserSettings,
  createDefaultPromptMetadata,
  generatePromptId,
  POCKET_PROMPT_CONSTANTS,
  type Prompt,
} from './index';

console.log('🔍 Pocket-Prompt Type Guards Runtime Validation Demo');
console.log('=' .repeat(60));

// Test 1: Valid Prompt Validation
console.log('\n📝 Test 1: Valid Prompt Validation');
const validPrompt: Prompt = {
  id: generatePromptId(),
  title: 'Test Prompt for GPT',
  content: 'You are a helpful AI assistant. Please help the user with their question.',
  tags: ['assistant', 'helpful', 'gpt'],
  categoryId: 'general',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  metadata: createDefaultPromptMetadata(),
};

console.log('Valid prompt object:', JSON.stringify(validPrompt, null, 2));
console.log('isPrompt() result:', isPrompt(validPrompt) ? '✅ PASS' : '❌ FAIL');

// Test 2: Invalid Prompt Validation
console.log('\n📝 Test 2: Invalid Prompt Validation');
const invalidPrompt = {
  id: 'test-id',
  title: 'Test Prompt',
  content: 'Test content',
  tags: 'not-an-array', // This should fail
  createdAt: '2024-01-01',
  updatedAt: '2024-01-01',
  metadata: { usageCount: 0, isFavorite: false },
};

console.log('Invalid prompt object:', JSON.stringify(invalidPrompt, null, 2));
console.log('isPrompt() result:', isPrompt(invalidPrompt) ? '❌ FAIL (should reject)' : '✅ PASS (correctly rejected)');

// Test 3: AI Site Validation
console.log('\n🤖 Test 3: AI Site Validation');
const testSites = ['chatgpt', 'claude', 'gemini', 'invalid-site', 123, null];
testSites.forEach(site => {
  const result = isSupportedAISite(site);
  const status = (typeof site === 'string' && POCKET_PROMPT_CONSTANTS.SUPPORTED_AI_SITES.includes(site as any)) 
    ? (result ? '✅ PASS' : '❌ FAIL') 
    : (result ? '❌ FAIL' : '✅ PASS');
  console.log(`${site}: ${status}`);
});

// Test 4: Export Format Validation
console.log('\n📤 Test 4: Export Format Validation');
const testFormats = ['markdown', 'json', 'txt', 'csv', 'pdf', 'xml', null];
testFormats.forEach(format => {
  const result = isExportFormat(format);
  const status = (typeof format === 'string' && POCKET_PROMPT_CONSTANTS.EXPORT_FORMATS.includes(format as any)) 
    ? (result ? '✅ PASS' : '❌ FAIL') 
    : (result ? '❌ FAIL' : '✅ PASS');
  console.log(`${format}: ${status}`);
});

// Test 5: Content Validation
console.log('\n📄 Test 5: Content Validation');
const testContents = [
  'Valid prompt content',
  '', // Empty content
  '   ', // Whitespace only
  'a'.repeat(POCKET_PROMPT_CONSTANTS.MAX_PROMPT_CONTENT_LENGTH + 1), // Too long
];

testContents.forEach((content, index) => {
  const errors = validatePromptContent(content);
  const status = errors.length === 0 ? '✅ PASS' : `❌ FAIL: ${errors.join(', ')}`;
  console.log(`Content ${index + 1}: ${status}`);
});

// Test 6: Tag Validation
console.log('\n🏷️ Test 6: Tag Validation');
const testTagSets = [
  ['valid', 'tags', 'here'],
  ['tag1', 'tag1'], // Duplicates
  ['valid', '', 'empty-tag'], // Empty tag
  ['valid', 'invalid@tag'], // Invalid characters
  Array.from({ length: POCKET_PROMPT_CONSTANTS.MAX_TAG_COUNT + 1 }, (_, i) => `tag${i}`), // Too many
];

testTagSets.forEach((tags, index) => {
  const errors = validateTags(tags);
  const status = errors.length === 0 ? '✅ PASS' : `❌ FAIL: ${errors.join(', ')}`;
  console.log(`TagSet ${index + 1}: ${status}`);
});

// Test 7: Default Factory Functions
console.log('\n🏭 Test 7: Default Factory Functions');
const defaultSettings = createDefaultUserSettings();
console.log('Default settings created:', JSON.stringify(defaultSettings, null, 2));

const defaultMetadata = createDefaultPromptMetadata();
console.log('Default metadata created:', JSON.stringify(defaultMetadata, null, 2));

const newPromptId = generatePromptId();
console.log('Generated prompt ID:', newPromptId);

// Test 8: Constants Verification
console.log('\n🔧 Test 8: Constants Verification');
console.log('Storage limits:');
console.log(`  MAX_STORAGE_SIZE: ${POCKET_PROMPT_CONSTANTS.MAX_STORAGE_SIZE} bytes (${POCKET_PROMPT_CONSTANTS.MAX_STORAGE_SIZE / (1024 * 1024)}MB)`);
console.log(`  MAX_PROMPTS_COUNT: ${POCKET_PROMPT_CONSTANTS.MAX_PROMPTS_COUNT}`);
console.log(`  MAX_PROMPT_CONTENT_LENGTH: ${POCKET_PROMPT_CONSTANTS.MAX_PROMPT_CONTENT_LENGTH}`);

console.log('\nSupported AI Sites:');
POCKET_PROMPT_CONSTANTS.SUPPORTED_AI_SITES.forEach(site => {
  const siteConfig = POCKET_PROMPT_CONSTANTS.SITE_SELECTORS[site];
  console.log(`  ${site}: ${siteConfig.url}`);
});

console.log('\nExport formats:', POCKET_PROMPT_CONSTANTS.EXPORT_FORMATS.join(', '));
console.log('Themes:', POCKET_PROMPT_CONSTANTS.THEMES.join(', '));
console.log('Languages:', POCKET_PROMPT_CONSTANTS.LANGUAGES.join(', '));

console.log('\n🎉 Runtime validation demo completed!');

// Export for testing
export function runRuntimeValidationDemo() {
  return {
    validPromptTest: isPrompt(validPrompt),
    invalidPromptTest: !isPrompt(invalidPrompt),
    siteValidationTest: isSupportedAISite('chatgpt') && !isSupportedAISite('invalid'),
    formatValidationTest: isExportFormat('json') && !isExportFormat('pdf'),
    contentValidationTest: validatePromptContent('valid').length === 0,
    tagValidationTest: validateTags(['valid', 'tags']).length === 0,
    constantsTest: POCKET_PROMPT_CONSTANTS.SUPPORTED_AI_SITES.length === 3,
  };
}

// Run the demo if this file is executed directly
if (typeof require !== 'undefined' && require.main === module) {
  // Node.js environment
  console.log('\n📊 Quick Test Results:', runRuntimeValidationDemo());
}