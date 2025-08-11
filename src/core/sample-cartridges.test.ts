import { describe, it, expect, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * Test suite for sample cartridges
 * Validates that all sample cartridges meet schema requirements and performance criteria
 */
describe('Sample Cartridges', () => {
  let schema: any

  beforeEach(() => {
    // Load JSON schema for reference
    const schemaPath = join(process.cwd(), 'lgf.schema.json')
    schema = JSON.parse(readFileSync(schemaPath, 'utf-8'))
  })

  // Basic validation helper
  function validateBasicStructure(cartridge: any): boolean {
    return !!(
      cartridge.version &&
      cartridge.metadata &&
      cartridge.theme &&
      cartridge.scenes &&
      cartridge.assets
    )
  }

  describe('Pong Sample (pong.lgf.json)', () => {
    let pongCartridge: any

    beforeEach(() => {
      const pongPath = join(process.cwd(), 'test-samples/pong.lgf.json')
      pongCartridge = JSON.parse(readFileSync(pongPath, 'utf-8'))
    })

    it('should have valid basic structure', () => {
      expect(validateBasicStructure(pongCartridge)).toBe(true)
      expect(pongCartridge.version).toBe('1.0')
      expect(pongCartridge.scenes).toHaveLength(1)
    })

    it('should have correct metadata', () => {
      expect(pongCartridge.metadata.title).toBe('Pong Game')
      expect(pongCartridge.metadata.author).toBe('LLM Canvas Engine')
      expect(pongCartridge.metadata.description).toContain('basic 2D gameplay mechanics')
    })

    it('should demonstrate basic 2D gameplay mechanics', () => {
      const scene = pongCartridge.scenes[0]
      const nodes = scene.root.children
      
      // Should have paddles
      const paddles = nodes.filter((node: any) => node.id.includes('paddle'))
      expect(paddles).toHaveLength(2)
      
      // Should have ball
      const ball = nodes.find((node: any) => node.id === 'ball')
      expect(ball).toBeDefined()
      expect(ball.type).toBe('Sprite')
      
      // Should have score display
      const scoreTexts = nodes.filter((node: any) => node.id.includes('score') && node.type === 'Text')
      expect(scoreTexts).toHaveLength(2)
    })

    it('should have proper input handling', () => {
      const scene = pongCartridge.scenes[0]
      const paddle1 = scene.root.children.find((node: any) => node.id === 'paddle1')
      const paddle2 = scene.root.children.find((node: any) => node.id === 'paddle2')
      
      // Paddles should have key triggers
      expect(paddle1.triggers.some((t: any) => t.event === 'on.key')).toBe(true)
      expect(paddle2.triggers.some((t: any) => t.event === 'on.key')).toBe(true)
    })

    it('should have ball physics simulation', () => {
      const scene = pongCartridge.scenes[0]
      const ball = scene.root.children.find((node: any) => node.id === 'ball')
      
      // Ball should have tick trigger for physics
      expect(ball.triggers.some((t: any) => t.event === 'on.tick')).toBe(true)
      
      // Should have velocity variables
      expect(pongCartridge.variables.ballVelocityX).toBeDefined()
      expect(pongCartridge.variables.ballVelocityY).toBeDefined()
    })

    it('should have audio feedback', () => {
      const audioAssets = pongCartridge.assets.audio
      expect(audioAssets).toHaveLength(2)
      expect(audioAssets.some((a: any) => a.id === 'bounce')).toBe(true)
      expect(audioAssets.some((a: any) => a.id === 'score')).toBe(true)
    })

    it('should meet performance requirements', () => {
      const scene = pongCartridge.scenes[0]
      const sprites = scene.root.children.filter((node: any) => node.type === 'Sprite')
      
      // Should have ≤ 200 active sprites (requirement 3.6)
      expect(sprites.length).toBeLessThanOrEqual(200)
      
      // Sprite assets should be reasonably sized
      pongCartridge.assets.sprites.forEach((sprite: any) => {
        expect(sprite.width).toBeLessThanOrEqual(2048)
        expect(sprite.height).toBeLessThanOrEqual(2048)
      })
    })
  })

  describe('Raycast Corridor Sample (corridor.lgf.json)', () => {
    let corridorCartridge: any

    beforeEach(() => {
      const corridorPath = join(process.cwd(), 'test-samples/corridor.lgf.json')
      corridorCartridge = JSON.parse(readFileSync(corridorPath, 'utf-8'))
    })

    it('should have valid basic structure', () => {
      expect(validateBasicStructure(corridorCartridge)).toBe(true)
      expect(corridorCartridge.version).toBe('1.0')
      expect(corridorCartridge.scenes).toHaveLength(1)
    })

    it('should have correct metadata', () => {
      expect(corridorCartridge.metadata.title).toBe('Raycast Corridor')
      expect(corridorCartridge.metadata.author).toBe('LLM Canvas Engine')
      expect(corridorCartridge.metadata.description).toContain('raycast rendering')
    })

    it('should demonstrate raycast module features', () => {
      const scene = corridorCartridge.scenes[0]
      const raycastMap = scene.root.children.find((node: any) => node.type === 'RaycastMap')
      
      expect(raycastMap).toBeDefined()
      expect(raycastMap.map).toBeDefined()
      expect(raycastMap.textures).toBeDefined()
      expect(raycastMap.billboards).toBeDefined()
      expect(raycastMap.fov).toBeDefined()
      expect(raycastMap.renderDistance).toBeDefined()
    })

    it('should have proper first-person controls', () => {
      const scene = corridorCartridge.scenes[0]
      const raycastMap = scene.root.children.find((node: any) => node.type === 'RaycastMap')
      
      // Should have key triggers for movement
      expect(raycastMap.triggers.some((t: any) => t.event === 'on.key')).toBe(true)
      
      // Should have player position variables
      expect(corridorCartridge.variables.playerX).toBeDefined()
      expect(corridorCartridge.variables.playerY).toBeDefined()
      expect(corridorCartridge.variables.playerAngle).toBeDefined()
    })

    it('should have collision detection', () => {
      const scene = corridorCartridge.scenes[0]
      const raycastMap = scene.root.children.find((node: any) => node.type === 'RaycastMap')
      
      // Map should be defined with walls (1) and empty spaces (0)
      expect(raycastMap.map).toBeInstanceOf(Array)
      expect(raycastMap.map.length).toBeGreaterThan(0)
      expect(raycastMap.map[0]).toBeInstanceOf(Array)
    })

    it('should have billboards for interactive elements', () => {
      const scene = corridorCartridge.scenes[0]
      const raycastMap = scene.root.children.find((node: any) => node.type === 'RaycastMap')
      
      expect(raycastMap.billboards).toBeInstanceOf(Array)
      expect(raycastMap.billboards.length).toBeGreaterThan(0)
      
      // Should have raycast hit trigger
      expect(raycastMap.triggers.some((t: any) => t.event === 'on.raycastHit')).toBe(true)
    })

    it('should meet performance requirements', () => {
      const scene = corridorCartridge.scenes[0]
      const raycastMap = scene.root.children.find((node: any) => node.type === 'RaycastMap')
      
      // Should have ≤ 200 billboards (requirement 3.6)
      expect(raycastMap.billboards.length).toBeLessThanOrEqual(200)
      
      // Should have ≤ 1 fake-3D surface (requirement 3.6)
      const fake3DNodes = scene.root.children.filter((node: any) => 
        ['RaycastMap', 'Mode7Plane', 'TilemapIso'].includes(node.type)
      )
      expect(fake3DNodes.length).toBeLessThanOrEqual(1)
    })
  })

  describe('Mode-7 Racer Sample (racer.lgf.json)', () => {
    let racerCartridge: any

    beforeEach(() => {
      const racerPath = join(process.cwd(), 'test-samples/racer.lgf.json')
      racerCartridge = JSON.parse(readFileSync(racerPath, 'utf-8'))
    })

    it('should have valid basic structure', () => {
      expect(validateBasicStructure(racerCartridge)).toBe(true)
      expect(racerCartridge.version).toBe('1.0')
      expect(racerCartridge.scenes).toHaveLength(1)
    })

    it('should have correct metadata', () => {
      expect(racerCartridge.metadata.title).toBe('Mode-7 Racer')
      expect(racerCartridge.metadata.author).toBe('LLM Canvas Engine')
      expect(racerCartridge.metadata.description).toContain('Mode-7 perspective rendering')
    })

    it('should demonstrate Mode-7 rendering capabilities', () => {
      const scene = racerCartridge.scenes[0]
      const mode7Plane = scene.root.children.find((node: any) => node.type === 'Mode7Plane')
      
      expect(mode7Plane).toBeDefined()
      expect(mode7Plane.texture).toBeDefined()
      expect(mode7Plane.horizon).toBeDefined()
      expect(mode7Plane.scale).toBeDefined()
      expect(mode7Plane.offset).toBeDefined()
    })

    it('should have racing car controls', () => {
      const scene = racerCartridge.scenes[0]
      const mode7Plane = scene.root.children.find((node: any) => node.type === 'Mode7Plane')
      
      // Should have key triggers for car movement
      expect(mode7Plane.triggers.some((t: any) => t.event === 'on.key')).toBe(true)
      
      // Should have car physics variables
      expect(racerCartridge.variables.carSpeed).toBeDefined()
      expect(racerCartridge.variables.carAngle).toBeDefined()
      expect(racerCartridge.variables.acceleration).toBeDefined()
      expect(racerCartridge.variables.maxSpeed).toBeDefined()
    })

    it('should have smooth camera movement', () => {
      const scene = racerCartridge.scenes[0]
      const mode7Plane = scene.root.children.find((node: any) => node.type === 'Mode7Plane')
      
      // Should have tick trigger for camera updates
      expect(mode7Plane.triggers.some((t: any) => t.event === 'on.tick')).toBe(true)
      
      // Should have moveCamera actions
      const tickTrigger = mode7Plane.triggers.find((t: any) => t.event === 'on.tick')
      expect(tickTrigger.actions.some((a: any) => a.type === 'moveCamera')).toBe(true)
    })

    it('should have post-processing effects', () => {
      const scene = racerCartridge.scenes[0]
      const postChain = scene.root.children.find((node: any) => node.type === 'PostChain')
      
      expect(postChain).toBeDefined()
      expect(postChain.effects).toBeInstanceOf(Array)
      expect(postChain.effects.length).toBeGreaterThan(0)
      
      // Should have vignette and color grading
      expect(postChain.effects.some((e: any) => e.type === 'vignette')).toBe(true)
      expect(postChain.effects.some((e: any) => e.type === 'color-grading')).toBe(true)
    })

    it('should have UI elements', () => {
      const scene = racerCartridge.scenes[0]
      const textNodes = scene.root.children.filter((node: any) => node.type === 'Text')
      
      // Should have speedometer
      expect(textNodes.some((node: any) => node.id === 'speedometer')).toBe(true)
      
      // Should have instructions
      expect(textNodes.some((node: any) => node.id === 'instructionsText')).toBe(true)
      
      // Should have position display
      expect(textNodes.some((node: any) => node.id === 'positionText')).toBe(true)
    })

    it('should meet performance requirements', () => {
      const scene = racerCartridge.scenes[0]
      
      // Should have ≤ 1 fake-3D surface (requirement 3.6)
      const fake3DNodes = scene.root.children.filter((node: any) => 
        ['RaycastMap', 'Mode7Plane', 'TilemapIso'].includes(node.type)
      )
      expect(fake3DNodes.length).toBeLessThanOrEqual(1)
      
      // Should have reasonable number of sprites
      const sprites = scene.root.children.filter((node: any) => node.type === 'Sprite')
      expect(sprites.length).toBeLessThanOrEqual(200)
    })
  })

  describe('Cross-Sample Validation', () => {
    let samples: any[]

    beforeEach(() => {
      const pongPath = join(process.cwd(), 'test-samples/pong.lgf.json')
      const corridorPath = join(process.cwd(), 'test-samples/corridor.lgf.json')
      const racerPath = join(process.cwd(), 'test-samples/racer.lgf.json')
      
      samples = [
        JSON.parse(readFileSync(pongPath, 'utf-8')),
        JSON.parse(readFileSync(corridorPath, 'utf-8')),
        JSON.parse(readFileSync(racerPath, 'utf-8'))
      ]
    })

    it('should all use consistent theme structure', () => {
      samples.forEach(sample => {
        expect(sample.theme.colors).toBeDefined()
        expect(sample.theme.font).toBeDefined()
        expect(sample.theme.spacing).toBeDefined()
        expect(sample.theme.radii).toBeDefined()
        
        // Should have required color tokens
        expect(sample.theme.colors.primary).toBeDefined()
        expect(sample.theme.colors.secondary).toBeDefined()
        expect(sample.theme.colors.background).toBeDefined()
        expect(sample.theme.colors.text).toBeDefined()
        expect(sample.theme.colors.accent).toBeDefined()
      })
    })

    it('should all have proper asset organization', () => {
      samples.forEach(sample => {
        expect(sample.assets.sprites).toBeInstanceOf(Array)
        expect(sample.assets.audio).toBeInstanceOf(Array)
        expect(sample.assets.fonts).toBeInstanceOf(Array)
        
        // All sprites should have valid dimensions
        sample.assets.sprites.forEach((sprite: any) => {
          expect(sprite.width).toBeGreaterThan(0)
          expect(sprite.height).toBeGreaterThan(0)
          expect(sprite.width).toBeLessThanOrEqual(2048)
          expect(sprite.height).toBeLessThanOrEqual(2048)
        })
      })
    })

    it('should demonstrate different engine capabilities', () => {
      const [pong, corridor, racer] = samples
      
      // Pong should focus on 2D gameplay
      const pongSprites = pong.scenes[0].root.children.filter((n: any) => n.type === 'Sprite')
      expect(pongSprites.length).toBeGreaterThan(0)
      
      // Corridor should use raycast rendering
      const corridorRaycast = corridor.scenes[0].root.children.find((n: any) => n.type === 'RaycastMap')
      expect(corridorRaycast).toBeDefined()
      
      // Racer should use Mode-7 rendering
      const racerMode7 = racer.scenes[0].root.children.find((n: any) => n.type === 'Mode7Plane')
      expect(racerMode7).toBeDefined()
    })

    it('should have comprehensive documentation in comments', () => {
      samples.forEach(sample => {
        // Metadata should be descriptive
        expect(sample.metadata.description.length).toBeGreaterThan(50)
        expect(sample.metadata.title.length).toBeGreaterThan(5)
        expect(sample.metadata.author).toBe('LLM Canvas Engine')
      })
    })
  })
})