/**
 * Build optimization system for tree-shaking and platform-specific builds
 */
export interface BuildTarget {
    name: string;
    platform: 'desktop' | 'mobile' | 'web' | 'universal';
    maxSize: number;
    features: string[];
    optimizations: OptimizationLevel;
}
export interface OptimizationLevel {
    minify: boolean;
    treeshake: boolean;
    deadCodeElimination: boolean;
    inlineConstants: boolean;
    removeDebugCode: boolean;
    compressAssets: boolean;
}
export interface ModuleDependency {
    name: string;
    size: number;
    dependencies: string[];
    optional: boolean;
    platforms: string[];
}
export declare class BuildOptimizer {
    private static readonly OPTIONAL_MODULES;
    private static readonly BUILD_TARGETS;
    /**
     * Calculate the estimated size of a build configuration
     */
    static calculateBuildSize(features: string[]): number;
    /**
     * Validate that a build configuration meets size requirements
     */
    static validateBuildSize(target: BuildTarget): {
        valid: boolean;
        actualSize: number;
        message?: string;
    };
    /**
     * Get optimal module configuration for a target platform
     */
    static getOptimalConfiguration(platform: string, maxSize: number): string[];
    /**
     * Generate rollup configuration for tree-shaking
     */
    static generateRollupConfig(target: BuildTarget): any;
    /**
     * Generate build plugins based on optimization level
     */
    private static generatePlugins;
    /**
     * Get predefined build target
     */
    static getBuildTarget(name: string): BuildTarget | undefined;
    /**
     * Get all available build targets
     */
    static getAvailableTargets(): BuildTarget[];
    /**
     * Create custom build target
     */
    static createCustomTarget(name: string, platform: BuildTarget['platform'], maxSize: number, features: string[], optimizations?: Partial<OptimizationLevel>): BuildTarget;
    /**
     * Analyze module dependencies and suggest optimizations
     */
    static analyzeDependencies(features: string[]): {
        dependencies: string[];
        conflicts: string[];
        suggestions: string[];
    };
}
//# sourceMappingURL=build-optimizer.d.ts.map