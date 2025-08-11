/**
 * Build optimization system for tree-shaking and platform-specific builds
 */

export interface BuildTarget {
  name: string;
  platform: 'desktop' | 'mobile' | 'web' | 'universal';
  maxSize: number; // KB
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
  size: number; // KB
  dependencies: string[];
  optional: boolean;
  platforms: string[];
}

export class BuildOptimizer {
  // Core modules that are always included
  // private static readonly CORE_MODULES = [
  //   'engine', 'scene-tree', 'game-loop', 'renderer', 
  //   'input-manager', 'audio-manager', 'action-system'
  // ];

  private static readonly OPTIONAL_MODULES: ModuleDependency[] = [
    {
      name: 'mode7',
      size: 3.2,
      dependencies: ['renderer'],
      optional: true,
      platforms: ['desktop', 'web', 'universal']
    },
    {
      name: 'raycast',
      size: 4.1,
      dependencies: ['renderer'],
      optional: true,
      platforms: ['desktop', 'web', 'universal']
    },
    {
      name: 'iso',
      size: 2.8,
      dependencies: ['renderer'],
      optional: true,
      platforms: ['desktop', 'mobile', 'web', 'universal']
    },
    {
      name: 'postfx',
      size: 2.5,
      dependencies: ['renderer'],
      optional: true,
      platforms: ['desktop', 'web', 'universal']
    },
    {
      name: 'particles',
      size: 1.9,
      dependencies: ['renderer'],
      optional: true,
      platforms: ['desktop', 'mobile', 'web', 'universal']
    },
    {
      name: 'playground',
      size: 5.2,
      dependencies: ['engine'],
      optional: true,
      platforms: ['web', 'universal']
    }
  ];

  private static readonly BUILD_TARGETS: Record<string, BuildTarget> = {
    'mobile-minimal': {
      name: 'mobile-minimal',
      platform: 'mobile',
      maxSize: 12,
      features: ['core', 'particles'],
      optimizations: {
        minify: true,
        treeshake: true,
        deadCodeElimination: true,
        inlineConstants: true,
        removeDebugCode: true,
        compressAssets: true
      }
    },
    'desktop-full': {
      name: 'desktop-full',
      platform: 'desktop',
      maxSize: 20,
      features: ['core', 'mode7', 'raycast', 'iso', 'postfx', 'particles'],
      optimizations: {
        minify: true,
        treeshake: true,
        deadCodeElimination: true,
        inlineConstants: false,
        removeDebugCode: false,
        compressAssets: false
      }
    },
    'web-standard': {
      name: 'web-standard',
      platform: 'web',
      maxSize: 16,
      features: ['core', 'mode7', 'particles', 'playground'],
      optimizations: {
        minify: true,
        treeshake: true,
        deadCodeElimination: true,
        inlineConstants: true,
        removeDebugCode: true,
        compressAssets: true
      }
    }
  };

  /**
   * Calculate the estimated size of a build configuration
   */
  static calculateBuildSize(features: string[]): number {
    const coreSize = 8.5; // KB - estimated core engine size
    
    const moduleSize = this.OPTIONAL_MODULES
      .filter(module => features.includes(module.name))
      .reduce((total, module) => total + module.size, 0);

    return coreSize + moduleSize;
  }

  /**
   * Validate that a build configuration meets size requirements
   */
  static validateBuildSize(target: BuildTarget): { valid: boolean; actualSize: number; message?: string } {
    const actualSize = this.calculateBuildSize(target.features);
    
    if (actualSize > target.maxSize) {
      return {
        valid: false,
        actualSize,
        message: `Build size ${actualSize.toFixed(1)}KB exceeds target ${target.maxSize}KB`
      };
    }

    return { valid: true, actualSize };
  }

  /**
   * Get optimal module configuration for a target platform
   */
  static getOptimalConfiguration(platform: string, maxSize: number): string[] {
    const availableModules = this.OPTIONAL_MODULES
      .filter(module => module.platforms.includes(platform) || module.platforms.includes('universal'))
      .sort((a, b) => a.size - b.size); // Sort by size, smallest first

    const selectedModules: string[] = ['core'];
    let currentSize = 8.5; // Core size

    for (const module of availableModules) {
      if (currentSize + module.size <= maxSize) {
        selectedModules.push(module.name);
        currentSize += module.size;
      }
    }

    return selectedModules;
  }

