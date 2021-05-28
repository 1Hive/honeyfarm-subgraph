import {
    HoneyFarm as HoneyFarmContract,
    PoolAdded,
    Transfer,
    RewardsWithdraw
} from '../generated/HoneyFarm/HoneyFarm'
import {Address, BigInt, ethereum} from '@graphprotocol/graph-ts'
import {
    ADDRESS_ZERO,
    BIG_DECIMAL_ZERO,
    BIG_INT_ONE,
    BIG_INT_ONE_DAY_SECONDS,
    BIG_INT_ZERO,
    HONEY_FARM_ADDRESS
} from './constants'
import {HoneyFarm, Pool, History, User, Deposit} from '../generated/schema'

import {ERC20 as ERC20Contract} from '../generated/HoneyFarm/ERC20'


function getHoneyFarm(block: ethereum.Block): HoneyFarm {
    let honeyFarm = HoneyFarm.load(HONEY_FARM_ADDRESS.toHex())

    if (honeyFarm === null) {
        const contract = HoneyFarmContract.bind(HONEY_FARM_ADDRESS)
        honeyFarm = new HoneyFarm(HONEY_FARM_ADDRESS.toHex())
        honeyFarm.owner = contract.owner()
        // poolInfo ...
        honeyFarm.startTime = contract.startTime()
        honeyFarm.endTime = contract.endTime()

        honeyFarm.distributionSlope = contract.distributionSlope()
        honeyFarm.startDistribution = contract.startDistribution()

        //honeyFarm.minTimeLock = contract.minTimeLock()
        honeyFarm.minTimeLock = BIG_INT_ZERO
        honeyFarm.maxTimeLock = contract.maxTimeLock()

        honeyFarm.scale = contract.SCALE()

        honeyFarm.timeLockMultiplier = contract.timeLockMultiplier()
        honeyFarm.timeLockConstant = contract.timeLockConstant()

        const hsfAddress = contract.hsf()
        honeyFarm.hsf = hsfAddress
        const hsfToken = ERC20Contract.bind(hsfAddress)
        const totalHsf = hsfToken.totalSupply()

        honeyFarm.totalHsf = totalHsf

        honeyFarm.totalAllocPoint = BIG_INT_ZERO
        // userInfo ...
        honeyFarm.poolCount = BIG_INT_ZERO

        honeyFarm.updatedAt = block.timestamp

        honeyFarm.save()
    }

    return honeyFarm as HoneyFarm
}

export function getPool(id: Address, block: ethereum.Block): Pool {
    let pool = Pool.load(id.toHexString())

    if (pool === null) {
        const honeyFarm = getHoneyFarm(block)

        const honeyFarmContract = HoneyFarmContract.bind(HONEY_FARM_ADDRESS)

        // Create new pool.
        pool = new Pool(id.toHexString())

        // Set relation
        pool.owner = honeyFarm.id

        const poolInfo = honeyFarmContract.poolInfo(id)

        pool.allocPoint = poolInfo.value0
        pool.lastRewardTimestamp = poolInfo.value1
        pool.accHsfPerShare = poolInfo.value2.toBigDecimal()
        pool.totalShares = poolInfo.value3

        // Total supply of LP tokens
        pool.balance = BIG_INT_ZERO
        pool.openDepositCount = BIG_INT_ZERO

        pool.timestamp = block.timestamp
        pool.block = block.number

        pool.updatedAt = block.timestamp
        pool.hsfHarvested = BIG_DECIMAL_ZERO
        pool.save()
    }

    return pool as Pool
}

function getHistory(owner: string, block: ethereum.Block): History {
    const day = block.timestamp.div(BIG_INT_ONE_DAY_SECONDS)

    const id = owner.concat(day.toString())

    let history = History.load(id)

    if (history === null) {
        history = new History(id)
        history.owner = owner
        history.timestamp = block.timestamp
        history.block = block.number
    }

    return history as History
}

export function poolEvent(event: PoolAdded): void {

    const honeyFarm = getHoneyFarm(event.block)

    const pool = getPool(event.params.poolToken, event.block)
    honeyFarm.totalAllocPoint = honeyFarm.totalAllocPoint.plus(pool.allocPoint)
    honeyFarm.poolCount = honeyFarm.poolCount.plus(BIG_INT_ONE)
    honeyFarm.save()
}

