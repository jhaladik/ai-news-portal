  // tests/workers/test-ai-validate.js
  export async function testAIValidate(endpoint) {
    console.log('Testing AI Validation Worker...');
    
    const testContent = {
      content_text: 'Prague Metro Line A will have service disruptions this weekend due to maintenance work. Passengers are advised to use alternative routes.',
      category: 'transport'
    };
  
    const tests = [
      {
        name: 'Validate transport content',
        test: async () => {
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(testContent)
          });
          const data = await response.json();
          return {
            pass: response.ok && typeof data.confidence === 'number' && data.checks,
            data,
            response: response.status
          };
        }
      },
      {
        name: 'Handles invalid content',
        test: async () => {
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ category: 'transport' }) // Missing content_text
          });
          return {
            pass: response.status === 400,
            data: await response.json(),
            response: response.status
          };
        }
      }
    ];
  
    return await runTests(tests);
  }