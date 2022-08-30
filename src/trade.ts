import { BigInt, Bytes, ethereum } from "@graphprotocol/graph-ts"
import {
  ClosePosition,
  OpenPosition,
  SetAssetParams
} from "../generated/LiquidityPool/LiquidityPool"
import {
  PositionFeeRate,
  ReferralRecord,
  ReferrerSetRecord,
  TradeRecord,
  ReferralStat,
  TraderStat
} from "../generated/schema"
import { getTimePostfix, updateReferrerStat, updateTraderStat } from './stat'

class SubAccountStruct {
  account: string
  collateralId: i32
  assetId: i32
  isLong: boolean
}

enum TradeType {
  Open, Close, Liquidate
}

const ZERO = BigInt.fromString("0")
const ONE = BigInt.fromString("1000000000000000000")
const FEE_DENOMINATOR = BigInt.fromString("100000")

function makeTransactionId(event: ethereum.Event): string {
  return event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
}

function decodeSubAccountId(subAccountId: Bytes): SubAccountStruct {
  const hexSubAccount = subAccountId.toHexString()
  return {
    account: subAccountId.toHexString().slice(0, 42),
    collateralId: Bytes.fromHexString(hexSubAccount.slice(42, 44)).toI32(),
    assetId: Bytes.fromHexString(hexSubAccount.slice(44, 46)).toI32(),
    isLong: Bytes.fromHexString(hexSubAccount.slice(46, 48)).toI32() > 0,
  }
}

function _getPositionFeeRate(id: string): BigInt {
  let positionFeeRate = PositionFeeRate.load(id)
  if (positionFeeRate) {
    return positionFeeRate.positionFeeRate
  }
  return BigInt.fromI32(100)
}

function _handleTradeEvent(
  subAccountId: Bytes,
  type: string,
  amount: BigInt,
  price: BigInt,
  event: ethereum.Event
): void {
  let transactionId = makeTransactionId(event)
  let subAccount = decodeSubAccountId(subAccountId)

  // =============== create a trade record =================
  let trade = TradeRecord.load(transactionId)
  if (!trade) {
    trade = new TradeRecord(transactionId)
  }
  trade.id = transactionId
  trade.type = type
  trade.trader = subAccount.account
  trade.assetId = subAccount.assetId
  trade.collateralId = subAccount.collateralId
  trade.isLong = subAccount.isLong
  trade.amount = amount
  trade.price = price

  trade.transactionHash = event.transaction.hash.toHexString()
  trade.transactionLogIndex = event.transactionLogIndex
  trade.blockNumber = event.block.number
  trade.timestamp = event.block.timestamp

  let referralCode = ReferrerSetRecord.load(trade.trader)
  if (referralCode) {
    trade.referralCode = referralCode.referralCode
  }
  trade.save()

  if (!referralCode) {
    return;
  }

  // =============== create a referral record =================
  let referral = ReferralRecord.load(transactionId)
  if (!referral) {
    referral = new ReferralRecord(transactionId)
  }
  referral.trader = subAccount.account
  referral.volume = amount.times(price).div(ONE)
  referral.positionFeeRate = subAccount.assetId.toString()
  // feeEntiry
  const positionFeeRate = _getPositionFeeRate(subAccount.assetId.toString())
  referral.feeUsd = referral.volume.times(positionFeeRate).div(FEE_DENOMINATOR)
  referral.referralCode = referralCode.referralCode

  referral.transactionHash = event.transaction.hash.toHexString()
  referral.transactionLogIndex = event.transactionLogIndex
  referral.blockNumber = event.block.number
  referral.timestamp = event.block.timestamp
  referral.save()

  // =============== create the stat record =================
  const code = referralCode.referralCode
  const trader = subAccount.account
  // til last week + this week
  var epochKey = getTimePostfix(event.block.timestamp, 'weekly')
  updateReferrerStat(
    code,
    epochKey,
    code,
    referral.volume,
    referral.feeUsd
  )
  updateTraderStat(
    trader,
    epochKey,
    trader,
    "",
    referral.volume,
    referral.feeUsd
  )
  updateTraderStat(
    `${trader}-${code}`,
    epochKey,
    trader,
    code,
    referral.volume,
    referral.feeUsd,
  )
}

export function handleOpenPosition(event: OpenPosition): void {
  const args = event.params.args
  const volume = args.amount.times(args.assetPrice).div(ONE)
  _handleTradeEvent(
    args.subAccountId,
    "Open",
    event.params.args.amount,
    event.params.args.assetPrice,
    event
  )
}

export function handleClosePosition(event: ClosePosition): void {
  const args = event.params.args
  const volume = args.amount.times(args.assetPrice).div(ONE)
  _handleTradeEvent(
    args.subAccountId,
    "Close",
    event.params.args.amount,
    event.params.args.assetPrice,
    event
  )
}

export function handleSetAssetParams(event: SetAssetParams): void {
  // let entry = new PositionFeeRate()
  let entity = PositionFeeRate.load(event.params.assetId.toString())
  if (!entity) {
    entity = new PositionFeeRate(event.params.assetId.toString())
  }
  entity.symbol = event.params.symbol
  entity.positionFeeRate = event.params.newPositionFeeRate
  entity.save()
}

