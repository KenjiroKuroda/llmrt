/**
 * Accessibility Manager for the LLM Canvas Engine
 * Handles keyboard navigation, screen reader support, and accessibility features
 */

import { Node, ThemeTokens, Vector2 } from '../types/core.js';
import { InputManager } from './input-manager.js';

export interface AccessibilityOptions {
  enableKeyboardNavigation: boolean;
  enableScreenReader: boolean;
  enableHighContrast: boolean;
  textScaling: number;
  enableFocusIndicators: boolean;
  announceStateChanges: boolean;
}

export interface FocusableElement {
  node: Node;
  element: HTMLElement;
  tabIndex: number;
  ariaLabel: string;
  ariaRole: string;
}

export interface AccessibilityState {
  currentFocus: FocusableElement | null;
  focusableElements: FocusableElement[];
  isHighContrast: boolean;
  textScaling: number;
  screenReaderEnabled: boolean;
}

/**
 * Manages accessibility features including keyboard navigation,
 * screen reader support, and visual accessibility enhancements
 */
export class AccessibilityManager {
  private options: AccessibilityOptions;
  private state: AccessibilityState;
  private canvas: HTMLCanvasElement | null = null;
  private inputManager: InputManager | null = null;
  private ariaLiveRegion: HTMLElement | null = null;
  private focusIndicator: HTMLElement | null = null;
  private originalTheme: ThemeTokens | null = null;
  private highContrastTheme: ThemeTokens | null = null;

  constructor(options: Partial<AccessibilityOptions> = {}) {
    this.options = {
      enableKeyboardNavigation: true,
      enableScreenReader: true,
      enableHighContrast: false,
      textScaling: 1.0,
      enableFocusIndicators: true,
      announceStateChanges: true,
      ...options
    };

    this.state = {
      currentFocus: null,
      focusableElements: [],
      isHighContrast: this.options.enableHighContrast,
      textScaling: this.options.textScaling,
      screenReaderEnabled: this.options.enableScreenReader
    };

    this.setupAccessibilityFeatures();
  }

  /**
   * Initialize accessibility manager with canvas and input manager
   */
  initialize(canvas: HTMLCanvasElement, inputManager: InputManager): void {
    this.canvas = canvas;
    this.inputManager = inputManager;

    this.setupCanvasAccessibility();
    this.setupKeyboardNavigation();
    this.setupScreenReaderSupport();
    this.setupFocusManagement();
  }

  /**
   * Update accessibility state and handle focus management
   */
  update(sceneNodes: Node[]): void {
    if (!this.options.enableKeyboardNavigation) return;

    // Update focusable elements from scene
    this.updateFocusableElements(sceneNodes);

    // Handle keyboard navigation
    this.handleKeyboardNavigation();

    // Update focus indicators
    this.updateFocusIndicators();
  }

  /**
   * Set theme and create high contrast variant
   */
  setTheme(theme: ThemeTokens): void {
    this.originalTheme = theme;
    this.highContrastTheme = this.createHighContrastTheme(theme);

    if (this.state.isHighContrast) {
      this.applyHighContrastTheme();
    }
  }

  /**
   * Toggle high contrast mode
   */
  toggleHighContrast(): ThemeTokens {
    this.state.isHighContrast = !this.state.isHighContrast;
    
    if (this.state.isHighContrast) {
      this.announceToScreenReader('High contrast mode enabled');
      return this.applyHighContrastTheme();
    } else {
      this.announceToScreenReader('High contrast mode disabled');
      return this.originalTheme || this.createDefaultTheme();
    }
  }

  /**
   * Set text scaling factor
   */
  setTextScaling(scale: number): void {
    this.state.textScaling = Math.max(0.5, Math.min(3.0, scale));
    this.announceToScreenReader(`Text scaling set to ${Math.round(this.state.textScaling * 100)}%`);
  }

  /**
   * Get current text scaling factor
   */
  getTextScaling(): number {
    return this.state.textScaling;
  }

  /**
   * Focus on a specific node
   */
  focusNode(nodeId: string): boolean {
    const focusable = this.state.focusableElements.find(el => el.node.id === nodeId);
    if (focusable) {
      this.setFocus(focusable);
      return true;
    }
    return false;
  }

  /**
   * Get currently focused node
   */
  getCurrentFocus(): Node | null {
    return this.state.currentFocus?.node || null;
  }

