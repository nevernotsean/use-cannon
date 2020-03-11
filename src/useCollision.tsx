import * as Comlink from 'comlink'
import { useContext, useEffect } from 'react'
import { context } from './index'

interface ProxyProps {
  addCollisionHandler(uuid: string, cb: void): Promise<void>
}

export function useCollision(ref: React.MutableRefObject<THREE.Object3D | undefined>, cb: void) {
  const { worker } = useContext(context)
  // const proxy = Comlink.proxy(worker)
  const obj = Comlink.wrap<ProxyProps>(worker)

  useEffect(() => {
    const fn = async () => {
      if (ref.current) {
        const uuid = ref.current.uuid

        await obj.addCollisionHandler(uuid, Comlink.proxy(cb))
      }
    }

    const unmount = fn()

    // return unmount
  }, [ref])

  return ref
}
