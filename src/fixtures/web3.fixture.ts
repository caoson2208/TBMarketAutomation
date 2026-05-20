import { testWithSynpress } from '@synthetixio/synpress'
import { metaMaskFixtures } from '@synthetixio/synpress/playwright'
import basicSetup from '../../wallet-setup/basic.setup'

export const test = testWithSynpress(metaMaskFixtures(basicSetup))
export const { expect } = test
