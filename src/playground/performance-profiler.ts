/**
 * Performance Profiler for LLM Canvas Engine
 * Provides detailed performance monitoring and analysis
 */

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
  category: 'frame' | 'memory' | 'render' | 'audio' | 'input';
}

export interface PerformanceSnapshot {
  timestamp: number;
  frameTime: number;
  fps: number;
  memoryUsage: number;
  renderTime: number;
  updateTime: number;
  audioLatency: number;
  inputLatency: number;
  activeNodes: number;
  drawCalls: number;
}

export interface PerformanceAlert {
  type: 'warning' | 'critical';
  message: string;
  metric: string;
  value: number;
  threshold: number;
  timestamp: number;
}

export class PerformanceProfiler {
  private metrics: PerformanceMetric[] = [];
  private snapshots: PerformanceSnapshot[] = [];
  private alerts: PerformanceAlert[] = [];
  private isRecording = false;
  private startTime = 0;
  private frameCount = 0;
  private lastFrameTime = 0;
  private thresholds = {
    frameTime: { warning: 20, critical: 33 }, // ms
    memory: { warning: 50, critical: 80 }, // MB
    fps: { warning: 45, critical: 30 }, // fps
    renderTime: { warning: 10, critical: 16 }, // ms
    drawCalls: { warning: 100, critical: 200 } // count
  };

  constructor() {
    this.setupPerformanceObserver();
  }

