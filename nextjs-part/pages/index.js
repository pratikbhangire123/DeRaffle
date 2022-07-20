import Head from "next/head"
import styles from "../styles/Home.module.css"
// import ManualHeader from "../components/manual-header"
import AutoHeader from "../components/auto-header"
import LotteryEntrance from "../components/lottery-entrance"

export default function Home() {
    return (
        <div className={styles.container}>
            <Head>
                <title>Raffle</title>
                <meta name="description" content="Our Smart Contract Lottery" />
                <link rel="icon" href="/favicon.ico" />
            </Head>
            {/* <ManualHeader /> */}
            <AutoHeader />
            <LotteryEntrance />
        </div>
    )
}
