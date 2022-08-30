import { BigInt, log } from "@graphprotocol/graph-ts"
import {
  SetTiers,
  SetReferralCode,
  RegisterReferralCode,
  SetRebateRecipient,
  TransferReferralCode,
} from "../generated/ReferralManager/ReferralManager"
import {
  Tier,
  ReferralCode,
  ReferrerSetRecord,
} from "../generated/schema"

export function handleSetTier(event: SetTiers): void {
  for (var i = 0; i < event.params.newTierSettings.length; i++) {
    const settings = event.params.newTierSettings[i]
    const id = settings.tier.toString()
    let entity = Tier.load(id)
    if (!entity) {
      entity = new Tier(id)
    }
    entity.stakeThreshold = settings.stakeThreshold
    entity.rebateRate = settings.rebateRate
    entity.discountRate = settings.discountRate
    entity.timestamp = event.block.timestamp
    entity.save()
  }
}

export function handleRegisterReferralCode(event: RegisterReferralCode): void {
  const id = event.params.referralCode.toHexString()
  let entity = ReferralCode.load(id)
  if (!entity) {
    entity = new ReferralCode(id)
  }
  const referrer = event.params.referralCodeOwner.toHexString()
  entity.code = event.params.referralCode.toHexString()
  entity.referrer = referrer
  entity.timestamp = event.block.timestamp
  entity.save()
}

export function handleSetRebateRecipient(event: SetRebateRecipient): void {
  const id = event.params.referralCode.toHexString()
  let entity = ReferralCode.load(id)
  if (!entity) {
    entity = new ReferralCode(id)
  }
  entity.recipient = event.params.rebateRecipient.toHexString()
  entity.save()
}

export function handleSetReferralCode(event: SetReferralCode): void {
  const id = event.params.trader.toHexString()
  let entity = ReferrerSetRecord.load(id)
  if (!entity) {
    entity = new ReferrerSetRecord(id)
  }
  entity.referralCode = event.params.referralCode.toHexString()
  entity.timestamp = event.block.timestamp
  entity.save()
}

export function handleTransferReferralCode(event: TransferReferralCode): void {
  const id = event.params.referralCode.toHexString()
  let entity = ReferralCode.load(id)
  if (entity) {
    entity.referrer = event.params.newOwner.toHexString()
    entity.timestamp = event.block.timestamp
    entity.save()
  }
}