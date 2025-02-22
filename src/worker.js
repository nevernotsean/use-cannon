import {
  World,
  NaiveBroadphase,
  Body,
  Plane,
  Box,
  Vec3,
  ConvexPolyhedron,
  Cylinder,
  Heightfield,
  Particle,
  Sphere,
  Trimesh,
} from 'cannon-es'

let bodies = {}
let world = new World()
let config = { step: 1 / 60 }
world.broadphase = new NaiveBroadphase(world)
world.gravity.set(0, 10, 0)

function task(e, sync = true) {
  const { op, uuid, type, positions, quaternions, props } = e.data

  switch (op) {
    case 'init': {
      const { gravity, tolerance, step, iterations } = props
      world.gravity.set(gravity[0], gravity[1], gravity[2])
      world.solver.tolerance = tolerance
      world.solver.iterations = iterations
      config.step = step
      break
    }
    case 'step': {
      world.step(config.step)
      for (let i = 0; i < world.bodies.length; i++) {
        let b = world.bodies[i],
          p = b.position,
          q = b.quaternion
        positions[3 * i + 0] = p.x
        positions[3 * i + 1] = p.y
        positions[3 * i + 2] = p.z
        quaternions[4 * i + 0] = q.x
        quaternions[4 * i + 1] = q.y
        quaternions[4 * i + 2] = q.z
        quaternions[4 * i + 3] = q.w
      }
      self.postMessage({ op: 'frame', positions, quaternions }, [positions.buffer, quaternions.buffer])
      break
    }
    case 'addBody': {
      const { args = [], position = [0, 0, 0], rotation = [0, 0, 0], scale = [1, 1, 1], isKinematic, ...extra } = props

      const body = new Body({
        ...extra,
        type: isKinematic ? Body.KINEMATIC : undefined,
      })

      body.uuid = uuid

      switch (type) {
        case 'Box':
          body.addShape(new Box(new Vec3(...args))) // halfExtents
          break
        case 'ConvexPolyhedron':
          const [v, f] = args
          const vertices = new Array(v.length)
          for (let i = 0; i < vertices.length; i++) vertices[i] = new Vec3(v[i][0], v[i][1], v[i][2])
          const faces = new Array(f.length)
          for (let i = 0; i < f.length; i++) faces[i] = [f[i][0], f[i][1], f[i][2]]
          body.addmesh(new ConvexPolyhedron(vertices, faces))
          break
        case 'Cylinder':
          body.addShape(new Cylinder(...args)) // [ radiusTop, radiusBottom, height, numSegments ] = args
          break
        case 'Heightfield':
          body.addShape(new Heightfield(...args)) // [ Array data, options: {minValue, maxValue, elementSize}  ] = args
          break
        case 'Particle':
          body.addShape(new Particle()) // no args
          break
        case 'Plane':
          body.addShape(new Plane()) // no args, infinite x and y
          break
        case 'Sphere':
          body.addShape(new Sphere(...args)) // [radius] = args
          break
        case 'Trimesh':
          body.addShape(new Trimesh(...args)) // [vertices, indices] = args
          break
        default:
          break
      }

      body.position.set(position[0], position[1], position[2])
      body.quaternion.setFromEuler(rotation[0], rotation[1], rotation[2])
      world.addBody(body)
      if (sync) syncBodies()
      break
    }
    case 'addBodies': {
      for (let i = 0; i < uuid.length; i++) {
        task({ data: { op: 'addBody', type, uuid: uuid[i], props: props[i] } }, false)
      }
      syncBodies()
      break
    }
    case 'removeBody': {
      world.removeBody(bodies[uuid])
      if (sync) syncBodies()
      break
    }
    case 'removeBodies': {
      for (let i = 0; i < uuid.length; i++) task({ data: { op: 'removeBody', uuid: uuid[i] } })
      syncBodies()
      break
    }
    case 'setPosition': {
      bodies[uuid].position.set(props[0], props[1], props[2])
      break
    }
    case 'setRotation': {
      bodies[uuid].quaternion.setFromEuler(props[0], props[1], props[2], 'XYZ')
      break
    }
  }
}

function syncBodies() {
  self.postMessage({ op: 'sync', bodies: world.bodies.map(body => body.uuid) })
  bodies = world.bodies.reduce((acc, body) => ({ ...acc, [body.uuid]: body }), {})
}

self.onmessage = e => task(e)