  /**
   * Announce message to screen reader
   */
  announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
    if (!this.state.screenReaderEnabled || !this.ariaLiveRegion) return;

    this.ariaLiveRegion.setAttribute('aria-live', priority);
    this.ariaLiveRegion.textContent = message;

    // Clear after announcement
    setTimeout(() => {
      if (this.ariaLiveRegion) {
        this.ariaLiveRegion.textContent = '';
      }
    }, 1000);
  }

  /**
   * Get accessibility state for debugging
   */
  getAccessibilityState(): AccessibilityState {
    return { ...this.state };
  }

  /**
   * Cleanup accessibility features
   */
  cleanup(): void {
    if (this.ariaLiveRegion) {
      this.ariaLiveRegion.remove();
      this.ariaLiveRegion = null;
    }

    if (this.focusIndicator) {
      this.focusIndicator.remove();
      this.focusIndicator = null;
    }

    this.state.focusableElements = [];
    this.state.currentFocus = null;
  }

  private setupAccessibilityFeatures(): void {
    // Detect if user prefers reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    // Detect if user prefers high contrast
    const prefersHighContrast = window.matchMedia('(prefers-contrast: high)').matches;
    if (prefersHighContrast) {
      this.options.enableHighContrast = true;
      this.state.isHighContrast = true;
    }

    // Listen for system accessibility changes
    window.matchMedia('(prefers-contrast: high)').addEventListener('change', (e) => {
      if (e.matches && !this.state.isHighContrast) {
        this.state.isHighContrast = true;
        this.applyHighContrastTheme();
      }
    });
  }

  private setupCanvasAccessibility(): void {
    if (!this.canvas) return;

    // Make canvas accessible
    this.canvas.setAttribute('role', 'application');
    this.canvas.setAttribute('aria-label', 'Game Canvas');
    this.canvas.setAttribute('tabindex', '0');

    // Add canvas description
    const canvasDescription = document.createElement('div');
    canvasDescription.id = 'canvas-description';
    canvasDescription.style.position = 'absolute';
    canvasDescription.style.left = '-10000px';
    canvasDescription.textContent = 'Interactive game canvas. Use arrow keys to navigate, Enter to interact, and Tab to cycle through interactive elements.';
    document.body.appendChild(canvasDescription);
    
    this.canvas.setAttribute('aria-describedby', 'canvas-description');
  }

  private setupKeyboardNavigation(): void {
    if (!this.inputManager || !this.options.enableKeyboardNavigation) return;

    // Map accessibility keys
    this.inputManager.mapKey('tab', 'focus_next');
    this.inputManager.mapKey('shift+tab', 'focus_previous');
    this.inputManager.mapKey('enter', 'activate');
    this.inputManager.mapKey('space', 'activate');
    this.inputManager.mapKey('escape', 'cancel');
    this.inputManager.mapKey('home', 'focus_first');
    this.inputManager.mapKey('end', 'focus_last');
    this.inputManager.mapKey('up', 'navigate_up');
    this.inputManager.mapKey('down', 'navigate_down');
    this.inputManager.mapKey('left', 'navigate_left');
    this.inputManager.mapKey('right', 'navigate_right');
  }

  private setupScreenReaderSupport(): void {
    if (!this.options.enableScreenReader) return;

    // Create ARIA live region for announcements
    this.ariaLiveRegion = document.createElement('div');
    this.ariaLiveRegion.setAttribute('aria-live', 'polite');
    this.ariaLiveRegion.setAttribute('aria-atomic', 'true');
    this.ariaLiveRegion.style.position = 'absolute';
    this.ariaLiveRegion.style.left = '-10000px';
    this.ariaLiveRegion.style.width = '1px';
    this.ariaLiveRegion.style.height = '1px';
    this.ariaLiveRegion.style.overflow = 'hidden';
    document.body.appendChild(this.ariaLiveRegion);
  }

  private setupFocusManagement(): void {
    if (!this.options.enableFocusIndicators) return;

    // Create focus indicator element
    this.focusIndicator = document.createElement('div');
    this.focusIndicator.style.position = 'absolute';
    this.focusIndicator.style.border = '2px solid #007acc';
    this.focusIndicator.style.borderRadius = '4px';
    this.focusIndicator.style.pointerEvents = 'none';
    this.focusIndicator.style.zIndex = '1000';
    this.focusIndicator.style.display = 'none';
    this.focusIndicator.setAttribute('aria-hidden', 'true');
    document.body.appendChild(this.focusIndicator);
  }

  private updateFocusableElements(nodes: Node[]): void {
    this.state.focusableElements = [];
    this.collectFocusableElements(nodes, 0);
    
    // Sort by tab index and position
    this.state.focusableElements.sort((a, b) => {
      if (a.tabIndex !== b.tabIndex) {
        return a.tabIndex - b.tabIndex;
      }
      // Sort by position for spatial navigation
      const aPos = a.node.getWorldTransform().position;
      const bPos = b.node.getWorldTransform().position;
      return aPos.y - bPos.y || aPos.x - bPos.x;
    });
  }

  private collectFocusableElements(nodes: Node[], tabIndex: number): void {
    for (const node of nodes) {
      if (this.isFocusable(node)) {
        const element = this.createVirtualElement(node);
        this.state.focusableElements.push({
          node,
          element,
          tabIndex,
          ariaLabel: this.getAriaLabel(node),
          ariaRole: this.getAriaRole(node)
        });
        tabIndex++;
      }

      if (node.children) {
        this.collectFocusableElements(node.children, tabIndex);
      }
    }
  }

  private isFocusable(node: Node): boolean {
    const isWorldVisible = typeof (node as any).isWorldVisible === 'function' 
      ? (node as any).isWorldVisible() 
      : node.visible; // Fallback for plain objects
    
    return node.visible && 
           isWorldVisible && 
           (node.type === 'Button' || 
            node.type === 'Text' && (node as any).interactive ||
            (node as any).focusable === true);
  }

  private createVirtualElement(node: Node): HTMLElement {
    const element = document.createElement('div');
    element.setAttribute('role', this.getAriaRole(node));
    element.setAttribute('aria-label', this.getAriaLabel(node));
    element.style.position = 'absolute';
    element.style.left = '-10000px';
    return element;
  }

  private getAriaLabel(node: Node): string {
    const nodeData = node as any;
    return nodeData.ariaLabel || 
           nodeData.text || 
           nodeData.label || 
           `${node.type} ${node.id}`;
  }

  private getAriaRole(node: Node): string {
    switch (node.type) {
      case 'Button': return 'button';
      case 'Text': return 'text';
      default: return 'generic';
    }
  }

  private handleKeyboardNavigation(): void {
    if (!this.inputManager) return;

    if (this.inputManager.isActionJustPressed('focus_next')) {
      this.focusNext();
    } else if (this.inputManager.isActionJustPressed('focus_previous')) {
      this.focusPrevious();
    } else if (this.inputManager.isActionJustPressed('focus_first')) {
      this.focusFirst();
    } else if (this.inputManager.isActionJustPressed('focus_last')) {
      this.focusLast();
    } else if (this.inputManager.isActionJustPressed('activate')) {
      this.activateCurrentFocus();
    } else if (this.inputManager.isActionJustPressed('cancel')) {
      this.clearFocus();
    }

    // Spatial navigation
    if (this.inputManager.isActionJustPressed('navigate_up')) {
      this.navigateDirection('up');
    } else if (this.inputManager.isActionJustPressed('navigate_down')) {
      this.navigateDirection('down');
    } else if (this.inputManager.isActionJustPressed('navigate_left')) {
      this.navigateDirection('left');
    } else if (this.inputManager.isActionJustPressed('navigate_right')) {
      this.navigateDirection('right');
    }
  }

  private focusNext(): void {
    if (this.state.focusableElements.length === 0) return;

    const currentIndex = this.getCurrentFocusIndex();
    const nextIndex = (currentIndex + 1) % this.state.focusableElements.length;
    this.setFocus(this.state.focusableElements[nextIndex]);
  }

  private focusPrevious(): void {
    if (this.state.focusableElements.length === 0) return;

    const currentIndex = this.getCurrentFocusIndex();
    const prevIndex = currentIndex === 0 ? 
      this.state.focusableElements.length - 1 : 
      currentIndex - 1;
    this.setFocus(this.state.focusableElements[prevIndex]);
  }

  private focusFirst(): void {
    if (this.state.focusableElements.length > 0) {
      this.setFocus(this.state.focusableElements[0]);
    }
  }

  private focusLast(): void {
    if (this.state.focusableElements.length > 0) {
      this.setFocus(this.state.focusableElements[this.state.focusableElements.length - 1]);
    }
  }

  private navigateDirection(direction: 'up' | 'down' | 'left' | 'right'): void {
    if (!this.state.currentFocus) {
      this.focusFirst();
      return;
    }

    const currentPos = this.state.currentFocus.node.getWorldTransform().position;
    let bestCandidate: FocusableElement | null = null;
    let bestDistance = Infinity;

    for (const element of this.state.focusableElements) {
      if (element === this.state.currentFocus) continue;

      const pos = element.node.getWorldTransform().position;
      const dx = pos.x - currentPos.x;
      const dy = pos.y - currentPos.y;

      // Check if element is in the correct direction
      let isInDirection = false;
      switch (direction) {
        case 'up': isInDirection = dy < -10; break;
        case 'down': isInDirection = dy > 10; break;
        case 'left': isInDirection = dx < -10; break;
        case 'right': isInDirection = dx > 10; break;
      }

      if (isInDirection) {
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestCandidate = element;
        }
      }
    }

    if (bestCandidate) {
      this.setFocus(bestCandidate);
    }
  }

  private getCurrentFocusIndex(): number {
    if (!this.state.currentFocus) return -1;
    return this.state.focusableElements.indexOf(this.state.currentFocus);
  }

  private setFocus(element: FocusableElement): void {
    this.state.currentFocus = element;
    
    // Announce focus change to screen reader
    if (this.options.announceStateChanges && element) {
      this.announceToScreenReader(`Focused on ${element.ariaLabel}`);
    }

    // Update visual focus indicator
    this.updateFocusIndicators();
  }

  private clearFocus(): void {
    this.state.currentFocus = null;
    this.updateFocusIndicators();
  }

  private activateCurrentFocus(): void {
    if (!this.state.currentFocus) return;

    const node = this.state.currentFocus.node;
    
    // Trigger node activation (simulate click/tap)
    if (node.type === 'Button') {
      this.announceToScreenReader(`Activated ${this.state.currentFocus.ariaLabel}`);
      // TODO: Trigger button action
    }
  }

  private updateFocusIndicators(): void {
    if (!this.focusIndicator || !this.canvas) return;

    if (!this.state.currentFocus) {
      this.focusIndicator.style.display = 'none';
      return;
    }

    // Calculate focus indicator position
    const node = this.state.currentFocus.node;
    const transform = typeof (node as any).getWorldTransform === 'function' 
      ? (node as any).getWorldTransform() 
      : node.transform; // Fallback to local transform for plain objects
    const canvasRect = this.canvas.getBoundingClientRect();
    
    // Convert world position to screen position
    // This is simplified - in a full implementation, this would use the renderer's coordinate conversion
    const screenX = canvasRect.left + transform.position.x;
    const screenY = canvasRect.top + transform.position.y;
    
    // Position and show focus indicator
    this.focusIndicator.style.left = `${screenX - 25}px`;
    this.focusIndicator.style.top = `${screenY - 25}px`;
    this.focusIndicator.style.width = '50px';
    this.focusIndicator.style.height = '50px';
    this.focusIndicator.style.display = 'block';
  }

  private createHighContrastTheme(originalTheme: ThemeTokens): ThemeTokens {
    return {
      colors: {
        primary: '#ffffff',
        secondary: '#000000',
        background: '#000000',
        text: '#ffffff',
        accent: '#ffff00'
      },
      font: {
        ...originalTheme.font,
        sizes: Object.fromEntries(
          Object.entries(originalTheme.font.sizes).map(([key, size]) => [
            key, 
            Math.round(size * this.state.textScaling)
          ])
        )
      },
      spacing: originalTheme.spacing,
      radii: originalTheme.radii
    };
  }

  private applyHighContrastTheme(): ThemeTokens {
    // Always recreate to apply current text scaling
    this.highContrastTheme = this.createHighContrastTheme(
      this.originalTheme || this.createDefaultTheme()
    );
    return this.highContrastTheme;
  }

  private createDefaultTheme(): ThemeTokens {
    return {
      colors: {
        primary: '#007acc',
        secondary: '#666666',
        background: '#ffffff',
        text: '#000000',
        accent: '#ff6600'
      },
      font: {
        family: 'Arial, sans-serif',
        sizes: {
          small: 12,
          medium: 16,
          large: 24
        }
      },
      spacing: {
        small: 4,
        medium: 8,
        large: 16
      },
      radii: {
        small: 2,
        medium: 4,
        large: 8
      }
    };
  }
}