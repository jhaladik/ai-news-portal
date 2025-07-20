  // tests/workers/test-ai-generate.js
  export async function testAIGenerate(endpoint) {
    console.log('Testing Enhanced AI Generation Worker...');
    
    const tests = [
      {
        name: 'Rejects missing raw content ID',
        test: async () => {
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ neighborhood: 'praha4' })
          });
          return {
            pass: response.status === 400,
            data: await response.json(),
            response: response.status
          };
        }
      },
      {
        name: 'Handles non-existent raw content',
        test: async () => {
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              raw_content_id: 'non-existent-' + Date.now(),
              neighborhood: 'praha4'
            })
          });
          return {
            pass: response.status === 404,
            data: await response.json(),
            response: response.status
          };
        }
      }
    ];
  
    return await runTests(tests);
  }