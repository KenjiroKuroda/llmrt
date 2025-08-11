/**
 * Scene tree system for hierarchical node management
 */

import { Node, NodeType, Transform2D } from '../types/core.js';
import { Action, Trigger } from '../types/actions.js';

/**
 * Base Node implementation with transform, visibility, and hierarchy support
 */
export class NodeImpl implements Node {
  public id: string;
  public type: NodeType;
  public transform: Transform2D;
  public visible: boolean;
  public children: Node[];
  public actions: Action[];
  public triggers: Trigger[];
  public parent: Node | null = null;

  constructor(id: string, type: NodeType) {
    this.id = id;
    this.type = type;
    this.transform = {
      position: { x: 0, y: 0 },
      scale: { x: 1, y: 1 },
      rotation: 0,
      skew: { x: 0, y: 0 },
      alpha: 1
    };
    this.visible = true;
    this.children = [];
    this.actions = [];
    this.triggers = [];
  }

  /**
   * Add a child node to this node
   */
  addChild(child: Node): void {
    if (child === this) {
      throw new Error('Cannot add node as child of itself');
    }

    // Check for circular reference
    if (this.isDescendantOf(child)) {
      throw new Error('Cannot add ancestor as child (circular reference)');
    }

    // Remove from previous parent if any
    if ((child as NodeImpl).parent) {
      (child as NodeImpl).parent!.removeChild(child);
    }

    this.children.push(child);
    (child as NodeImpl).parent = this;
  }

  /**
   * Remove a child node from this node
   */
  removeChild(child: Node): boolean {
    const index = this.children.indexOf(child);
    if (index === -1) {
      return false;
    }

    this.children.splice(index, 1);
    (child as NodeImpl).parent = null;
    return true;
  }

  /**
   * Remove this node from its parent
   */
  removeFromParent(): boolean {
    if (!this.parent) {
      return false;
    }

    return this.parent.removeChild(this);
  }

  /**
   * Check if this node is a descendant of the given node
   */
  private isDescendantOf(node: Node): boolean {
    let current = this.parent;
    while (current) {
      if (current === node) {
        return true;
      }
      current = (current as NodeImpl).parent;
    }
    return false;
  }

  /**
   * Get the root node of the tree
   */
  getRoot(): Node {
    let current: Node = this;
    while ((current as NodeImpl).parent) {
      current = (current as NodeImpl).parent!;
    }
    return current;
  }

  /**
   * Get the depth of this node in the tree (root = 0)
   */
  getDepth(): number {
    let depth = 0;
    let current = this.parent;
    while (current) {
      depth++;
      current = (current as NodeImpl).parent;
    }
    return depth;
  }

  /**
   * Get world transform by combining with parent transforms
   */
  getWorldTransform(): Transform2D {
    if (!this.parent) {
      return { ...this.transform };
    }

    const parentWorld = (this.parent as NodeImpl).getWorldTransform();
    
    // Combine transforms (simplified - in a real engine this would use matrices)
    return {
      position: {
        x: parentWorld.position.x + this.transform.position.x * parentWorld.scale.x,
        y: parentWorld.position.y + this.transform.position.y * parentWorld.scale.y
      },
      scale: {
        x: parentWorld.scale.x * this.transform.scale.x,
        y: parentWorld.scale.y * this.transform.scale.y
      },
      rotation: parentWorld.rotation + this.transform.rotation,
      skew: {
        x: parentWorld.skew.x + this.transform.skew.x,
        y: parentWorld.skew.y + this.transform.skew.y
      },
      alpha: parentWorld.alpha * this.transform.alpha
    };
  }

  /**
   * Check if this node is visible in the world (considering parent visibility)
   */
  isWorldVisible(): boolean {
    if (!this.visible) {
      return false;
    }

    let current = this.parent;
    while (current) {
      if (!current.visible) {
        return false;
      }
      current = (current as NodeImpl).parent;
    }
    return true;
  }
}

/**
 * Scene tree manager for node operations
 */
export class SceneTree {
  private root: Node;
  private nodeMap = new Map<string, Node>();

  constructor(root: Node) {
    this.root = root;
    this.buildNodeMap(root);
  }

  /**
   * Get the root node of the scene
   */
  getRoot(): Node {
    return this.root;
  }

