import { ethers } from "ethers"
import { useEffect, useState } from "react"
import { useMoralis, useWeb3Contract } from "react-moralis"
import { abi, contractAddresses } from "../constants/index"
import { useNotification } from "web3uikit"

export default function LotteryEntrance() {
    const { chainId: chainIdHex, isWeb3Enabled } = useMoralis()
    const chainId = parseInt(chainIdHex)
    const raffleAddress = chainId in contractAddresses ? contractAddresses[chainId][0] : null
    const [entranceFee, setEntranceFee] = useState("0")
    const [numPlayers, setNumPlayers] = useState("0")
    const [recentWinner, setRecentWinner] = useState("0")
    const dispatch = useNotification()

    const {
        runContractFunction: enterRaffle,
        isLoading,
        isFetching,
    } = useWeb3Contract({
        abi: abi,
        contractAddress: raffleAddress,
        functionName: "enterRaffle",
        params: {},
        msgValue: entranceFee,
    })

    const { runContractFunction: getEntranceFee } = useWeb3Contract({
        abi: abi,
        contractAddress: raffleAddress,
        functionName: "getEntranceFee",
        params: {},
    })

    const { runContractFunction: getNumberOfPlayers } = useWeb3Contract({
        abi: abi,
        contractAddress: raffleAddress,
        functionName: "getNumberOfPlayers",
        params: {},
    })

    const { runContractFunction: getWinner } = useWeb3Contract({
        abi: abi,
        contractAddress: raffleAddress,
        functionName: "getWinner",
        params: {},
    })

    useEffect(() => {
        if (isWeb3Enabled) {
            updateUI()
        }
    }, [isWeb3Enabled])

    const handleSuccess = async (tx) => {
        await tx.wait(1)
        handleNotification(tx)
        updateUI()
    }

    const handleNotification = () => {
        dispatch({
            type: "info",
            message: "Transaction Completed!",
            title: "Transaction Notification",
            position: "topR",
            icon: "bell",
        })
    }

    const updateUI = async () => {
        const entranceFeeFromCall = (await getEntranceFee()).toString()
        const numberOfPlayers = (await getNumberOfPlayers()).toString()
        const recentWinnerAddress = await getWinner()
        setEntranceFee(entranceFeeFromCall)
        setNumPlayers(numberOfPlayers)
        setRecentWinner(recentWinnerAddress)
    }

    return (
        <div className="p-5">
            {raffleAddress ? (
                <div>
                    <div className="flex flex-row mb-10">
                        <button
                            className="py-2 px-3 font-bold rounded-md text-white bg-blue-500 hover:bg-blue-700"
                            onClick={async function () {
                                await enterRaffle({ onSuccess: handleSuccess })
                            }}
                            disabled={isLoading || isFetching}
                        >
                            {isLoading || isFetching ? (
                                <div className="animate-spin spinner-border h-8 w-8 border-b-2 rounded-full"></div>
                            ) : (
                                <div>Enter Raffle</div>
                            )}
                        </button>
                        <div className="ml-auto">
                            Entrance Fee: {ethers.utils.formatUnits(entranceFee, "ether")} ETH
                        </div>
                    </div>
                    <div>Total Players: {numPlayers}</div>
                    <div>Recent Winner: {recentWinner}</div>
                </div>
            ) : (
                <div>Raffle address is not detected!</div>
            )}
        </div>
    )
}
