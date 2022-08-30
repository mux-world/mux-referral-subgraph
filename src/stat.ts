import { BigInt } from "@graphprotocol/graph-ts"
import {
  ReferralStat,
  TraderStat
} from "../generated/schema"

const ONE = BigInt.fromString("1")

export function getTimePostfix(timestamp: BigInt, period: String): string {
  if (period === "total") {
    return ""
  }
  let delimeter = BigInt.fromI32(1)
  if (period === "daily") {
    delimeter = BigInt.fromI32(86400)
  } else if (period === "weekly") {
    delimeter = BigInt.fromI32(86400 * 7)
  }
  return timestamp.div(delimeter).times(delimeter).toString()
}


export function updateReferrerStat(
  id: string,
  epochKey: string,
  referralCode: string,
  volume: BigInt,
  feeUsd: BigInt
): void {
  let cumReferralStat = ReferralStat.load(id)
  if (!cumReferralStat) {
    cumReferralStat = new ReferralStat(id)
    cumReferralStat.referralCode = referralCode
    cumReferralStat.epochKey = "" // general record has no epoch key
    cumReferralStat.totalVolume = volume
    cumReferralStat.totalFeeUsd = feeUsd
    cumReferralStat.totalReferralTrade = ONE
  } else {
    cumReferralStat.totalVolume = cumReferralStat.totalVolume.plus(volume)
    cumReferralStat.totalFeeUsd = cumReferralStat.totalFeeUsd.plus(feeUsd)
    cumReferralStat.totalReferralTrade = cumReferralStat.totalReferralTrade.plus(ONE)
  }
  cumReferralStat.save()

  let weeklyReferralStat = ReferralStat.load(`${id}-${epochKey}`)
  // if weekly snapshot not exist, create it from cum stats
  if (!weeklyReferralStat) {
    weeklyReferralStat = new ReferralStat(`${id}-${epochKey}`)
    weeklyReferralStat.epochKey = epochKey
    weeklyReferralStat.referralCode = cumReferralStat.referralCode
  }
  weeklyReferralStat.deltaVolume = weeklyReferralStat.deltaVolume.plus(volume)
  weeklyReferralStat.deltaFeeUsd = weeklyReferralStat.deltaFeeUsd.plus(feeUsd)
  weeklyReferralStat.deltaReferralTrade = weeklyReferralStat.deltaReferralTrade.plus(ONE)
  weeklyReferralStat.totalVolume = cumReferralStat.totalVolume
  weeklyReferralStat.totalFeeUsd = cumReferralStat.totalFeeUsd
  weeklyReferralStat.totalReferralTrade = cumReferralStat.totalReferralTrade
  weeklyReferralStat.save()
}

export function updateTraderStat(
  id: string,
  epochKey: string,
  trader: string,
  referralCode: string,
  volume: BigInt,
  feeUsd: BigInt
): void {
  let cumTraderStat = TraderStat.load(id)
  if (!cumTraderStat) {
    cumTraderStat = new TraderStat(id)
    cumTraderStat.trader = trader
    cumTraderStat.referralCode = referralCode
    cumTraderStat.epochKey = ""
    cumTraderStat.totalVolume = volume
    cumTraderStat.totalFeeUsd = feeUsd
    cumTraderStat.totalReferralTrade = ONE
  } else {
    cumTraderStat.totalVolume = cumTraderStat.totalVolume.plus(volume)
    cumTraderStat.totalFeeUsd = cumTraderStat.totalFeeUsd.plus(feeUsd)
    cumTraderStat.totalReferralTrade = cumTraderStat.totalReferralTrade.plus(ONE)
  }
  cumTraderStat.save()

  let weeklyTraderStat = TraderStat.load(`${id}-${epochKey}`)
  if (!weeklyTraderStat) {
    weeklyTraderStat = new TraderStat(`${id}-${epochKey}`)
    weeklyTraderStat.trader = trader
    weeklyTraderStat.epochKey = epochKey
    weeklyTraderStat.referralCode = referralCode
  }
  weeklyTraderStat.deltaVolume = weeklyTraderStat.deltaVolume.plus(volume)
  weeklyTraderStat.deltaFeeUsd = weeklyTraderStat.deltaFeeUsd.plus(feeUsd)
  weeklyTraderStat.deltaReferralTrade = weeklyTraderStat.deltaReferralTrade.plus(ONE)
  weeklyTraderStat.totalVolume = cumTraderStat.totalVolume
  weeklyTraderStat.totalFeeUsd = cumTraderStat.totalFeeUsd
  weeklyTraderStat.totalReferralTrade = cumTraderStat.totalReferralTrade
  weeklyTraderStat.save()
}