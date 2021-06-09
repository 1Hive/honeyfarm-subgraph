import { Address, BigDecimal, BigInt } from '@graphprotocol/graph-ts'

export const ADDRESS_ZERO = Address.fromString('0x0000000000000000000000000000000000000000')

export const BIG_DECIMAL_1E6 = BigDecimal.fromString('1e6')

export const BIG_DECIMAL_1E12 = BigDecimal.fromString('1e12')

export const BIG_DECIMAL_1E18 = BigDecimal.fromString('1e18')

export const BIG_DECIMAL_ZERO = BigDecimal.fromString('0')

export const BIG_DECIMAL_ONE = BigDecimal.fromString('1')

export const BIG_INT_ONE = BigInt.fromI32(1)

export const BIG_INT_ONE_DAY_SECONDS = BigInt.fromI32(86400)

export const BIG_INT_ZERO = BigInt.fromI32(0)

export const BURN_ADDRESS = Address.fromString('0x000000000000000000000000000000000000dEaD')

export const HONEY_FARM_ADDRESS = Address.fromString('{{ HONEY_FARM_ADDRESS }}')

export const HSF_TOKEN_ADDRESS = Address.fromString('{{ HSF_TOKEN_ADDRESS }}')

export const AIRDROPPER_ADDRESS = Address.fromString('{{ AIRDROPPER_ADDRESS }}')