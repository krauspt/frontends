import { useEffect, useMemo, useState } from "react"

import { CHAIN_ID } from "@/constants"
import { useIsSmartContractWallet, usePriceFee } from "@/hooks"
import { toTokenDisplay } from "@/utils"

function useSufficientBalance(
  selectedToken: any,
  networksAndSigner?: any,
  amount?: bigint,
  estimatedGasCost?: bigint,
  tokenBalance: bigint = BigInt(0),
  isCorrectNetwork?: boolean,
) {
  const [sufficientBalance, setSufficientBalance] = useState(false)
  const [warning, setWarning] = useState("")
  const { isSmartContractWallet } = useIsSmartContractWallet()
  const { getPriceFee } = usePriceFee()

  const isL1 = useMemo(() => selectedToken.chainId === CHAIN_ID.L1, [selectedToken])

  useEffect(() => {
    async function checkEnoughBalance() {
      if (!isCorrectNetwork) {
        return
      }
      if (!(amount && networksAndSigner && networksAndSigner.signer)) {
        setWarning("")
        return setSufficientBalance(false)
      }

      let totalCost: bigint
      let fee: bigint
      let enoughFeeBalance: boolean
      let enoughTokenBalance: boolean
      let message: string = ""

      if (selectedToken.native) {
        fee = await getPriceFee(selectedToken, isL1)
        totalCost = amount + (estimatedGasCost ?? BigInt(0)) + fee
        enoughFeeBalance = tokenBalance >= totalCost
        enoughTokenBalance = enoughFeeBalance
      } else {
        fee = await getPriceFee(selectedToken, isL1)
        totalCost = (estimatedGasCost ?? BigInt(0)) + fee
        enoughFeeBalance = tokenBalance >= totalCost
        enoughTokenBalance = tokenBalance >= amount
      }

      if (enoughFeeBalance && enoughTokenBalance) {
        setWarning("")
        return setSufficientBalance(true)
      }

      if (!enoughFeeBalance) {
        const diff = tokenBalance - fee - (estimatedGasCost ?? BigInt(0))
        message = `Insufficient balance to cover the cost of tx. The amount should be less than ${toTokenDisplay(diff)} ${selectedToken.symbol}`

        if (!selectedToken.native) {
          message = "Insufficient balance to cover the cost of tx. Please add ETH to pay for tx fees."
        }
      } else if (!enoughTokenBalance) {
        message = `Insufficient ${selectedToken.symbol} balance.`
      }

      setWarning(message)
      setSufficientBalance(false)
    }

    // NOTE: For now, no accommodations are made for the tx sender
    // if they do not have enough funds to pay for the relay tx.
    // It's kind of complicated to handle, because for the case when the SC wallet has more than owner
    // is not possible to know who of them will be the one who executes the TX.
    // We will trust on the wallet UI to handle this issue for now.
    if (isSmartContractWallet) {
      setSufficientBalance(true)
    } else {
      checkEnoughBalance()
    }
  }, [networksAndSigner, amount?.toString(), estimatedGasCost?.toString(), tokenBalance.toString()])

  return {
    sufficientBalance,
    warning,
  }
}
export default useSufficientBalance
