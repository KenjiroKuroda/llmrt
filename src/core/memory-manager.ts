/**
 * Memory management system with garbage collection optimization
 */

export interface MemoryPool<T> {
  acquire(): T;
  release(item: T): void;
  size(): number;
  clear(): void;
}

export interface MemoryStats {
  totalAllocated: number; // bytes
  totalReleased: number; // bytes
  currentUsage: number; // bytes
  poolStats: Record<string, { size: number; used: number; available: number }>;
  gcStats: {
    collections: number;
    totalTime: number;
    lastCollection: number;
  };
}

/**
 * Generic object pool for memory optimization
 */
class ObjectPool<T> implements MemoryPool<T> {
  private pool: T[] = [];
  private factory: () => T;
  private reset?: (item: T) => void;
  private maxSize: number;
  private allocated = 0;
  private released = 0;

  constructor(factory: () => T, reset?: (item: T) => void, maxSize = 100) {
    this.factory = factory;
    this.reset = reset;
    this.maxSize = maxSize;
  }

  acquire(): T {
    let item: T;
    
    if (this.pool.length > 0) {
      item = this.pool.pop()!;
    } else {
      item = this.factory();
      this.allocated++;
    }

    return item;
  }

  release(item: T): void {
    if (this.pool.length < this.maxSize) {
      if (this.reset) {
        this.reset(item);
      }
      this.pool.push(item);
      this.released++;
    }
  }

  size(): number {
    return this.pool.length;
  }

  clear(): void {
    this.pool.length = 0;
  }

  getStats(): { allocated: number; released: number; pooled: number } {
    return {
      allocated: this.allocated,
      released: this.released,
      pooled: this.pool.length
    };
  }
}

/**
 * Memory manager with automatic garbage collection optimization
 */
export class MemoryManager {
  private pools = new Map<string, ObjectPool<any>>();
  private memoryUsage = 0;
  private lastGCTime = 0;
  private gcCollections = 0;
  private gcTotalTime = 0;
  private gcThreshold = 50 * 1024 * 1024; // 50MB threshold
  private isGCScheduled = false;
  private weakRefs = new Set<any>(); // WeakRef compatibility
  private cleanupCallbacks = new Map<string, () => void>();

  constructor() {
    this.setupDefaultPools();
    this.setupGCMonitoring();
  }

  private setupDefaultPools(): void {
    // Vector2 pool
    this.createPool('Vector2', 
      () => ({ x: 0, y: 0 }),
      (v) => { v.x = 0; v.y = 0; },
      200
    );

    // Transform pool
    this.createPool('Transform',
      () => ({
        position: { x: 0, y: 0 },
        scale: { x: 1, y: 1 },
        rotation: 0,
        skew: { x: 0, y: 0 },
        alpha: 1
      }),
      (t) => {
        t.position.x = 0; t.position.y = 0;
        t.scale.x = 1; t.scale.y = 1;
        t.rotation = 0;
        t.skew.x = 0; t.skew.y = 0;
        t.alpha = 1;
      },
      100
    );

    // Particle pool
    this.createPool('Particle',
      () => ({
        position: { x: 0, y: 0 },
        velocity: { x: 0, y: 0 },
        acceleration: { x: 0, y: 0 },
        life: 1,
        maxLife: 1,
        size: 1,
        color: { r: 255, g: 255, b: 255, a: 1 },
        active: false
      }),
      (p) => {
        p.position.x = 0; p.position.y = 0;
        p.velocity.x = 0; p.velocity.y = 0;
        p.acceleration.x = 0; p.acceleration.y = 0;
        p.life = 1; p.maxLife = 1; p.size = 1;
        p.color.r = 255; p.color.g = 255; p.color.b = 255; p.color.a = 1;
        p.active = false;
      },
      1000
    );

    // Audio buffer pool
    this.createPool('AudioBuffer',
      () => new ArrayBuffer(4096),
      () => {}, // ArrayBuffers don't need reset
      50
    );

    // Canvas pool for temporary rendering
    this.createPool('Canvas',
      () => {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        return canvas;
      },
      (canvas) => {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      },
      10
    );
  }