  /**
   * Generate rollup configuration for tree-shaking
   */
  static generateRollupConfig(target: BuildTarget): any {
    const external = this.OPTIONAL_MODULES
      .filter(module => !target.features.includes(module.name))
      .map(module => `./modules/${module.name}.js`);

    return {
      treeshake: {
        moduleSideEffects: false,
        propertyReadSideEffects: false,
        unknownGlobalSideEffects: false,
        pureExternalModules: true
      },
      external,
      plugins: this.generatePlugins(target.optimizations)
    };
  }

  /**
   * Generate build plugins based on optimization level
   */
  private static generatePlugins(optimizations: OptimizationLevel): any[] {
    const plugins: any[] = [];

    if (optimizations.treeshake) {
      plugins.push({
        name: 'tree-shake-unused-exports',
        generateBundle() {
          // Custom tree-shaking logic would go here
          console.log('Tree-shaking unused exports...');
        }
      });
    }

    if (optimizations.deadCodeElimination) {
      plugins.push({
        name: 'dead-code-elimination',
        transform(code: string) {
          // Remove debug code and unused branches
          if (optimizations.removeDebugCode) {
            code = code.replace(/console\.(log|debug|info)\([^)]*\);?/g, '');
            code = code.replace(/\/\*\s*DEBUG\s*\*\/[\s\S]*?\/\*\s*\/DEBUG\s*\*\//g, '');
          }
          return code;
        }
      });
    }

    if (optimizations.inlineConstants) {
      plugins.push({
        name: 'inline-constants',
        transform(code: string) {
          // Inline compile-time constants
          code = code.replace(/const\s+DEBUG\s*=\s*true/g, 'const DEBUG = false');
          code = code.replace(/const\s+DEVELOPMENT\s*=\s*true/g, 'const DEVELOPMENT = false');
          return code;
        }
      });
    }

    return plugins;
  }

  /**
   * Get predefined build target
   */
  static getBuildTarget(name: string): BuildTarget | undefined {
    return this.BUILD_TARGETS[name];
  }

  /**
   * Get all available build targets
   */
  static getAvailableTargets(): BuildTarget[] {
    return Object.values(this.BUILD_TARGETS);
  }

  /**
   * Create custom build target
   */
  static createCustomTarget(
    name: string,
    platform: BuildTarget['platform'],
    maxSize: number,
    features: string[],
    optimizations: Partial<OptimizationLevel> = {}
  ): BuildTarget {
    const defaultOptimizations: OptimizationLevel = {
      minify: true,
      treeshake: true,
      deadCodeElimination: true,
      inlineConstants: true,
      removeDebugCode: true,
      compressAssets: true
    };

    return {
      name,
      platform,
      maxSize,
      features,
      optimizations: { ...defaultOptimizations, ...optimizations }
    };
  }

  /**
   * Analyze module dependencies and suggest optimizations
   */
  static analyzeDependencies(features: string[]): {
    dependencies: string[];
    conflicts: string[];
    suggestions: string[];
  } {
    const dependencies: string[] = [];
    const conflicts: string[] = [];
    const suggestions: string[] = [];

    // Check dependencies
    for (const feature of features) {
      const module = this.OPTIONAL_MODULES.find(m => m.name === feature);
      if (module) {
        dependencies.push(...module.dependencies);
      }
    }

    // Check for conflicts (modules that don't work well together)
    if (features.includes('mode7') && features.includes('raycast')) {
      conflicts.push('Mode7 and Raycast modules may conflict in rendering pipeline');
    }

    // Generate suggestions
    const totalSize = this.calculateBuildSize(features);
    if (totalSize > 15) {
      suggestions.push('Consider removing some modules to reduce bundle size');
    }

    if (!features.includes('particles') && features.length > 2) {
      suggestions.push('Particles module is lightweight and adds visual appeal');
    }

    return {
      dependencies: [...new Set(dependencies)],
      conflicts,
      suggestions
    };
  }
}