  /**
   * Add a node to the scene tree under the specified parent
   */
  addNode(node: Node, parentId?: string): void {
    const parent = parentId ? this.findNode(parentId) : this.root;
    if (!parent) {
      throw new Error(`Parent node with id '${parentId}' not found`);
    }

    // Check for duplicate IDs
    if (this.nodeMap.has(node.id)) {
      throw new Error(`Node with id '${node.id}' already exists in scene`);
    }

    parent.addChild(node);
    this.addToNodeMap(node);
  }

  /**
   * Remove a node from the scene tree
   */
  removeNode(nodeId: string): boolean {
    const node = this.findNode(nodeId);
    if (!node) {
      return false;
    }

    // Remove from parent
    const removed = (node as NodeImpl).removeFromParent();
    if (removed) {
      this.removeFromNodeMap(node);
    }

    return removed;
  }

  /**
   * Find a node by its ID
   */
  findNode(nodeId: string): Node | null {
    return this.nodeMap.get(nodeId) || null;
  }

  /**
   * Find nodes by type
   */
  findNodesByType(nodeType: NodeType): Node[] {
    const results: Node[] = [];
    this.traverseNodes(this.root, (node) => {
      if (node.type === nodeType) {
        results.push(node);
      }
    });
    return results;
  }

  /**
   * Get all nodes in the scene
   */
  getAllNodes(): Node[] {
    return Array.from(this.nodeMap.values());
  }

  /**
   * Traverse all nodes in the tree with a callback
   */
  traverseNodes(startNode: Node, callback: (node: Node) => void): void {
    callback(startNode);
    for (const child of startNode.children) {
      this.traverseNodes(child, callback);
    }
  }

  /**
   * Get visible nodes for rendering (depth-first traversal)
   */
  getVisibleNodes(): Node[] {
    const visibleNodes: Node[] = [];
    this.collectVisibleNodes(this.root, visibleNodes);
    return visibleNodes;
  }

  private collectVisibleNodes(node: Node, result: Node[]): void {
    if (node.visible) {
      result.push(node);
      for (const child of node.children) {
        this.collectVisibleNodes(child, result);
      }
    }
  }

  /**
   * Build internal node map for fast lookups
   */
  private buildNodeMap(node: Node): void {
    this.nodeMap.set(node.id, node);
    for (const child of node.children) {
      this.buildNodeMap(child);
    }
  }

  /**
   * Add node and its children to the node map
   */
  private addToNodeMap(node: Node): void {
    this.nodeMap.set(node.id, node);
    for (const child of node.children) {
      this.addToNodeMap(child);
    }
  }

  /**
   * Remove node and its children from the node map
   */
  private removeFromNodeMap(node: Node): void {
    this.nodeMap.delete(node.id);
    for (const child of node.children) {
      this.removeFromNodeMap(child);
    }
  }
}

/**
 * Factory functions for creating core node types
 */
export class NodeFactory {
  /**
   * Create a Group node (container for other nodes)
   */
  static createGroup(id: string): Node {
    return new NodeImpl(id, 'Group');
  }

  /**
   * Create a Sprite node for image rendering
   */
  static createSprite(id: string, spriteId?: string): Node {
    const node = new NodeImpl(id, 'Sprite');
    if (spriteId) {
      // Store sprite reference in a way that can be accessed by renderer
      (node as any).spriteId = spriteId;
    }
    return node;
  }

  /**
   * Create a Text node for text rendering
   */
  static createText(id: string, text?: string): Node {
    const node = new NodeImpl(id, 'Text');
    if (text !== undefined) {
      (node as any).text = text;
    }
    return node;
  }

  /**
   * Create a Button node for interactive elements
   */
  static createButton(id: string, text?: string): Node {
    const node = new NodeImpl(id, 'Button');
    if (text !== undefined) {
      (node as any).text = text;
    }
    return node;
  }

  /**
   * Create a Camera2D node for viewport control
   */
  static createCamera2D(id: string): Node {
    const node = new NodeImpl(id, 'Camera2D');
    // Initialize camera-specific properties
    (node as any).zoom = 1;
    (node as any).target = { x: 0, y: 0 };
    return node;
  }
}