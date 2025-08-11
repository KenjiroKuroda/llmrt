/**
 * Build Export Utility
 * Generates optimized builds for different deployment targets
 */
import type { LGFCartridge } from '../types/index.js';
export interface BuildConfig {
    cartridge: LGFCartridge;
    optimization: {
        minify: boolean;
        treeShake: boolean;
        compressAssets: boolean;
        removeUnusedAssets: boolean;
        optimizeImages: boolean;
    };
    target: 'web' | 'mobile' | 'desktop' | 'embed';
    features: {
        includeDebugInfo: boolean;
        includePerformanceMonitor: boolean;
        includeErrorReporting: boolean;
    };
    output: {
        format: 'standalone' | 'library' | 'module';
        bundleAssets: boolean;
        generateSourceMaps: boolean;
    };
}
export interface BuildResult {
    success: boolean;
    files: Map<string, string | Uint8Array>;
    size: number;
    warnings: string[];
    errors: string[];
    optimizations: string[];
    buildTime: number;
}
export declare class BuildExporter {
    private engineCode;
    private moduleCode;
    constructor();
    private loadEngineCode;
    exportBuild(config: BuildConfig): Promise<BuildResult>;
    private validateCartridge;
    private optimizeCartridge;
    private removeUnusedAssets;
    private collectUsedAssets;
    private compressAssets;
    private minifyCartridge;
    private minifyNode;
    private generateBuildFiles;
    private generateHTML;
    private generateStandaloneJS;
    private generateGameJS;
    private generateCSS;
    private generateWebAppManifest;
    private generateServiceWorker;
    private copyAssets;
    private calculateTotalSize;
    private generateOptimizationReport;
    createZipFile(files: Map<string, string | Uint8Array>): Promise<Uint8Array>;
    getDefaultConfig(target?: BuildConfig['target']): BuildConfig;
}
//# sourceMappingURL=build-exporter.d.ts.map