import { ConnectButton } from "web3uikit"

export default function AutoHeader() {
    return (
        <div className="flex flex-row border-b-2">
            <h2 className="py-5 px-5 font-bold text-2xl">DeRaffle</h2>
            <div className="ml-auto py-5">
                <ConnectButton moralisAuth={false} />
            </div>
        </div>
    )
}
