export const DEFAULT_GAS_PRICE = 100
export const DEFAULT_MAX_GAS_UNITS = 100000

export const RPC_URL = "https://rpc-testnet.supra.com"

export const COIN_TYPES = {
  HUSDC: "0x6c4a3aa30f7b1f40e5e5e9c0091b0897775afc8076ebe5d63e2d3dcca48c994f::hyper_coin::HyperUsdcCoin",
  SUP: "0x1::supra_coin::SupraCoin",
  ETH: "0x8ede5b689d5ac487c3ee48ceabe28ae061be74071c86ffe523b7f42acda2fcb7::test_eth::TestETH",
  WSUP: "0xc2897d119fb2a69e7e2cec7ec16e65aac5ee9751a8b75150468f7dd3e9ff13e::WSupraCoin::WSupraCoin"
} as const 