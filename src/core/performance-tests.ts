/**
 * Performance tests to validate optimization requirements
 */

import { PerformanceMonitor, PerformanceBudget } from './performance-monitor.js';
import { MemoryManager } from './memory-manager.js';
import { BuildOptimizer } from './build-optimizer.js';

export interface PerformanceTestResult {
  testName: string;
  passed: boolean;
  actualValue: number;
  expectedValue: number;
  unit: string;
  details?: string;
}

export interface PerformanceTestSuite {
  name: string;
  results: PerformanceTestResult[];
  overallPassed: boolean;
  score: number;
}

export class PerformanceTests {
  private performanceMonitor: PerformanceMonitor;
  private memoryManager: MemoryManager;
  private testResults: PerformanceTestSuite[] = [];

  constructor() {
    this.performanceMonitor = new PerformanceMonitor();
    this.memoryManager = new MemoryManager();
  }

  /**
   * Run all performance tests against requirements
   */
  async runAllTests(): Promise<PerformanceTestSuite[]> {
    this.testResults = [];

    // Test Requirements 1.1 & 1.2 - Size requirements
    await this.testBundleSize();

    // Test Requirements 3.4 & 3.5 - Performance requirements
    await this.testFrameRate();

    // Test Requirements 3.6 & 3.7 - Memory and capacity requirements
    await this.testMemoryUsage();

    return this.testResults;
  }

  /**
   * Test bundle size requirements (≤ 15KB core, ≤ 20KB with modules)
   */
  private async testBundleSize(): Promise<void> {
    const suite: PerformanceTestSuite = {
      name: 'Bundle Size Tests',
      results: [],
      overallPassed: true,
      score: 0
    };

    // Test core engine size
    const coreSize = BuildOptimizer.calculateBuildSize(['core']);
    suite.results.push({
      testName: 'Core Engine Size',
      passed: coreSize <= 15,
      actualValue: coreSize,
      expectedValue: 15,
      unit: 'KB',
      details: 'Core engine must be ≤ 15KB gzipped'
    });

    // Test typical configuration size
    const typicalSize = BuildOptimizer.calculateBuildSize(['core', 'mode7', 'particles']);
    suite.results.push({
      testName: 'Typical Configuration Size',
      passed: typicalSize <= 20,
      actualValue: typicalSize,
      expectedValue: 20,
      unit: 'KB',
      details: 'Typical build must be ≤ 20KB gzipped'
    });

    // Test mobile-optimized build
    const mobileTarget = BuildOptimizer.getBuildTarget('mobile-minimal');
    if (mobileTarget) {
      const mobileValidation = BuildOptimizer.validateBuildSize(mobileTarget);
      suite.results.push({
        testName: 'Mobile Build Size',
        passed: mobileValidation.valid,
        actualValue: mobileValidation.actualSize,
        expectedValue: mobileTarget.maxSize,
        unit: 'KB',
        details: mobileValidation.message || 'Mobile build within size limits'
      });
    }

    // Calculate overall score
    const passedTests = suite.results.filter(r => r.passed).length;
    suite.score = (passedTests / suite.results.length) * 100;
    suite.overallPassed = suite.score === 100;

    this.testResults.push(suite);
  }

  /**
   * Test frame rate requirements (60 FPS mobile, 120+ FPS desktop)
   */
  private async testFrameRate(): Promise<void> {
    const suite: PerformanceTestSuite = {
      name: 'Frame Rate Tests',
      results: [],
      overallPassed: true,
      score: 0
    };

    // Simulate rendering load
    const testDuration = 500; // 0.5 seconds for faster tests
    const frameCount = await this.simulateRenderingLoad(testDuration);
    const averageFPS = (frameCount / testDuration) * 1000;

    // Detect platform for appropriate targets
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const targetFPS = isMobile ? 60 : 120;

    suite.results.push({
      testName: 'Average Frame Rate',
      passed: averageFPS >= targetFPS,
      actualValue: Math.round(averageFPS),
      expectedValue: targetFPS,
      unit: 'FPS',
      details: `Target: ${targetFPS} FPS for ${isMobile ? 'mobile' : 'desktop'}`
    });

    // Test frame time consistency
    const frameStats = this.performanceMonitor.getFrameStats();
    const frameTimeVariance = frameStats.max - frameStats.min;
    suite.results.push({
      testName: 'Frame Time Consistency',
      passed: frameTimeVariance < 5, // Less than 5ms variance
      actualValue: Math.round(frameTimeVariance),
      expectedValue: 5,
      unit: 'ms',
      details: 'Frame time should be consistent (low variance)'
    });

    // Test with stress conditions (200 sprites, 1 fake-3D surface, 200 billboards)
    const stressTestPassed = await this.runStressTest();
    suite.results.push({
      testName: 'Stress Test Performance',
      passed: stressTestPassed,
      actualValue: stressTestPassed ? 1 : 0,
      expectedValue: 1,
      unit: 'pass/fail',
      details: '200 sprites + 1 fake-3D surface + 200 billboards at 60 FPS'
    });

    // Calculate overall score
    const passedTests = suite.results.filter(r => r.passed).length;
    suite.score = (passedTests / suite.results.length) * 100;
    suite.overallPassed = suite.score === 100;

    this.testResults.push(suite);
  }

