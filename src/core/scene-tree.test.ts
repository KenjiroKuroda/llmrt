/**
 * Unit tests for the scene tree system
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { NodeImpl, SceneTree, NodeFactory } from './scene-tree.js';
import { Node, NodeType } from '../types/core.js';

describe('NodeImpl', () => {
  let node: NodeImpl;

  beforeEach(() => {
    node = new NodeImpl('test-node', 'Group');
  });

  describe('constructor', () => {
    it('should initialize with correct default values', () => {
      expect(node.id).toBe('test-node');
      expect(node.type).toBe('Group');
      expect(node.visible).toBe(true);
      expect(node.children).toEqual([]);
      expect(node.actions).toEqual([]);
      expect(node.triggers).toEqual([]);
      expect(node.parent).toBeNull();
    });

    it('should initialize transform with default values', () => {
      expect(node.transform.position).toEqual({ x: 0, y: 0 });
      expect(node.transform.scale).toEqual({ x: 1, y: 1 });
      expect(node.transform.rotation).toBe(0);
      expect(node.transform.skew).toEqual({ x: 0, y: 0 });
      expect(node.transform.alpha).toBe(1);
    });
  });

  describe('addChild', () => {
    it('should add child node correctly', () => {
      const child = new NodeImpl('child', 'Sprite');
      node.addChild(child);

      expect(node.children).toContain(child);
      expect(child.parent).toBe(node);
    });

    it('should prevent adding node as child of itself', () => {
      expect(() => node.addChild(node)).toThrow('Cannot add node as child of itself');
    });

    it('should prevent circular references', () => {
      const child = new NodeImpl('child', 'Sprite');
      const grandchild = new NodeImpl('grandchild', 'Text');
      
      node.addChild(child);
      child.addChild(grandchild);

      expect(() => grandchild.addChild(node)).toThrow('Cannot add ancestor as child (circular reference)');
    });

    it('should remove child from previous parent when adding to new parent', () => {
      const parent1 = new NodeImpl('parent1', 'Group');
      const parent2 = new NodeImpl('parent2', 'Group');
      const child = new NodeImpl('child', 'Sprite');

      parent1.addChild(child);
      expect(parent1.children).toContain(child);
      expect(child.parent).toBe(parent1);

      parent2.addChild(child);
      expect(parent1.children).not.toContain(child);
      expect(parent2.children).toContain(child);
      expect(child.parent).toBe(parent2);
    });
  });

  describe('removeChild', () => {
    it('should remove child node correctly', () => {
      const child = new NodeImpl('child', 'Sprite');
      node.addChild(child);

      const removed = node.removeChild(child);
      expect(removed).toBe(true);
      expect(node.children).not.toContain(child);
      expect(child.parent).toBeNull();
    });

    it('should return false when removing non-existent child', () => {
      const child = new NodeImpl('child', 'Sprite');
      const removed = node.removeChild(child);
      expect(removed).toBe(false);
    });
  });

  describe('removeFromParent', () => {
    it('should remove node from its parent', () => {
      const parent = new NodeImpl('parent', 'Group');
      const child = new NodeImpl('child', 'Sprite');
      
      parent.addChild(child);
      const removed = child.removeFromParent();

      expect(removed).toBe(true);
      expect(parent.children).not.toContain(child);
      expect(child.parent).toBeNull();
    });

    it('should return false when node has no parent', () => {
      const removed = node.removeFromParent();
      expect(removed).toBe(false);
    });
  });

  describe('getRoot', () => {
    it('should return itself when node is root', () => {
      expect(node.getRoot()).toBe(node);
    });

    it('should return root node when node has parents', () => {
      const root = new NodeImpl('root', 'Group');
      const child = new NodeImpl('child', 'Sprite');
      const grandchild = new NodeImpl('grandchild', 'Text');

      root.addChild(child);
      child.addChild(grandchild);

      expect(grandchild.getRoot()).toBe(root);
      expect(child.getRoot()).toBe(root);
    });
  });

  describe('getDepth', () => {
    it('should return 0 for root node', () => {
      expect(node.getDepth()).toBe(0);
    });

    it('should return correct depth for nested nodes', () => {
      const child = new NodeImpl('child', 'Sprite');
      const grandchild = new NodeImpl('grandchild', 'Text');

      node.addChild(child);
      child.addChild(grandchild);

      expect(child.getDepth()).toBe(1);
      expect(grandchild.getDepth()).toBe(2);
    });
  });

  describe('getWorldTransform', () => {
    it('should return local transform for root node', () => {
      node.transform.position = { x: 10, y: 20 };
      node.transform.scale = { x: 2, y: 3 };
      node.transform.rotation = 45;

      const worldTransform = node.getWorldTransform();
      expect(worldTransform.position).toEqual({ x: 10, y: 20 });
      expect(worldTransform.scale).toEqual({ x: 2, y: 3 });
      expect(worldTransform.rotation).toBe(45);
    });

    it('should combine transforms with parent', () => {
      const child = new NodeImpl('child', 'Sprite');
      
      node.transform.position = { x: 10, y: 20 };
      node.transform.scale = { x: 2, y: 2 };
      node.transform.rotation = 30;

      child.transform.position = { x: 5, y: 10 };
      child.transform.scale = { x: 0.5, y: 0.5 };
      child.transform.rotation = 15;

      node.addChild(child);

      const worldTransform = child.getWorldTransform();
      expect(worldTransform.position).toEqual({ x: 20, y: 40 }); // 10 + 5*2, 20 + 10*2
      expect(worldTransform.scale).toEqual({ x: 1, y: 1 }); // 2 * 0.5, 2 * 0.5
      expect(worldTransform.rotation).toBe(45); // 30 + 15
    });
  });

  describe('isWorldVisible', () => {
    it('should return true for visible node with no parent', () => {
      expect(node.isWorldVisible()).toBe(true);
    });

    it('should return false for invisible node', () => {
      node.visible = false;
      expect(node.isWorldVisible()).toBe(false);
    });

    it('should return false when parent is invisible', () => {
      const child = new NodeImpl('child', 'Sprite');
      node.addChild(child);
      
      node.visible = false;
      expect(child.isWorldVisible()).toBe(false);
    });

    it('should return true when all ancestors are visible', () => {
      const child = new NodeImpl('child', 'Sprite');
      const grandchild = new NodeImpl('grandchild', 'Text');
      
      node.addChild(child);
      child.addChild(grandchild);

      expect(grandchild.isWorldVisible()).toBe(true);
    });
  });
});

describe('SceneTree', () => {
  let root: Node;
  let sceneTree: SceneTree;

  beforeEach(() => {
    root = new NodeImpl('root', 'Group');
    sceneTree = new SceneTree(root);
  });

  describe('constructor', () => {
    it('should initialize with root node', () => {
      expect(sceneTree.getRoot()).toBe(root);
    });

    it('should build node map from existing tree', () => {
      const child = new NodeImpl('child', 'Sprite');
      root.addChild(child);
      
      const newSceneTree = new SceneTree(root);
      expect(newSceneTree.findNode('root')).toBe(root);
      expect(newSceneTree.findNode('child')).toBe(child);
    });
  });

  describe('addNode', () => {
    it('should add node to root when no parent specified', () => {
      const node = new NodeImpl('test', 'Sprite');
      sceneTree.addNode(node);

      expect(root.children).toContain(node);
      expect(sceneTree.findNode('test')).toBe(node);
    });

    it('should add node to specified parent', () => {
      const parent = new NodeImpl('parent', 'Group');
      const child = new NodeImpl('child', 'Sprite');
      
      sceneTree.addNode(parent);
      sceneTree.addNode(child, 'parent');

      expect(parent.children).toContain(child);
      expect(sceneTree.findNode('child')).toBe(child);
    });

    it('should throw error when parent not found', () => {
      const node = new NodeImpl('test', 'Sprite');
      expect(() => sceneTree.addNode(node, 'nonexistent')).toThrow("Parent node with id 'nonexistent' not found");
    });

    it('should throw error when node ID already exists', () => {
      const node1 = new NodeImpl('duplicate', 'Sprite');
      const node2 = new NodeImpl('duplicate', 'Text');
      
      sceneTree.addNode(node1);
      expect(() => sceneTree.addNode(node2)).toThrow("Node with id 'duplicate' already exists in scene");
    });
  });

  describe('removeNode', () => {
    it('should remove node from scene tree', () => {
      const node = new NodeImpl('test', 'Sprite');
      sceneTree.addNode(node);

      const removed = sceneTree.removeNode('test');
      expect(removed).toBe(true);
      expect(root.children).not.toContain(node);
      expect(sceneTree.findNode('test')).toBeNull();
    });

    it('should return false when node not found', () => {
      const removed = sceneTree.removeNode('nonexistent');
      expect(removed).toBe(false);
    });

    it('should remove node and all its children from node map', () => {
      const parent = new NodeImpl('parent', 'Group');
      const child = new NodeImpl('child', 'Sprite');
      
      sceneTree.addNode(parent);
      sceneTree.addNode(child, 'parent');

      sceneTree.removeNode('parent');
      expect(sceneTree.findNode('parent')).toBeNull();
      expect(sceneTree.findNode('child')).toBeNull();
    });
  });

  describe('findNode', () => {
    it('should find node by ID', () => {
      const node = new NodeImpl('test', 'Sprite');
      sceneTree.addNode(node);

      expect(sceneTree.findNode('test')).toBe(node);
    });

    it('should return null for non-existent node', () => {
      expect(sceneTree.findNode('nonexistent')).toBeNull();
    });
  });

  describe('findNodesByType', () => {
    it('should find all nodes of specified type', () => {
      const sprite1 = new NodeImpl('sprite1', 'Sprite');
      const sprite2 = new NodeImpl('sprite2', 'Sprite');
      const text = new NodeImpl('text', 'Text');
      
      sceneTree.addNode(sprite1);
      sceneTree.addNode(sprite2);
      sceneTree.addNode(text);

      const sprites = sceneTree.findNodesByType('Sprite');
      expect(sprites).toHaveLength(2);
      expect(sprites).toContain(sprite1);
      expect(sprites).toContain(sprite2);
    });

    it('should return empty array when no nodes of type found', () => {
      const nodes = sceneTree.findNodesByType('Button');
      expect(nodes).toEqual([]);
    });
  });

  describe('getAllNodes', () => {
    it('should return all nodes in the scene', () => {
      const node1 = new NodeImpl('node1', 'Sprite');
      const node2 = new NodeImpl('node2', 'Text');
      
      sceneTree.addNode(node1);
      sceneTree.addNode(node2);

      const allNodes = sceneTree.getAllNodes();
      expect(allNodes).toHaveLength(3); // root + 2 added nodes
      expect(allNodes).toContain(root);
      expect(allNodes).toContain(node1);
      expect(allNodes).toContain(node2);
    });
  });

  describe('getVisibleNodes', () => {
    it('should return only visible nodes', () => {
      const visible = new NodeImpl('visible', 'Sprite');
      const invisible = new NodeImpl('invisible', 'Text');
      invisible.visible = false;
      
      sceneTree.addNode(visible);
      sceneTree.addNode(invisible);

      const visibleNodes = sceneTree.getVisibleNodes();
      expect(visibleNodes).toContain(root);
      expect(visibleNodes).toContain(visible);
      expect(visibleNodes).not.toContain(invisible);
    });

    it('should exclude children of invisible parents', () => {
      const parent = new NodeImpl('parent', 'Group');
      const child = new NodeImpl('child', 'Sprite');
      parent.visible = false;
      
      sceneTree.addNode(parent);
      sceneTree.addNode(child, 'parent');

      const visibleNodes = sceneTree.getVisibleNodes();
      expect(visibleNodes).not.toContain(parent);
      expect(visibleNodes).not.toContain(child);
    });
  });

  describe('traverseNodes', () => {
    it('should visit all nodes in depth-first order', () => {
      const child1 = new NodeImpl('child1', 'Sprite');
      const child2 = new NodeImpl('child2', 'Text');
      const grandchild = new NodeImpl('grandchild', 'Button');
      
      sceneTree.addNode(child1);
      sceneTree.addNode(child2);
      sceneTree.addNode(grandchild, 'child1');

      const visited: string[] = [];
      sceneTree.traverseNodes(root, (node) => {
        visited.push(node.id);
      });

      expect(visited).toEqual(['root', 'child1', 'grandchild', 'child2']);
    });
  });
});

describe('NodeFactory', () => {
  describe('createGroup', () => {
    it('should create Group node with correct type', () => {
      const node = NodeFactory.createGroup('test-group');
      expect(node.id).toBe('test-group');
      expect(node.type).toBe('Group');
    });
  });

  describe('createSprite', () => {
    it('should create Sprite node with correct type', () => {
      const node = NodeFactory.createSprite('test-sprite');
      expect(node.id).toBe('test-sprite');
      expect(node.type).toBe('Sprite');
    });

    it('should store sprite ID when provided', () => {
      const node = NodeFactory.createSprite('test-sprite', 'sprite-asset');
      expect((node as any).spriteId).toBe('sprite-asset');
    });
  });

  describe('createText', () => {
    it('should create Text node with correct type', () => {
      const node = NodeFactory.createText('test-text');
      expect(node.id).toBe('test-text');
      expect(node.type).toBe('Text');
    });

    it('should store text content when provided', () => {
      const node = NodeFactory.createText('test-text', 'Hello World');
      expect((node as any).text).toBe('Hello World');
    });
  });

  describe('createButton', () => {
    it('should create Button node with correct type', () => {
      const node = NodeFactory.createButton('test-button');
      expect(node.id).toBe('test-button');
      expect(node.type).toBe('Button');
    });

    it('should store button text when provided', () => {
      const node = NodeFactory.createButton('test-button', 'Click Me');
      expect((node as any).text).toBe('Click Me');
    });
  });

  describe('createCamera2D', () => {
    it('should create Camera2D node with correct type', () => {
      const node = NodeFactory.createCamera2D('test-camera');
      expect(node.id).toBe('test-camera');
      expect(node.type).toBe('Camera2D');
    });

    it('should initialize camera-specific properties', () => {
      const node = NodeFactory.createCamera2D('test-camera');
      expect((node as any).zoom).toBe(1);
      expect((node as any).target).toEqual({ x: 0, y: 0 });
    });
  });
});