//pid is the address of the pool token, address is wallet address
export function getUser(pid: Address, address: Address, block: ethereum.Block): User {
    const id = address.toHex()

    let user = User.load(id)

    if (user === null) {
        user = new User(id)
        user.amount = BIG_INT_ZERO
        user.rewardDebt = BIG_INT_ZERO
        user.hsfHarvested = BIG_DECIMAL_ZERO
        user.timestamp = block.timestamp
        user.block = block.number
        user.save()
    }

    return user as User
}

export function transferEvent(event: Transfer): void {
    const from = event.params.from
    const to = event.params.to

    // log.info('---------- transferEvent from {}', [from.toHex()])
    // log.info('---------- transferEvent to {}', [to.toHex()])

    // _mint
    if (from.toHex() == ADDRESS_ZERO.toHex()) {
        createDeposit(event)
    }
    // _burn
    else {
        closeDeposit(event)
    }
}

export function getDeposit(id: BigInt, block: ethereum.Block): Deposit {
    let deposit = Deposit.load(id.toString())

    if (deposit === null) {
        deposit = new Deposit(id.toString())

        const honeyFarmContract = HoneyFarmContract.bind(HONEY_FARM_ADDRESS)

        const depositInfo = honeyFarmContract.depositInfo(id)

        deposit.user = null
        deposit.amount = depositInfo.value0
        deposit.rewardDebt = depositInfo.value1
        deposit.unlockTime = depositInfo.value2
        deposit.rewardShare = depositInfo.value3
        deposit.setRewards = depositInfo.value4

        const pool = getPool(depositInfo.value5, block)

        deposit.pool = pool.id
        deposit.referrer = depositInfo.value6

        deposit.timestamp = block.timestamp
        deposit.block = block.number

        deposit.status = 'Open'

        deposit.save()
    }

    return deposit as Deposit
}

export function createDeposit(event: Transfer): void {
    //const from = event.params.from //zero address
    const to = event.params.to //user address
    const tokenId = event.params.tokenId //newly minted tokenId (int)

    const honeyFarmContract = HoneyFarmContract.bind(HONEY_FARM_ADDRESS)

    // balanceOf is also the latest added index for the user
    // log.info('---------- createDeposit balanceOf from {}', [to.toHex()])
    // log.info('---------- createDeposit tokenID {}', [tokenId.toString()])


   const depositInfo = honeyFarmContract.depositInfo(tokenId)

    const deposit = getDeposit(tokenId, event.block)
    const user = getUser(depositInfo.value5, to, event.block)
    deposit.user = user.id
    deposit.save()

    const pool = getPool(Address.fromString(deposit.pool), event.block)
    const poolToken = ERC20Contract.bind(Address.fromString(pool.id))
    pool.balance = poolToken.balanceOf(HONEY_FARM_ADDRESS)
    pool.openDepositCount = pool.openDepositCount.plus(BIG_INT_ONE)
    pool.save()

}

export function closeDeposit(event: Transfer): void {
    // log.info('closeDeposit', [])

    const to = event.params.to //zero address
    const tokenId = event.params.tokenId //tokenId (int)

    // balanceOf is also the latest added index for the user
    // log.info('---------- createDeposit balanceOf from {}', [to.toHex()])
    // log.info('---------- createDeposit tokenID {}', [tokenId.toString()])

    const deposit = getDeposit(tokenId, event.block)
    deposit.status = "Closed"
    deposit.save()

    const pool = getPool(Address.fromString(deposit.pool), event.block)
    const poolToken = ERC20Contract.bind(Address.fromString(pool.id))
    pool.balance = poolToken.balanceOf(HONEY_FARM_ADDRESS)
    pool.openDepositCount = pool.openDepositCount.minus(BIG_INT_ONE)
    pool.save()

}

export function withdrawRewardsEvent(event: RewardsWithdraw): void {
    // log.info('withdrawRewardsEvent', [])

    const depositId = event.params.depositId
    const rewardAmount = event.params.rewardAmount

    const honeyFarmContract = HoneyFarmContract.bind(HONEY_FARM_ADDRESS)

    const depositInfo = honeyFarmContract.depositInfo(depositId)

    const deposit = getDeposit(depositId, event.block)
    deposit.rewardDebt = depositInfo.value1
    deposit.setRewards = depositInfo.value4
    deposit.save()
}