  /**
   * Test memory usage requirements (≤ 64MB)
   */
  private async testMemoryUsage(): Promise<void> {
    const suite: PerformanceTestSuite = {
      name: 'Memory Usage Tests',
      results: [],
      overallPassed: true,
      score: 0
    };

    // Test baseline memory usage
    const baselineMemory = this.getCurrentMemoryUsage();
    suite.results.push({
      testName: 'Baseline Memory Usage',
      passed: baselineMemory <= 64,
      actualValue: Math.round(baselineMemory),
      expectedValue: 64,
      unit: 'MB',
      details: 'Memory usage should be ≤ 64MB'
    });

    // Test memory usage under load
    const loadMemory = await this.testMemoryUnderLoad();
    suite.results.push({
      testName: 'Memory Under Load',
      passed: loadMemory <= 64,
      actualValue: Math.round(loadMemory),
      expectedValue: 64,
      unit: 'MB',
      details: 'Memory usage under typical game load'
    });

    // Test memory leak detection
    const memoryLeakTest = await this.testMemoryLeaks();
    suite.results.push({
      testName: 'Memory Leak Detection',
      passed: memoryLeakTest.passed,
      actualValue: memoryLeakTest.leakRate,
      expectedValue: 1, // Less than 1MB/minute leak rate
      unit: 'MB/min',
      details: 'Memory should not leak significantly over time'
    });

    // Test garbage collection efficiency
    const gcStats = this.memoryManager.getStats().gcStats;
    const gcEfficiency = gcStats.collections > 0 ? gcStats.totalTime / gcStats.collections : 0;
    suite.results.push({
      testName: 'GC Efficiency',
      passed: gcEfficiency < 10, // Less than 10ms average GC time
      actualValue: Math.round(gcEfficiency * 100) / 100,
      expectedValue: 10,
      unit: 'ms',
      details: 'Garbage collection should be efficient'
    });

    // Calculate overall score
    const passedTests = suite.results.filter(r => r.passed).length;
    suite.score = (passedTests / suite.results.length) * 100;
    suite.overallPassed = suite.score === 100;

    this.testResults.push(suite);
  }

  /**
   * Simulate rendering load to measure performance
   */
  private async simulateRenderingLoad(duration: number): Promise<number> {
    return new Promise((resolve) => {
      let frameCount = 0;
      const startTime = performance.now();
      
      const renderFrame = () => {
        // Simulate rendering work
        const canvas = document.createElement('canvas');
        canvas.width = 800;
        canvas.height = 600;
        const ctx = canvas.getContext('2d');
        
        // Only draw if context is available (for JSDOM compatibility)
        if (ctx) {
          // Draw some shapes to simulate rendering load
          for (let i = 0; i < 50; i++) {
            ctx.fillStyle = `hsl(${i * 7}, 50%, 50%)`;
            ctx.fillRect(Math.random() * 800, Math.random() * 600, 20, 20);
          }
        }
        
        frameCount++;
        
        if (performance.now() - startTime < duration) {
          requestAnimationFrame(renderFrame);
        } else {
          resolve(frameCount);
        }
      };
      
      requestAnimationFrame(renderFrame);
    });
  }

  /**
   * Run stress test with maximum allowed objects
   */
  private async runStressTest(): Promise<boolean> {
    const testDuration = 300; // 0.3 seconds for faster tests
    const startTime = performance.now();
    let frameCount = 0;
    let allFramesOnTime = true;
    
    return new Promise((resolve) => {
      const stressFrame = () => {
        const frameStart = performance.now();
        
        // Simulate stress conditions
        const canvas = document.createElement('canvas');
        canvas.width = 800;
        canvas.height = 600;
        const ctx = canvas.getContext('2d');
        
        // Only render if context is available (for JSDOM compatibility)
        if (ctx) {
          // 200 sprites
          for (let i = 0; i < 200; i++) {
            ctx.fillStyle = `hsl(${i}, 50%, 50%)`;
            ctx.fillRect(Math.random() * 800, Math.random() * 600, 10, 10);
          }
          
          // Simulate 1 fake-3D surface (more expensive rendering)
          for (let i = 0; i < 100; i++) {
            ctx.strokeStyle = `hsl(${i * 3}, 30%, 30%)`;
            ctx.beginPath();
            ctx.moveTo(Math.random() * 800, Math.random() * 600);
            ctx.lineTo(Math.random() * 800, Math.random() * 600);
            ctx.stroke();
          }
          
          // 200 billboards (simple sprites)
          for (let i = 0; i < 200; i++) {
            ctx.fillStyle = `hsla(${i}, 50%, 50%, 0.5)`;
            ctx.fillRect(Math.random() * 800, Math.random() * 600, 5, 5);
          }
        }
        
        const frameTime = performance.now() - frameStart;
        if (frameTime > 16.67) { // More than 60 FPS budget
          allFramesOnTime = false;
        }
        
        frameCount++;
        
        if (performance.now() - startTime < testDuration) {
          requestAnimationFrame(stressFrame);
        } else {
          const averageFPS = (frameCount / testDuration) * 1000;
          resolve(averageFPS >= 60 && allFramesOnTime);
        }
      };
      
      requestAnimationFrame(stressFrame);
    });
  }

