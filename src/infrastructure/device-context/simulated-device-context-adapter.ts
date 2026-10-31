import type { DeviceContextPort, SimulatedDeviceTrust } from '../../use-cases/device-context/device-context.types'

export function createSimulatedDeviceContextAdapter(trust: SimulatedDeviceTrust = 'UNAVAILABLE'): DeviceContextPort {
  return {
    readTrust: () => trust,
  }
}
