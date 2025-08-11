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
    totalAllocated: number;
    totalReleased: number;
    currentUsage: number;
    poolStats: Record<string, {
        size: number;
        used: number;
        available: number;
    }>;
    gcStats: {
        collections: number;
        totalTime: number;
        lastCollection: number;
    };
}
/**
 * Memory manager with automatic garbage collection optimization
 */
export declare class MemoryManager {
    private pools;
    private memoryUsage;
    private lastGCTime;
    private gcCollections;
    private gcTotalTime;
    private gcThreshold;
    private isGCScheduled;
    private weakRefs;
    private cleanupCallbacks;
    constructor();
    private setupDefaultPools;
    private setupGCMonitoring;
    /**
     * Create a new object pool
     */
    createPool<T>(name: string, factory: () => T, reset?: (item: T) => void, maxSize?: number): void;
    /**
     * Acquire object from pool
     */
    acquire<T>(poolName: string): T;
    /**
     * Release object back to pool
     */
    release(poolName: string, item: any): void;
    /**
     * Track weak reference for automatic cleanup
     */
    trackWeakRef<T extends object>(obj: T): WeakRef<T>;
    /**
     * Register cleanup callback
     */
    registerCleanup(id: string, callback: () => void): void;
    /**
     * Unregister cleanup callback
     */
    unregisterCleanup(id: string): void;
    /**
     * Force garbage collection (if available)
     */
    forceGC(): void;
    /**
     * Create memory pressure to encourage garbage collection
     */
    private createMemoryPressure;
    /**
     * Perform periodic maintenance
     */
    private performMaintenance;
    /**
     * Get current memory usage estimate
     */
    getCurrentMemoryUsage(): number;
    /**
     * Estimate object size for different types
     */
    private getObjectSize;
    /**
     * Get memory statistics
     */
    getStats(): MemoryStats;
    /**
     * Clear all pools
     */
    clearAllPools(): void;
    /**
     * Set GC threshold
     */
    setGCThreshold(bytes: number): void;
    /**
     * Get pool by name
     */
    getPool(name: string): MemoryPool<any> | undefined;
    /**
     * Check if memory usage is within limits
     */
    isMemoryHealthy(): boolean;
    /**
     * Optimize memory usage
     */
    optimize(): void;
    /**
     * Generate memory report
     */
    generateReport(): {
        summary: string;
        usage: number;
        limit: number;
        pools: Record<string, any>;
        recommendations: string[];
    };
}
//# sourceMappingURL=memory-manager.d.ts.map