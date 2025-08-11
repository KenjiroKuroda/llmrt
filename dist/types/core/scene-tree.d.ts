/**
 * Scene tree system for hierarchical node management
 */
import { Node, NodeType, Transform2D } from '../types/core.js';
import { Action, Trigger } from '../types/actions.js';
/**
 * Base Node implementation with transform, visibility, and hierarchy support
 */
export declare class NodeImpl implements Node {
    id: string;
    type: NodeType;
    transform: Transform2D;
    visible: boolean;
    children: Node[];
    actions: Action[];
    triggers: Trigger[];
    parent: Node | null;
    constructor(id: string, type: NodeType);
    /**
     * Add a child node to this node
     */
    addChild(child: Node): void;
    /**
     * Remove a child node from this node
     */
    removeChild(child: Node): boolean;
    /**
     * Remove this node from its parent
     */
    removeFromParent(): boolean;
    /**
     * Check if this node is a descendant of the given node
     */
    private isDescendantOf;
    /**
     * Get the root node of the tree
     */
    getRoot(): Node;
    /**
     * Get the depth of this node in the tree (root = 0)
     */
    getDepth(): number;
    /**
     * Get world transform by combining with parent transforms
     */
    getWorldTransform(): Transform2D;
    /**
     * Check if this node is visible in the world (considering parent visibility)
     */
    isWorldVisible(): boolean;
}
/**
 * Scene tree manager for node operations
 */
export declare class SceneTree {
    private root;
    private nodeMap;
    constructor(root: Node);
    /**
     * Get the root node of the scene
     */
    getRoot(): Node;
    /**
     * Add a node to the scene tree under the specified parent
     */
    addNode(node: Node, parentId?: string): void;
    /**
     * Remove a node from the scene tree
     */
    removeNode(nodeId: string): boolean;
    /**
     * Find a node by its ID
     */
    findNode(nodeId: string): Node | null;
    /**
     * Find nodes by type
     */
    findNodesByType(nodeType: NodeType): Node[];
    /**
     * Get all nodes in the scene
     */
    getAllNodes(): Node[];
    /**
     * Traverse all nodes in the tree with a callback
     */
    traverseNodes(startNode: Node, callback: (node: Node) => void): void;
    /**
     * Get visible nodes for rendering (depth-first traversal)
     */
    getVisibleNodes(): Node[];
    private collectVisibleNodes;
    /**
     * Build internal node map for fast lookups
     */
    private buildNodeMap;
    /**
     * Add node and its children to the node map
     */
    private addToNodeMap;
    /**
     * Remove node and its children from the node map
     */
    private removeFromNodeMap;
}
/**
 * Factory functions for creating core node types
 */
export declare class NodeFactory {
    /**
     * Create a Group node (container for other nodes)
     */
    static createGroup(id: string): Node;
    /**
     * Create a Sprite node for image rendering
     */
    static createSprite(id: string, spriteId?: string): Node;
    /**
     * Create a Text node for text rendering
     */
    static createText(id: string, text?: string): Node;
    /**
     * Create a Button node for interactive elements
     */
    static createButton(id: string, text?: string): Node;
    /**
     * Create a Camera2D node for viewport control
     */
    static createCamera2D(id: string): Node;
}
//# sourceMappingURL=scene-tree.d.ts.map