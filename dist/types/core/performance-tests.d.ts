/**
 * Performance tests to validate optimization requirements
 */
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
export declare class PerformanceTests {
    private performanceMonitor;
    private memoryManager;
    private testResults;
    constructor();
    /**
     * Run all performance tests against requirements
     */
    runAllTests(): Promise<PerformanceTestSuite[]>;
    /**
     * Test bundle size requirements (≤ 15KB core, ≤ 20KB with modules)
     */
    private testBundleSize;
    /**
     * Test frame rate requirements (60 FPS mobile, 120+ FPS desktop)
     */
    private testFrameRate;
    /**
     * Test memory usage requirements (≤ 64MB)
     */
    private testMemoryUsage;
    /**
     * Simulate rendering load to measure performance
     */
    private simulateRenderingLoad;
    /**
     * Run stress test with maximum allowed objects
     */
    private runStressTest;
    /**
     * Test memory usage under typical load
     */
    private testMemoryUnderLoad;
    /**
     * Test for memory leaks over time
     */
    private testMemoryLeaks;
    /**
     * Get current memory usage in MB
     */
    private getCurrentMemoryUsage;
    /**
     * Generate performance report
     */
    generateReport(): {
        summary: string;
        overallScore: number;
        suites: PerformanceTestSuite[];
        recommendations: string[];
    };
    /**
     * Run continuous performance monitoring
     */
    startContinuousMonitoring(callback: (report: any) => void): void;
}
//# sourceMappingURL=performance-tests.d.ts.map