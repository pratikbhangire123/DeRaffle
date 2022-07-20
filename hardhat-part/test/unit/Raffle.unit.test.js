const { assert, expect } = require("chai")
const { deployments, getNamedAccounts, ethers, network } = require("hardhat")
const { developmentChains, netowrkConfig } = require("../../helper-hardhat-config")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Raffle Unit Test", function () {
          let raffle
          let deployer
          let vrfCoordinatorV2Mock
          let raffleEntranceFee
          let interval
          const chainId = network.config.chainId

          beforeEach(async function () {
              deployer = (await getNamedAccounts()).deployer
              await deployments.fixture(["all"])
              raffle = await ethers.getContract("Raffle", deployer)
              vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock", deployer)
              raffleEntranceFee = await raffle.getEntranceFee()
              interval = await raffle.getInterval()
          })

          describe("constructor", function () {
              it("Sets the VRF address correctly!", async function () {
                  const addressResponse = await raffle.getVRFCoordinator()
                  assert.equal(addressResponse, vrfCoordinatorV2Mock.address)
              })

              it("Sets entrance fees!", async function () {
                  assert.equal(raffleEntranceFee.toString(), netowrkConfig[chainId]["entranceFee"])
              })

              it("Sets gas lane!", async function () {
                  const gasLaneResponse = await raffle.getGasLane()
                  assert.equal(gasLaneResponse.toString(), netowrkConfig[chainId]["gasLane"])
              })

              //This test passes but not sure about the comparison set-up!
              it("Sets subscription ID!", async function () {
                  const subscriptionIdResponse = await raffle.getSubscriptionId()
                  assert.equal(subscriptionIdResponse.toString(), "1")
              })

              it("Sets callback gas limit!", async function () {
                  const callbackGasLimitResponse = await raffle.getCallbackGasLimit()
                  assert.equal(callbackGasLimitResponse, netowrkConfig[chainId]["callbackGasLimit"])
              })

              it("Sets interval!", async function () {
                  assert.equal(interval, netowrkConfig[chainId]["interval"])
              })

              it("Checks raffle state is OPEN or not!", async function () {
                  const raffleState = await raffle.getRaffleState()
                  assert.equal(raffleState.toString(), "0")
              })
          })

          describe("enterRaffle", function () {
              it("Reverts when entranceFee is not enough!", async function () {
                  await expect(raffle.enterRaffle()).to.be.revertedWithCustomError(
                      raffle,
                      "Raffle__NotEnoughETHEntered"
                  )
              })
              it("Pushes player into an array!", async function () {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  const playerResponse = await raffle.getPlayers(0)
                  assert.equal(playerResponse, deployer)
              })
              it("Emits RaffleEnter event!", async function () {
                  await expect(raffle.enterRaffle({ value: raffleEntranceFee })).to.emit(
                      raffle,
                      "RaffleEnter"
                  )
              })
              it("Doesn't allow entrance when raffle is calculating!", async function () {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.send("evm_mine", [])

                  await raffle.performUpkeep([])
                  await expect(
                      raffle.enterRaffle({ value: raffleEntranceFee })
                  ).to.be.revertedWithCustomError(raffle, "Raffle__NotOpen")
              })
          })

          describe("checkUpkeep", function () {
              it("Returns false if people haven't sent any ETH!", async function () {
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.send("evm_mine", [])
                  const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([])
                  assert(!upkeepNeeded)
              })
              it("Returns false if raffleState is not OPEN!", async function () {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.send("evm_mine", [])
                  await raffle.performUpkeep([])
                  const raffleState = await raffle.getRaffleState()
                  const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([])
                  assert.equal(raffleState.toString(), "1")
                  assert.equal(upkeepNeeded, false)
              })
              it("Returns false if enough time hasn't passed!", async function () {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  await network.provider.send("evm_increaseTime", [interval.toNumber() - 1])
                  await network.provider.request({ method: "evm_mine", params: [] })
                  const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([])
                  assert(!upkeepNeeded)
              })
              it("Returns true if enough time has passed, has players, has ETH, and is OPEN!", async function () {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.request({ method: "evm_mine", params: [] })
                  const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([])
                  assert(upkeepNeeded)
              })
          })

          describe("performUpkeep", function () {
              it("Runs only when checkUpkeep is true!", async function () {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.request({ method: "evm_mine", params: [] })
                  const transaction = await raffle.performUpkeep([])
                  assert(transaction)
              })
              it("Reverts when checkUpkeep is false!", async function () {
                  await expect(raffle.performUpkeep([])).to.be.revertedWithCustomError(
                      raffle,
                      "Raffle__UpkeepNotNeeded"
                  )
              })
              it("Updates the raffleState and emits the requestId!", async function () {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.request({ method: "evm_mine", params: [] })
                  const transactionResponse = await raffle.performUpkeep([])
                  const transactionReceipt = await transactionResponse.wait(1)
                  const raffleState = await raffle.getRaffleState()
                  const requestId = transactionReceipt.events[1].args.requestId
                  assert(requestId.toString() > 0)
                  assert(raffleState == 1)
              })
          })

          describe("fullfillRandomWords", function () {
              beforeEach(async function () {
                  await raffle.enterRaffle({ value: raffleEntranceFee })
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.request({ method: "evm_mine", params: [] })
              })

              it("Get called only after performUpkeep", async function () {
                  await expect(
                      vrfCoordinatorV2Mock.fulfillRandomWords(0, raffle.address)
                  ).to.be.revertedWith("nonexistent request")
                  await expect(
                      vrfCoordinatorV2Mock.fulfillRandomWords(1, raffle.address)
                  ).to.be.revertedWith("nonexistent request")
              })
              it("Picks a winner, resets, and sends money!", async function () {
                  const additionalEntrances = 3
                  const startingIndex = 1
                  const accounts = await ethers.getSigners()

                  for (let i = startingIndex; i < startingIndex + additionalEntrances; i++) {
                      const accountConnectedRaffle = raffle.connect(accounts[i])
                      await accountConnectedRaffle.enterRaffle({ value: raffleEntranceFee })
                  }

                  const startingTimestamp = await raffle.getLastTimeStamp()

                  await new Promise(async function (resolve, reject) {
                      raffle.once("WinnerPicked", async function () {
                          console.log("WinnerPicked event emitted!")

                          try {
                              const recentWinner = await raffle.getWinner()
                              const raffleState = await raffle.getRaffleState()
                              const endingTimestamp = await raffle.getLastTimeStamp()
                              const numPlayers = await raffle.getNumberOfPlayers()
                              const winnerBalance = await accounts[1].getBalance()

                              assert.equal(numPlayers.toString(), "0")
                              assert.equal(raffleState.toString(), "0")
                              assert(endingTimestamp > startingTimestamp)
                              assert.equal(
                                  winnerBalance.toString(),
                                  startingBalance
                                      .add(
                                          raffleEntranceFee
                                              .mul(additionalEntrances)
                                              .add(raffleEntranceFee)
                                      )
                                      .toString()
                              )

                              resolve()
                          } catch (error) {
                              reject(error)
                          }
                      })
                      const transactionResponse = await raffle.performUpkeep([])
                      const transactionReceiept = await transactionResponse.wait(1)
                      const startingBalance = await accounts[1].getBalance()
                      await vrfCoordinatorV2Mock.fulfillRandomWords(
                          transactionReceiept.events[1].args.requestId,
                          raffle.address
                      )
                  })
              })
          })
      })