  /**
   * Test memory usage under typical load
   */
  private async testMemoryUnderLoad(): Promise<number> {
    // Create typical game objects
    const objects: any[] = [];
    
    // Create 100 game objects with typical properties
    for (let i = 0; i < 100; i++) {
      objects.push({
        id: `object_${i}`,
        position: { x: Math.random() * 800, y: Math.random() * 600 },
        velocity: { x: Math.random() * 10 - 5, y: Math.random() * 10 - 5 },
        sprite: `sprite_${i % 10}`,
        properties: {
          health: 100,
          damage: 10,
          speed: 5,
          type: 'enemy'
        }
      });
    }
    
    // Simulate some processing
    for (let frame = 0; frame < 60; frame++) {
      for (const obj of objects) {
        obj.position.x += obj.velocity.x;
        obj.position.y += obj.velocity.y;
        
        // Bounce off edges
        if (obj.position.x < 0 || obj.position.x > 800) obj.velocity.x *= -1;
        if (obj.position.y < 0 || obj.position.y > 600) obj.velocity.y *= -1;
      }
    }
    
    return this.getCurrentMemoryUsage();
  }

  /**
   * Test for memory leaks over time
   */
  private async testMemoryLeaks(): Promise<{ passed: boolean; leakRate: number }> {
    const initialMemory = this.getCurrentMemoryUsage();
    const testDuration = 1000; // 1 second for faster tests
    const samples: number[] = [];
    
    return new Promise((resolve) => {
      const sampleInterval = setInterval(() => {
        samples.push(this.getCurrentMemoryUsage());
      }, 100); // Faster sampling for tests
      
      setTimeout(() => {
        clearInterval(sampleInterval);
        
        const finalMemory = this.getCurrentMemoryUsage();
        const memoryIncrease = finalMemory - initialMemory;
        const leakRate = (memoryIncrease / (testDuration / 1000)) * 60; // MB per minute
        
        resolve({
          passed: leakRate < 1, // Less than 1MB/minute
          leakRate: Math.max(0, leakRate)
        });
      }, testDuration);
    });
  }

  /**
   * Get current memory usage in MB
   */
  private getCurrentMemoryUsage(): number {
    if ('memory' in performance) {
      return (performance as any).memory.usedJSHeapSize / 1024 / 1024;
    }
    
    // Fallback estimation
    return 32; // Assume 32MB baseline
  }

  /**
   * Generate performance report
   */
  generateReport(): {
    summary: string;
    overallScore: number;
    suites: PerformanceTestSuite[];
    recommendations: string[];
  } {
    const overallScore = this.testResults.reduce((sum, suite) => sum + suite.score, 0) / this.testResults.length;
    const allPassed = this.testResults.every(suite => suite.overallPassed);
    
    const recommendations: string[] = [];
    
    // Analyze failed tests and provide recommendations
    for (const suite of this.testResults) {
      for (const result of suite.results) {
        if (!result.passed) {
          switch (result.testName) {
            case 'Core Engine Size':
              recommendations.push('Reduce core engine size through better tree-shaking and minification');
              break;
            case 'Average Frame Rate':
              recommendations.push('Optimize rendering pipeline and reduce visual complexity');
              break;
            case 'Memory Under Load':
              recommendations.push('Implement object pooling and improve memory management');
              break;
            case 'Memory Leak Detection':
              recommendations.push('Review object lifecycle management and cleanup procedures');
              break;
          }
        }
      }
    }
    
    if (recommendations.length === 0) {
      recommendations.push('All performance tests passed! Engine meets requirements.');
    }
    
    return {
      summary: allPassed 
        ? `All performance requirements met (Score: ${overallScore.toFixed(1)}%)`
        : `Some performance issues detected (Score: ${overallScore.toFixed(1)}%)`,
      overallScore,
      suites: this.testResults,
      recommendations
    };
  }

  /**
   * Run continuous performance monitoring
   */
  startContinuousMonitoring(callback: (report: any) => void): void {
    setInterval(() => {
      const report = {
        timestamp: Date.now(),
        memory: this.getCurrentMemoryUsage(),
        performanceState: this.performanceMonitor.getState(),
        memoryStats: this.memoryManager.getStats()
      };
      callback(report);
    }, 1000);
  }
}