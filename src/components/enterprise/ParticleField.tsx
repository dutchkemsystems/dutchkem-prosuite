import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

function Particles({ count = 200 }: { count?: number }) {
  const mesh = useRef<THREE.Points>(null!)
  const geoRef = useRef<THREE.BufferGeometry>(null!)

  const [positions, colors] = useMemo(() => {
    const pos = new Float32Array(count * 3)
    const cols = new Float32Array(count * 3)
    const palette = [
      [1, 0.42, 0.2],
      [0.4, 0.5, 1],
      [0.9, 0.3, 0.6],
    ]
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 20
      pos[i * 3 + 1] = (Math.random() - 0.5) * 20
      pos[i * 3 + 2] = (Math.random() - 0.5) * 20
      const c = palette[Math.floor(Math.random() * palette.length)]
      cols[i * 3] = c[0]
      cols[i * 3 + 1] = c[1]
      cols[i * 3 + 2] = c[2]
    }
    return [pos, cols]
  }, [count])

  useFrame((state) => {
    if (mesh.current) {
      mesh.current.rotation.x = state.clock.elapsedTime * 0.03
      mesh.current.rotation.y = state.clock.elapsedTime * 0.05
    }
  })

  return (
    <points ref={mesh}>
      <bufferGeometry ref={geoRef}>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.06} vertexColors transparent opacity={0.6} sizeAttenuation blending={THREE.AdditiveBlending} depthWrite={false} />
    </points>
  )
}

function FloatingTorus() {
  const ref = useRef<THREE.Mesh>(null)
  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.x = state.clock.elapsedTime * 0.3
      ref.current.rotation.y = state.clock.elapsedTime * 0.5
      ref.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.3
    }
  })
  return (
    <mesh ref={ref} position={[0, 0, 0]}>
      <torusKnotGeometry args={[1, 0.3, 128, 32, 2, 3]} />
      <meshStandardMaterial color="#ff6b35" wireframe transparent opacity={0.15} />
    </mesh>
  )
}

function FloatingCube() {
  const ref = useRef<THREE.Mesh>(null)
  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.x = state.clock.elapsedTime * 0.2
      ref.current.rotation.z = state.clock.elapsedTime * 0.3
      ref.current.position.x = Math.sin(state.clock.elapsedTime * 0.3) * 0.5
    }
  })
  return (
    <mesh ref={ref} position={[3, 1, -2]}>
      <boxGeometry args={[0.8, 0.8, 0.8]} />
      <meshStandardMaterial color="#6366f1" wireframe transparent opacity={0.12} />
    </mesh>
  )
}

function FloatingOctahedron() {
  const ref = useRef<THREE.Mesh>(null)
  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y = state.clock.elapsedTime * 0.4
      ref.current.position.y = Math.cos(state.clock.elapsedTime * 0.4) * 0.4
    }
  })
  return (
    <mesh ref={ref} position={[-3, -1, -1]}>
      <octahedronGeometry args={[0.6]} />
      <meshStandardMaterial color="#22d3ee" wireframe transparent opacity={0.1} />
    </mesh>
  )
}

export function ParticleField() {
  return (
    <div className="absolute inset-0 -z-10">
      <Canvas camera={{ position: [0, 0, 6], fov: 60 }} dpr={[1, 1.5]} gl={{ antialias: true, alpha: true }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        <Particles count={150} />
        <FloatingTorus />
        <FloatingCube />
        <FloatingOctahedron />
      </Canvas>
    </div>
  )
}
