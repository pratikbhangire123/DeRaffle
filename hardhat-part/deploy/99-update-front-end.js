const { ethers, network } = require("hardhat")
const fs = require("fs")

const UPDATE_FRONT_END = process.env.UPDATE_FRONT_END
const FRONT_END_CONTRACT_ADDRESSES_FILE = ".././nextjs-part/constants/contract-addresses.json"
const FRONT_END_ABI_FILE = ".././nextjs-part/constants/abi.json"

module.exports = async function () {
    if (UPDATE_FRONT_END) {
        console.log("Updating front end...")
        updateContractAddresses()
        updateAbi()
        console.log("Front end updated!")
    }
}

async function updateAbi() {
    const raffle = await ethers.getContract("Raffle")
    fs.writeFileSync(FRONT_END_ABI_FILE, raffle.interface.format(ethers.utils.FormatTypes.json))
}

async function updateContractAddresses() {
    const raffle = await ethers.getContract("Raffle")
    const chainId = network.config.chainId.toString()
    const currentAddresses = JSON.parse(fs.readFileSync(FRONT_END_CONTRACT_ADDRESSES_FILE, "utf8"))
    if (chainId in currentAddresses) {
        if (!currentAddresses[chainId].includes(raffle.address)) {
            currentAddresses[chainId].push(raffle.address)
        }
    } else {
        currentAddresses[chainId] = [raffle.address]
    }
    fs.writeFileSync(FRONT_END_CONTRACT_ADDRESSES_FILE, JSON.stringify(currentAddresses))
}

module.exports.tags = ["all", "frontend"]
