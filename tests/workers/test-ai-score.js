  // tests/workers/test-ai-score.js
  export async function testAIScore(endpoint) {
    console.log('Testing AI Data Scoring Worker...');
    
    const tests = [
      {
        name: 'Process unscored content',
        test: async () => {
          const response = await fetch(endpoint, { method: 'POST' });
          const data = await response.json();
          return {
            pass: response.ok && typeof data.processed === 'number',
            data,
            response: response.status
          };
        }
      },
      {
        name: 'Returns qualification metrics',
        test: async () => {
          const response = await fetch(endpoint, { method: 'POST' });
          const data = await response.json();
          return {
            pass: data.qualification_rate !== undefined && Array.isArray(data.items),
            data,
            response: response.status
          };
        }
      }
    ];
  
    return await runTests(tests);
  }
