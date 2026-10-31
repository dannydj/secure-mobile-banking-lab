import { createSimulatedDeviceContextAdapter } from '../../src/infrastructure/device-context/simulated-device-context-adapter'
import type { SimulatedDeviceTrust } from '../../src/use-cases/device-context/device-context.types'

describe('CTRL-010: simulated device context', () => {
  it.each<SimulatedDeviceTrust>(['TRUSTED', 'UNTRUSTED', 'UNAVAILABLE'])('returns the configured synthetic trust status: %s', trust => {
    const adapter = createSimulatedDeviceContextAdapter(trust)

    expect(adapter.readTrust()).toBe(trust)
  })

  it('defaults to unavailable', () => {
    const adapter = createSimulatedDeviceContextAdapter()

    expect(adapter.readTrust()).toBe('UNAVAILABLE')
  })
})