  private setupGCMonitoring(): void {
    // Monitor memory usage and trigger GC when needed
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          for (const entry of entries) {
            if (entry.name === 'gc') {
              this.gcCollections++;
              this.gcTotalTime += entry.duration;
              this.lastGCTime = performance.now();
            }
          }
        });
        observer.observe({ entryTypes: ['measure'] });
      } catch (error) {
        console.warn('GC monitoring not available:', error);
      }
    }

    // Periodic cleanup
    setInterval(() => {
      this.performMaintenance();
    }, 5000); // Every 5 seconds
  }

  /**
   * Create a new object pool
   */
  createPool<T>(
    name: string,
    factory: () => T,
    reset?: (item: T) => void,
    maxSize = 100
  ): void {
    this.pools.set(name, new ObjectPool(factory, reset, maxSize));
  }

  /**
   * Acquire object from pool
   */
  acquire<T>(poolName: string): T {
    const pool = this.pools.get(poolName);
    if (!pool) {
      throw new Error(`Pool '${poolName}' not found`);
    }
    return pool.acquire();
  }

  /**
   * Release object back to pool
   */
  release(poolName: string, item: any): void {
    const pool = this.pools.get(poolName);
    if (pool) {
      pool.release(item);
    }
  }

  /**
   * Track weak reference for automatic cleanup
   */
  trackWeakRef<T extends object>(obj: T): any {
    // WeakRef compatibility - simplified implementation
    if (typeof WeakRef !== 'undefined') {
      const weakRef = new WeakRef(obj);
      this.weakRefs.add(weakRef);
      return weakRef;
    }
    // Fallback for environments without WeakRef
    return { deref: () => obj };
  }

  /**
   * Register cleanup callback
   */
  registerCleanup(id: string, callback: () => void): void {
    this.cleanupCallbacks.set(id, callback);
  }

  /**
   * Unregister cleanup callback
   */
  unregisterCleanup(id: string): void {
    this.cleanupCallbacks.delete(id);
  }

  /**
   * Force garbage collection (if available)
   */
  forceGC(): void {
    if ('gc' in window && typeof (window as any).gc === 'function') {
      const startTime = performance.now();
      (window as any).gc();
      const duration = performance.now() - startTime;
      
      this.gcCollections++;
      this.gcTotalTime += duration;
      this.lastGCTime = performance.now();
      
      console.log(`Manual GC completed in ${duration.toFixed(2)}ms`);
    } else {
      // Fallback: create memory pressure to encourage GC
      this.createMemoryPressure();
    }
  }

  /**
   * Create memory pressure to encourage garbage collection
   */
  private createMemoryPressure(): void {
    if (this.isGCScheduled) return;
    
    this.isGCScheduled = true;
    
    // Create and immediately discard large objects to trigger GC
    setTimeout(() => {
      const pressure: any[] = [];
      for (let i = 0; i < 100; i++) {
        pressure.push(new ArrayBuffer(1024 * 1024)); // 1MB each
      }
      pressure.length = 0; // Clear references
      
      this.isGCScheduled = false;
    }, 0);
  }

  /**
   * Perform periodic maintenance
   */
  private performMaintenance(): void {
    // Clean up dead weak references
    const deadRefs: any[] = [];
    for (const weakRef of this.weakRefs) {
      if (weakRef.deref() === undefined) {
        deadRefs.push(weakRef);
      }
    }
    
    for (const deadRef of deadRefs) {
      this.weakRefs.delete(deadRef);
    }

    // Run cleanup callbacks
    for (const callback of this.cleanupCallbacks.values()) {
      try {
        callback();
      } catch (error) {
        console.warn('Cleanup callback error:', error);
      }
    }

    // Check if GC is needed
    const currentMemory = this.getCurrentMemoryUsage();
    if (currentMemory > this.gcThreshold) {
      this.forceGC();
    }
  }

  /**
   * Get current memory usage estimate
   */
  getCurrentMemoryUsage(): number {
    if ('memory' in performance) {
      return (performance as any).memory.usedJSHeapSize;
    }
    
    // Fallback estimation based on pool usage
    let estimate = 0;
    for (const [name, pool] of this.pools) {
      const stats = pool.getStats();
      estimate += stats.allocated * this.getObjectSize(name);
    }
    
    return estimate;
  }

  /**
   * Estimate object size for different types
   */
  private getObjectSize(poolName: string): number {
    const sizes: Record<string, number> = {
      'Vector2': 16, // 2 numbers
      'Transform': 56, // 7 numbers + object overhead
      'Particle': 80, // Multiple properties
      'AudioBuffer': 4096, // Fixed size
      'Canvas': 1024 * 1024 // Estimate for 256x256 canvas
    };
    
    return sizes[poolName] || 64; // Default estimate
  }

  /**
   * Get memory statistics
   */
  getStats(): MemoryStats {
    const poolStats: Record<string, { size: number; used: number; available: number }> = {};
    
    for (const [name, pool] of this.pools) {
      const stats = pool.getStats();
      poolStats[name] = {
        size: stats.allocated,
        used: stats.allocated - stats.released,
        available: pool.size()
      };
    }

    return {
      totalAllocated: this.memoryUsage,
      totalReleased: 0, // Would need tracking
      currentUsage: this.getCurrentMemoryUsage(),
      poolStats,
      gcStats: {
        collections: this.gcCollections,
        totalTime: this.gcTotalTime,
        lastCollection: this.lastGCTime
      }
    };
  }

  /**
   * Clear all pools
   */
  clearAllPools(): void {
    for (const pool of this.pools.values()) {
      pool.clear();
    }
  }

  /**
   * Set GC threshold
   */
  setGCThreshold(bytes: number): void {
    this.gcThreshold = bytes;
  }

  /**
   * Get pool by name
   */
  getPool(name: string): MemoryPool<any> | undefined {
    return this.pools.get(name);
  }

  /**
   * Check if memory usage is within limits
   */
  isMemoryHealthy(): boolean {
    const currentUsage = this.getCurrentMemoryUsage();
    const maxUsage = 64 * 1024 * 1024; // 64MB limit
    
    return currentUsage < maxUsage * 0.8; // 80% threshold
  }

  /**
   * Optimize memory usage
   */
  optimize(): void {
    // Clear unused pool objects
    for (const pool of this.pools.values()) {
      // Keep only 25% of pooled objects
      const currentSize = pool.size();
      const targetSize = Math.floor(currentSize * 0.25);
      
      for (let i = 0; i < currentSize - targetSize; i++) {
        if (pool.size() > 0) {
          pool.acquire(); // Remove from pool without returning
        }
      }
    }

    // Force garbage collection
    this.forceGC();
  }

  /**
   * Generate memory report
   */
  generateReport(): {
    summary: string;
    usage: number;
    limit: number;
    pools: Record<string, any>;
    recommendations: string[];
  } {
    const stats = this.getStats();
    const usage = stats.currentUsage;
    const limit = 64 * 1024 * 1024; // 64MB
    const usagePercent = (usage / limit) * 100;
    
    const recommendations: string[] = [];
    
    if (usagePercent > 80) {
      recommendations.push('Memory usage is high - consider reducing asset quality');
    }
    
    if (stats.gcStats.collections > 100) {
      recommendations.push('Frequent garbage collection detected - optimize object creation');
    }
    
    // Check pool efficiency
    for (const [name, poolStat] of Object.entries(stats.poolStats)) {
      const efficiency = poolStat.available / poolStat.size;
      if (efficiency < 0.1) {
        recommendations.push(`${name} pool is underutilized - consider reducing pool size`);
      }
    }

    return {
      summary: `Memory usage: ${(usage / 1024 / 1024).toFixed(1)}MB (${usagePercent.toFixed(1)}%)`,
      usage,
      limit,
      pools: stats.poolStats,
      recommendations
    };
  }
}