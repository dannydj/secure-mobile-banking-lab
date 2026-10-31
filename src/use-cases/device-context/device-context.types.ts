export type SimulatedDeviceTrust = 'TRUSTED' | 'UNTRUSTED' | 'UNAVAILABLE'

export type DeviceContextPort = Readonly<{
  readTrust: () => SimulatedDeviceTrust
}>
