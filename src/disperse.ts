import { BigInt } from "@graphprotocol/graph-ts"
import {
  DisperseReferrerRebate,
  DisperseTraderDiscount,
  Transfer
} from "../generated/Disperse/Disperse"
import {
  DistributionRecord,
  RebateDistributionStat,
  DiscountDistributionStat,
} from "../generated/schema"

const ONE = BigInt.fromString("1000000000000000000")

export function handleDisperseReferrerRebate(event: DisperseReferrerRebate): void {

  // - by referrer
  const referrer = event.params.referrer.toHexString()
  let stateByReferrer = RebateDistributionStat.load(referrer)
  if (!stateByReferrer) {
    stateByReferrer = new RebateDistributionStat(referrer)
    stateByReferrer.referrer = referrer
    stateByReferrer.referralCode = ""
  }
  stateByReferrer.totalRebate = stateByReferrer.totalRebate.plus(event.params.totalAmount)
  stateByReferrer.totalRebateUsd = stateByReferrer.totalRebateUsd.plus(event.params.totalAmount.times(event.params.usdPrice).div(ONE))
  stateByReferrer.timestamp = event.block.timestamp
  stateByReferrer.save()

  // by entry
  for (let i = 0; i < event.params.referralCodes.length; i++) {
    const referralCode = event.params.referralCodes[i].toHexString()
    const recipient = event.params.recipients[i].toHexString()
    const amount = event.params.amounts[i]

    const statByCodeId = referralCode
    let statByCode = RebateDistributionStat.load(statByCodeId)
    if (!statByCode) {
      statByCode = new RebateDistributionStat(statByCodeId)
      statByCode.referrer = referrer
      statByCode.referralCode = referralCode
      statByCode.recipient = recipient
    }
    statByCode.totalRebate = statByCode.totalRebate.plus(amount)
    statByCode.totalRebateUsd = statByCode.totalRebateUsd.plus(amount.times(event.params.usdPrice).div(ONE))
    statByCode.timestamp = event.params.epoch
    statByCode.save()
  }
}

export function handleDisperseTraderDiscount(event: DisperseTraderDiscount): void {
  for (let i = 0; i < event.params.traders.length; i++) {
    const trader = event.params.traders[i].toHexString()
    const amount = event.params.amounts[i]

    const stateByTraderId = `${trader}`
    let stateByTrader = DiscountDistributionStat.load(stateByTraderId)
    if (!stateByTrader) {
      stateByTrader = new DiscountDistributionStat(stateByTraderId)
      stateByTrader.trader = trader
    }
    stateByTrader.totalDiscount = stateByTrader.totalDiscount.plus(amount)
    stateByTrader.totalDiscountUsd = stateByTrader.totalDiscountUsd.plus(amount.times(event.params.usdPrice).div(ONE))
    stateByTrader.timestamp = event.params.epoch
    stateByTrader.save()
  }
}

export function handleTransfer(event: Transfer): void {
  let id = `${event.transaction.hash.toHexString()}-${event.transactionLogIndex.toString()}`
  let record = DistributionRecord.load(id)
  if (!record) {
    record = new DistributionRecord(id)
  }
  if (event.params.transferType == 0) {
    record.type = 'Rebate'
  } else if (event.params.transferType == 1) {
    record.type = 'Discount'
  } else {
    record.type = 'Other'
  }
  record.referralCode = event.params.referralCode.toHexString()
  record.recipient = event.params.recipient.toHexString()
  record.amount = event.params.amount

  record.transactionHash = event.transaction.hash.toHexString()
  record.transactionLogIndex = event.transactionLogIndex
  record.blockNumber = event.block.number
  record.timestamp = event.block.timestamp
  record.save()
}