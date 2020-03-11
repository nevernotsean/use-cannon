import Comlink from 'comlink'
import { useContext, useEffect } from 'react'

export function useCollision(ref: React.MutableRefObject<THREE.Object3D | undefined>, cb: void) {
  const { worker } = useContext(context)
  // const proxy = Comlink.proxy(worker)
  const proxy = Comlink.wrap(worker)
  const port = proxy[Comlink.createEndpoint]
  const proxyy = Comlink.wrap(port)

  useEffect(() => {
    const fn = async () => {
      if (ref.current) {
        const uuid = ref.current.uuid

        await proxy.addCollisionHandler(uuid, cb)
      }
    }

    const fn2 = async () => {
      if (ref.current) {
        const uuid = ref.current.uuid

        await proxy.removeCollisionHandler(uuid, cb)
      }
    }

    fn()

    return () => {
      fn2()
    }
  }, [ref])

  return ref
}