  private setupPerformanceObserver(): void {
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach(entry => {
            this.recordMetric({
              name: entry.name,
              value: entry.duration,
              unit: 'ms',
              timestamp: entry.startTime,
              category: this.categorizeEntry(entry.name)
            });
          });
        });

        observer.observe({ entryTypes: ['measure', 'navigation', 'resource'] });
      } catch (error) {
        console.warn('PerformanceObserver not supported:', error);
      }
    }
  }

  private categorizeEntry(name: string): PerformanceMetric['category'] {
    if (name.includes('frame') || name.includes('render')) return 'render';
    if (name.includes('audio')) return 'audio';
    if (name.includes('input')) return 'input';
    if (name.includes('memory')) return 'memory';
    return 'frame';
  }

  startRecording(): void {
    this.isRecording = true;
    this.startTime = performance.now();
    this.frameCount = 0;
    this.metrics = [];
    this.snapshots = [];
    this.alerts = [];
    console.log('Performance profiling started');
  }

  stopRecording(): PerformanceReport {
    this.isRecording = false;
    const duration = performance.now() - this.startTime;
    console.log(`Performance profiling stopped. Duration: ${duration.toFixed(2)}ms`);
    return this.generateReport();
  }

  recordFrame(frameTime: number): void {
    if (!this.isRecording) return;

    this.frameCount++;
    const now = performance.now();
    const fps = 1000 / frameTime;

    // Record frame metrics
    this.recordMetric({
      name: 'frameTime',
      value: frameTime,
      unit: 'ms',
      timestamp: now,
      category: 'frame'
    });

    this.recordMetric({
      name: 'fps',
      value: fps,
      unit: 'fps',
      timestamp: now,
      category: 'frame'
    });

    // Check for performance alerts
    this.checkThresholds('frameTime', frameTime);
    this.checkThresholds('fps', fps);

    this.lastFrameTime = now;
  }

  recordMemoryUsage(): void {
    if (!this.isRecording) return;

    const memory = this.getMemoryUsage();
    if (memory > 0) {
      this.recordMetric({
        name: 'memoryUsage',
        value: memory,
        unit: 'MB',
        timestamp: performance.now(),
        category: 'memory'
      });

      this.checkThresholds('memory', memory);
    }
  }

  recordRenderTime(renderTime: number): void {
    if (!this.isRecording) return;

    this.recordMetric({
      name: 'renderTime',
      value: renderTime,
      unit: 'ms',
      timestamp: performance.now(),
      category: 'render'
    });

    this.checkThresholds('renderTime', renderTime);
  }

  recordDrawCalls(count: number): void {
    if (!this.isRecording) return;

    this.recordMetric({
      name: 'drawCalls',
      value: count,
      unit: 'count',
      timestamp: performance.now(),
      category: 'render'
    });

    this.checkThresholds('drawCalls', count);
  }

  recordAudioLatency(latency: number): void {
    if (!this.isRecording) return;

    this.recordMetric({
      name: 'audioLatency',
      value: latency,
      unit: 'ms',
      timestamp: performance.now(),
      category: 'audio'
    });
  }

  recordInputLatency(latency: number): void {
    if (!this.isRecording) return;

    this.recordMetric({
      name: 'inputLatency',
      value: latency,
      unit: 'ms',
      timestamp: performance.now(),
      category: 'input'
    });
  }

  takeSnapshot(): PerformanceSnapshot {
    const now = performance.now();
    const recentMetrics = this.metrics.filter(m => now - m.timestamp < 1000);
    
    const snapshot: PerformanceSnapshot = {
      timestamp: now,
      frameTime: this.getAverageMetric(recentMetrics, 'frameTime'),
      fps: this.getAverageMetric(recentMetrics, 'fps'),
      memoryUsage: this.getLatestMetric(recentMetrics, 'memoryUsage'),
      renderTime: this.getAverageMetric(recentMetrics, 'renderTime'),
      updateTime: this.getAverageMetric(recentMetrics, 'updateTime'),
      audioLatency: this.getAverageMetric(recentMetrics, 'audioLatency'),
      inputLatency: this.getAverageMetric(recentMetrics, 'inputLatency'),
      activeNodes: this.getLatestMetric(recentMetrics, 'activeNodes'),
      drawCalls: this.getAverageMetric(recentMetrics, 'drawCalls')
    };

    if (this.isRecording) {
      this.snapshots.push(snapshot);
      
      // Keep only last 300 snapshots (5 minutes at 1 snapshot/second)
      if (this.snapshots.length > 300) {
        this.snapshots.shift();
      }
    }

    return snapshot;
  }

  private recordMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);
    
    // Keep only last 1000 metrics to prevent memory issues
    if (this.metrics.length > 1000) {
      this.metrics.shift();
    }
  }

  private checkThresholds(metricName: string, value: number): void {
    const threshold = this.thresholds[metricName as keyof typeof this.thresholds];
    if (!threshold) return;

    const now = performance.now();
    
    if (value >= threshold.critical) {
      this.alerts.push({
        type: 'critical',
        message: `Critical performance issue: ${metricName} is ${value}`,
        metric: metricName,
        value,
        threshold: threshold.critical,
        timestamp: now
      });
    } else if (value >= threshold.warning) {
      this.alerts.push({
        type: 'warning',
        message: `Performance warning: ${metricName} is ${value}`,
        metric: metricName,
        value,
        threshold: threshold.warning,
        timestamp: now
      });
    }

    // Keep only last 50 alerts
    if (this.alerts.length > 50) {
      this.alerts.shift();
    }
  }

  private getMemoryUsage(): number {
    if ('memory' in performance) {
      return (performance as any).memory.usedJSHeapSize / 1024 / 1024;
    }
    return 0;
  }

  private getAverageMetric(metrics: PerformanceMetric[], name: string): number {
    const filtered = metrics.filter(m => m.name === name);
    if (filtered.length === 0) return 0;
    return filtered.reduce((sum, m) => sum + m.value, 0) / filtered.length;
  }

  private getLatestMetric(metrics: PerformanceMetric[], name: string): number {
    const filtered = metrics.filter(m => m.name === name);
    if (filtered.length === 0) return 0;
    return filtered[filtered.length - 1].value;
  }

  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  getSnapshots(): PerformanceSnapshot[] {
    return [...this.snapshots];
  }

  getAlerts(): PerformanceAlert[] {
    return [...this.alerts];
  }

  getRecentAlerts(timeWindow = 5000): PerformanceAlert[] {
    const now = performance.now();
    return this.alerts.filter(alert => now - alert.timestamp < timeWindow);
  }

  generateReport(): PerformanceReport {
    const duration = performance.now() - this.startTime;
    const avgFps = this.getAverageMetric(this.metrics, 'fps');
    const avgFrameTime = this.getAverageMetric(this.metrics, 'frameTime');
    const maxMemory = Math.max(...this.metrics.filter(m => m.name === 'memoryUsage').map(m => m.value));
    const criticalAlerts = this.alerts.filter(a => a.type === 'critical').length;
    const warningAlerts = this.alerts.filter(a => a.type === 'warning').length;

    return {
      duration,
      frameCount: this.frameCount,
      averageFps: avgFps,
      averageFrameTime: avgFrameTime,
      maxMemoryUsage: maxMemory,
      totalMetrics: this.metrics.length,
      totalSnapshots: this.snapshots.length,
      criticalAlerts,
      warningAlerts,
      performanceScore: this.calculatePerformanceScore(),
      recommendations: this.generateRecommendations()
    };
  }

  private calculatePerformanceScore(): number {
    const avgFps = this.getAverageMetric(this.metrics, 'fps');
    const avgFrameTime = this.getAverageMetric(this.metrics, 'frameTime');
    const maxMemory = Math.max(...this.metrics.filter(m => m.name === 'memoryUsage').map(m => m.value));
    
    let score = 100;
    
    // Deduct points for poor FPS
    if (avgFps < 60) score -= (60 - avgFps) * 2;
    if (avgFps < 30) score -= 20;
    
    // Deduct points for high frame time
    if (avgFrameTime > 16.67) score -= (avgFrameTime - 16.67) * 2;
    
    // Deduct points for high memory usage
    if (maxMemory > 64) score -= (maxMemory - 64) * 0.5;
    
    // Deduct points for alerts
    score -= this.alerts.filter(a => a.type === 'critical').length * 10;
    score -= this.alerts.filter(a => a.type === 'warning').length * 5;
    
    return Math.max(0, Math.min(100, score));
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    const avgFps = this.getAverageMetric(this.metrics, 'fps');
    const avgFrameTime = this.getAverageMetric(this.metrics, 'frameTime');
    const maxMemory = Math.max(...this.metrics.filter(m => m.name === 'memoryUsage').map(m => m.value));
    const avgDrawCalls = this.getAverageMetric(this.metrics, 'drawCalls');

    if (avgFps < 45) {
      recommendations.push('Consider reducing visual complexity or optimizing render pipeline');
    }

    if (avgFrameTime > 20) {
      recommendations.push('Frame time is high - profile individual systems for bottlenecks');
    }

    if (maxMemory > 80) {
      recommendations.push('Memory usage is high - check for memory leaks or optimize asset loading');
    }

    if (avgDrawCalls > 100) {
      recommendations.push('High draw call count - consider batching sprites or reducing visual elements');
    }

    if (this.alerts.filter(a => a.type === 'critical').length > 5) {
      recommendations.push('Multiple critical performance issues detected - consider reducing game complexity');
    }

    if (recommendations.length === 0) {
      recommendations.push('Performance looks good! No major issues detected.');
    }

    return recommendations;
  }

  setThreshold(metric: string, warning: number, critical: number): void {
    if (this.thresholds[metric as keyof typeof this.thresholds]) {
      this.thresholds[metric as keyof typeof this.thresholds] = { warning, critical };
    }
  }

  clearData(): void {
    this.metrics = [];
    this.snapshots = [];
    this.alerts = [];
    this.frameCount = 0;
  }

  exportData(): string {
    return JSON.stringify({
      metrics: this.metrics,
      snapshots: this.snapshots,
      alerts: this.alerts,
      report: this.generateReport()
    }, null, 2);
  }
}

export interface PerformanceReport {
  duration: number;
  frameCount: number;
  averageFps: number;
  averageFrameTime: number;
  maxMemoryUsage: number;
  totalMetrics: number;
  totalSnapshots: number;
  criticalAlerts: number;
  warningAlerts: number;
  performanceScore: number;
  recommendations: string[];
}