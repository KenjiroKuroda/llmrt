/**
 * LGF Cartridge Validation System
 * Provides schema validation with actionable error messages
 */
export interface ValidationError {
    path: string;
    message: string;
    suggestion?: string;
    code: string;
}
export interface ValidationWarning {
    path: string;
    message: string;
    suggestion?: string;
}
export interface ValidationResult {
    valid: boolean;
    errors: ValidationError[];
    warnings: ValidationWarning[];
}
/**
 * Simple JSON Schema validator implementation
 * Focused on LGF schema validation with actionable error messages
 */
export declare class LGFValidator {
    constructor();
    /**
     * Validate a cartridge against the LGF schema
     */
    validate(cartridge: any): ValidationResult;
    private validateStructure;
    private validateMetadata;
    private validateTheme;
    private validateScenes;
    private validateNode;
    private validateTransform;
    private validateVector2;
    private validateAction;
    private validateTrigger;
    private validateAssets;
    private validateVariables;
    private validateSemantics;
    private isValidColor;
}
/**
 * Convenience function to validate a cartridge
 */
export declare function validateCartridge(cartridge: any): ValidationResult;
//# sourceMappingURL=validator.d.ts.map