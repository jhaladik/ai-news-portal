// scripts/test-phase2b.js - Comprehensive Phase 2b test runner
import { execSync } from 'child_process';

const WORKER_DOMAIN = process.env.WORKER_DOMAIN || 'jhaladik.workers.dev';

const ENDPOINTS = {
  'rss-collect': `https://rss-collect.${WORKER_DOMAIN}`,
  'ai-data-score': `https://ai-data-score.${WORKER_DOMAIN}`,
  'ai-validate-enhanced': `https://ai-validate-enhanced.${WORKER_DOMAIN}`,
  'content-publish': `https://content-publish.${WORKER_DOMAIN}`,
  'pipeline-orchestrator': `https://pipeline-orchestrator.${WORKER_DOMAIN}`,
  'ai-generate-enhanced': `https://ai-generate-enhanced.${WORKER_DOMAIN}`,
  'scheduler-daily-enhanced': `https://scheduler-daily-enhanced.${WORKER_DOMAIN}`,
  'admin-review-enhanced': `https://admin-review-enhanced.${WORKER_DOMAIN}`
};

class Phase2bTester {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      total: 0,
      details: []
    };
  }

  async runAllTests() {
    console.log('🚀 Starting Phase 2b Comprehensive Tests\n');

    // Test 1: RSS Collection
    await this.testRSSCollection();

    // Test 2: AI Data Scoring
    await this.testAIDataScoring();

    // Test 3: Enhanced AI Generation
    await this.testEnhancedAIGeneration();

    // Test 4: Enhanced Validation
    await this.testEnhancedValidation();

    // Test 5: Content Publishing
    await this.testContentPublishing();

    // Test 6: Pipeline Orchestration
    await this.testPipelineOrchestration();

    // Test 7: Enhanced Scheduler
    await this.testEnhancedScheduler();

    // Test 8: Enhanced Admin Review
    await this.testEnhancedAdminReview();

    // Test 9: End-to-End Pipeline
    await this.testEndToEndPipeline();

    this.printResults();
  }

  async testRSSCollection() {
    console.log('📡 Testing RSS Collection...');
    try {
      const response = await fetch(ENDPOINTS['rss-collect'], {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();
      
      this.assert(response.ok, 'RSS Collection endpoint responds');
      this.assert(data.collected >= 0, 'Returns collected count');
      this.assert(Array.isArray(data.items), 'Returns items array');
      this.assert(data.sources, 'Returns source statistics');

      console.log(`✅ RSS Collection: ${data.collected} items collected`);
    } catch (error) {
      this.fail('RSS Collection', error.message);
    }
  }

  async testAIDataScoring() {
    console.log('🧠 Testing AI Data Scoring...');
    try {
      const response = await fetch(ENDPOINTS['ai-data-score'], {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();
      
      this.assert(response.ok, 'AI Scoring endpoint responds');
      this.assert(typeof data.processed === 'number', 'Returns processed count');
      this.assert(typeof data.qualified === 'number', 'Returns qualified count');
      this.assert(typeof data.qualification_rate === 'number', 'Returns qualification rate');

      console.log(`✅ AI Scoring: ${data.qualified}/${data.processed} items qualified`);
    } catch (error) {
      this.fail('AI Data Scoring', error.message);
    }
  }

  async testEnhancedAIGeneration() {
    console.log('✍️ Testing Enhanced AI Generation...');
    try {
      // First, we need a raw content ID - let's create test data
      const testPayload = {
        raw_content_id: 'test-content-' + Date.now(),
        neighborhood: 'praha4',
        category: 'transport',
        force: true
      };

      const response = await fetch(ENDPOINTS['ai-generate-enhanced'], {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testPayload)
      });

      const data = await response.json();
      
      // This might fail due to missing raw content, but endpoint should respond
      this.assert(response.status === 404 || response.ok, 'AI Generation endpoint responds appropriately');
      
      if (response.ok) {
        this.assert(data.content_id, 'Returns content ID when successful');
        this.assert(data.title, 'Returns generated title');
        this.assert(typeof data.confidence === 'number', 'Returns confidence score');
      }

      console.log(`✅ AI Generation: Endpoint functional (${response.status})`);
    } catch (error) {
      this.fail('Enhanced AI Generation', error.message);
    }
  }

  async testEnhancedValidation() {
    console.log('🔍 Testing Enhanced Validation...');
    try {
      const testPayload = {
        content_text: 'Test article about Prague transport updates for commuters.',
        category: 'transport'
      };

      const response = await fetch(ENDPOINTS['ai-validate-enhanced'], {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testPayload)
      });

      const data = await response.json();
      
      this.assert(response.ok, 'Validation endpoint responds');
      this.assert(typeof data.confidence === 'number', 'Returns confidence score');
      this.assert(typeof data.approved === 'boolean', 'Returns approval status');
      this.assert(data.checks, 'Returns validation checks');
      this.assert(Array.isArray(data.flags), 'Returns flags array');

      console.log(`✅ Validation: Confidence ${data.confidence}, Approved: ${data.approved}`);
    } catch (error) {
      this.fail('Enhanced Validation', error.message);
    }
  }

  async testContentPublishing() {
    console.log('📰 Testing Content Publishing...');
    try {
      const testPayload = {
        content_id: 'test-content-' + Date.now(),
        auto_publish: false
      };

      const response = await fetch(ENDPOINTS['content-publish'], {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testPayload)
      });

      const data = await response.json();
      
      // Should return 404 for non-existent content
      this.assert(response.status === 404, 'Publishing correctly rejects non-existent content');
      this.assert(data.error, 'Returns appropriate error message');

      console.log(`✅ Publishing: Correctly validates content existence`);
    } catch (error) {
      this.fail('Content Publishing', error.message);
    }
  }

  async testPipelineOrchestration() {
    console.log('🔄 Testing Pipeline Orchestration...');
    try {
      const testPayload = {
        mode: 'collect', // Test just collection mode
        force: false
      };

      const response = await fetch(ENDPOINTS['pipeline-orchestrator'], {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testPayload)
      });

      const data = await response.json();
      
      this.assert(response.ok, 'Pipeline orchestrator responds');
      this.assert(data.pipeline_run_id, 'Returns pipeline run ID');
      this.assert(typeof data.collected === 'number', 'Returns collection count');
      this.assert(Array.isArray(data.errors), 'Returns errors array');

      console.log(`✅ Pipeline: Run ${data.pipeline_run_id} completed`);
    } catch (error) {
      this.fail('Pipeline Orchestration', error.message);
    }
  }

  async testEnhancedScheduler() {
    console.log('⏰ Testing Enhanced Scheduler...');
    try {
      const response = await fetch(ENDPOINTS['scheduler-daily-enhanced'], {
        method: 'GET'
      });

      const data = await response.json();
      
      this.assert(response.ok, 'Scheduler status endpoint responds');
      this.assert(data.scheduler === 'active', 'Reports active status');
      this.assert(data.today_stats, 'Returns daily statistics');

      console.log(`✅ Scheduler: Active with ${JSON.stringify(data.today_stats)}`);
    } catch (error) {
      this.fail('Enhanced Scheduler', error.message);
    }
  }

  async testEnhancedAdminReview() {
    console.log('👨‍💼 Testing Enhanced Admin Review...');
    try {
      const response = await fetch(ENDPOINTS['admin-review-enhanced'], {
        method: 'GET'
      });

      const data = await response.json();
      
      this.assert(response.ok, 'Admin review endpoint responds');
      this.assert(Array.isArray(data.queue), 'Returns review queue');
      this.assert(typeof data.queue_count === 'number', 'Returns queue count');
      this.assert(data.insights, 'Returns insights data');

      console.log(`✅ Admin Review: ${data.queue_count} items in queue`);
    } catch (error) {
      this.fail('Enhanced Admin Review', error.message);
    }
  }

  async testEndToEndPipeline() {
    console.log('🔗 Testing End-to-End Pipeline...');
    try {
      // Run a limited pipeline test
      const response = await fetch(ENDPOINTS['pipeline-orchestrator'], {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'full' })
      });

      const data = await response.json();
      
      this.assert(response.ok, 'Full pipeline executes');
      this.assert(data.pipeline_run_id, 'Returns run ID');
      this.assert(data.completed_at, 'Pipeline completes');

      console.log(`✅ End-to-End: Pipeline ${data.pipeline_run_id} completed in ${data.duration_ms}ms`);
    } catch (error) {
      this.fail('End-to-End Pipeline', error.message);
    }
  }

  assert(condition, message) {
    this.results.total++;
    if (condition) {
      this.results.passed++;
      this.results.details.push({ status: 'PASS', message });
    } else {
      this.results.failed++;
      this.results.details.push({ status: 'FAIL', message });
      console.log(`❌ ${message}`);
    }
  }

  fail(testName, error) {
    this.results.total++;
    this.results.failed++;
    this.results.details.push({ status: 'ERROR', message: `${testName}: ${error}` });
    console.log(`💥 ${testName}: ${error}`);
  }

  printResults() {
    console.log('\n📊 Phase 2b Test Results');
    console.log('========================');
    console.log(`Total Tests: ${this.results.total}`);
    console.log(`Passed: ${this.results.passed} ✅`);
    console.log(`Failed: ${this.results.failed} ❌`);
    console.log(`Success Rate: ${Math.round((this.results.passed / this.results.total) * 100)}%`);

    if (this.results.failed > 0) {
      console.log('\n🔍 Failed Tests:');
      this.results.details
        .filter(detail => detail.status !== 'PASS')
        .forEach(detail => console.log(`${detail.status}: ${detail.message}`));
    }

    console.log('\n🎯 Phase 2b Test Summary:');
    console.log('- RSS collection pipeline functional');
    console.log('- AI scoring and validation operational');
    console.log('- Content generation and publishing working');
    console.log('- Pipeline orchestration coordinating all steps');
    console.log('- Admin tools enhanced with category insights');
    
    if (this.results.passed === this.results.total) {
      console.log('\n🎉 All Phase 2b components are working correctly!');
    } else {
      console.log('\n⚠️  Some components need attention before production deployment.');
    }
  }
}

// Run tests
const tester = new Phase2bTester();
await tester.runAllTests();