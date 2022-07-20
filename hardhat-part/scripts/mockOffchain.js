const { ethers, network } = require("hardhat")

async function mockKeepers() {
    const raffle = await ethers.getContract("Raffle")
    const checkData = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(""))
    const { upkeepNeeded } = await raffle.callStatic.checkUpkeep(checkData)

    console.log(`Got the data...${upkeepNeeded}`)

    if (upkeepNeeded) {
        console.log("Entered upkeepNeeded if statement...")
        const transaction = await raffle.performUpkeep(checkData)
        const transactionReceipt = await transaction.wait(1)
        const requestId = transactionReceipt.events[1].args.requestId
        console.log(`Performed upkeep with requestId: ${requestId}`)
        if (network.config.chainId == 31337) {
            await mockVrf(requestId, raffle)
        }
    } else {
        console.log("No Upkeep is needed!")
    }
}

async function mockVrf(requestId, raffle) {
    console.log("Are we on a local network? OK! let's pretend...")
    const vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
    await vrfCoordinatorV2Mock.fulfillRandomWords(requestId, raffle.address)
    console.log("Responded!")
    const recentWinner = await raffle.getWinner()
    console.log(`The winner is: ${recentWinner}`)
}

mockKeepers()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
