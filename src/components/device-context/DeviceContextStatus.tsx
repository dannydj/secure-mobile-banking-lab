import { Text, View } from 'react-native'
import type { SimulatedDeviceTrust } from '../../use-cases/device-context/device-context.types'

type Props = Readonly<{
  trust: SimulatedDeviceTrust
}>

export function DeviceContextStatus({ trust }: Props) {
  return (
    <View>
      <Text>Simulated device trust: {trust}</Text>
      <Text>SIMULATED — NOT DEVICE ATTESTATION</Text>
    </View>
  )
}
