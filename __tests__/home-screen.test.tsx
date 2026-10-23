import { render } from '@testing-library/react-native';

import HomeScreen from '../src/app/index';

describe('HomeScreen', () => {
  it('displays the project title', async () => {
    const { getByText } = await render(<HomeScreen />);

    expect(getByText('Secure Mobile Banking Lab')).toBeTruthy();
  });

  it('displays the synthetic data disclaimer', async () => {
    const { getByText } = await render(<HomeScreen />);

    expect(
      getByText('Educational demonstration using synthetic data only.')
    ).toBeTruthy();
  });
});
