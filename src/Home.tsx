import React, { useEffect, useState } from "react";
import styled from "styled-components";
import Countdown from "react-countdown";
import { Button, CircularProgress, Snackbar, Container, Box, Grid } from "@material-ui/core";
import Alert from "@material-ui/lab/Alert";
import logo from './imagenes/regular.png';
import capy1 from './imagenes/zombie.png';
import capy2 from './imagenes/dmt.png';
import capy3 from './imagenes/blue.png';
import capy4 from './imagenes/green.png';
import capy5 from './imagenes/purple.png';
import capy6 from './imagenes/gold.png';
import capy7 from './imagenes/regular2.png';
import { SocialIcon } from 'react-social-icons';
import './Home.css';

import * as anchor from "@project-serum/anchor";

import { LAMPORTS_PER_SOL } from "@solana/web3.js";

import { useAnchorWallet } from "@solana/wallet-adapter-react";
import { WalletDialogButton } from "@solana/wallet-adapter-material-ui";

import {
  CandyMachine,
  awaitTransactionSignatureConfirmation,
  getCandyMachineState,
  mintOneToken,
  shortenAddress,
} from "./candy-machine";

const ConnectButton = styled(WalletDialogButton)``;

const CounterText = styled.span``; // add your styles here

const MintContainer = styled.div``; // add your styles here

const MintButton = styled(Button)``; // add your styles here

export interface HomeProps {
  candyMachineId: anchor.web3.PublicKey;
  config: anchor.web3.PublicKey;
  connection: anchor.web3.Connection;
  startDate: number;
  treasury: anchor.web3.PublicKey;
  txTimeout: number;
}

const Home = (props: HomeProps) => {
  const [balance, setBalance] = useState<number>();
  const [isActive, setIsActive] = useState(false); // true when countdown completes
  const [isSoldOut, setIsSoldOut] = useState(false); // true when items remaining is zero
  const [isMinting, setIsMinting] = useState(false); // true when user got to press MINT

  const [itemsAvailable, setItemsAvailable] = useState(0);
  const [itemsRedeemed, setItemsRedeemed] = useState(0);
  const [itemsRemaining, setItemsRemaining] = useState(0);

  const [alertState, setAlertState] = useState<AlertState>({
    open: false,
    message: "",
    severity: undefined,
  });

  const [startDate, setStartDate] = useState(new Date(props.startDate));

  const wallet = useAnchorWallet();
  const [candyMachine, setCandyMachine] = useState<CandyMachine>();

  const refreshCandyMachineState = () => {
    (async () => {
      if (!wallet) return;

      const {
        candyMachine,
        goLiveDate,
        itemsAvailable,
        itemsRemaining,
        itemsRedeemed,
      } = await getCandyMachineState(
        wallet as anchor.Wallet,
        props.candyMachineId,
        props.connection
      );

      setItemsAvailable(itemsAvailable);
      setItemsRemaining(itemsRemaining);
      setItemsRedeemed(itemsRedeemed);

      setIsSoldOut(itemsRemaining === 0);
      setStartDate(goLiveDate);
      setCandyMachine(candyMachine);
    })();
  };

  const onMint = async () => {
    try {
      setIsMinting(true);
      if (wallet && candyMachine?.program) {
        const mintTxId = await mintOneToken(
          candyMachine,
          props.config,
          wallet.publicKey,
          props.treasury
        );

        const status = await awaitTransactionSignatureConfirmation(
          mintTxId,
          props.txTimeout,
          props.connection,
          "singleGossip",
          false
        );

        if (!status?.err) {
          setAlertState({
            open: true,
            message: "Congratulations! Mint succeeded!",
            severity: "success",
          });
        } else {
          setAlertState({
            open: true,
            message: "Mint failed! Please try again!",
            severity: "error",
          });
        }
      }
    } catch (error: any) {
      // TODO: blech:
      let message = error.msg || "Minting failed! Please try again!";
      if (!error.msg) {
        if (error.message.indexOf("0x138")) {
        } else if (error.message.indexOf("0x137")) {
          message = `SOLD OUT!`;
        } else if (error.message.indexOf("0x135")) {
          message = `Insufficient funds to mint. Please fund your wallet.`;
        }
      } else {
        if (error.code === 311) {
          message = `SOLD OUT!`;
          setIsSoldOut(true);
        } else if (error.code === 312) {
          message = `Minting period hasn't started yet.`;
        }
      }

      setAlertState({
        open: true,
        message,
        severity: "error",
      });
    } finally {
      if (wallet) {
        const balance = await props.connection.getBalance(wallet.publicKey);
        setBalance(balance / LAMPORTS_PER_SOL);
      }
      setIsMinting(false);
      refreshCandyMachineState();
    }
  };

  useEffect(() => {
    (async () => {
      if (wallet) {
        const balance = await props.connection.getBalance(wallet.publicKey);
        setBalance(balance / LAMPORTS_PER_SOL);
      }
    })();
  }, [wallet, props.connection]);

  useEffect(refreshCandyMachineState, [
    wallet,
    props.candyMachineId,
    props.connection,
  ]);

  return (

    <main>

<Grid container spacing={3}>
   <Grid item xs={12}>

  <div className="center-image">
          <img src={logo} alt="Logo" width="200" height="200"/>
  </div>          
   
  </Grid>

  <Grid item xs={12}>

<div className="center-image">
        <h1>
        Solana Capybaras
        </h1>
</div>          
 
</Grid>

  <Grid item xs={5}>
            
  </Grid>
  <Grid item xs={2}>

  <div className="center-image">


  {wallet && (
        <p>Wallet {shortenAddress(wallet.publicKey.toBase58() || "")}</p>
      )}

      {wallet && <p>Balance: {(balance || 0).toLocaleString()} SOL</p>}

      {wallet && <p>Total Available: {itemsAvailable}</p>}

      {wallet && <p>Redeemed: {itemsRedeemed}</p>}

      {wallet && <p>Remaining: {itemsRemaining}</p>}

      <MintContainer>
        {!wallet ? (
          
          <ConnectButton>Connect Wallet</ConnectButton>
        
        ) : (
          <MintButton
            disabled={isSoldOut || isMinting || !isActive}
            onClick={onMint}
            variant="contained"
          >
            {isSoldOut ? (
              "SOLD OUT"
            ) : isActive ? (
              isMinting ? (
                <CircularProgress />
              ) : (
                "MINT"
              )
            ) : (
              <Countdown
                date={startDate}
                onMount={({ completed }) => completed && setIsActive(true)}
                onComplete={() => setIsActive(true)}
                renderer={renderCounter}
              />
            )}
          </MintButton>
        )}
      </MintContainer>

      <Snackbar
        open={alertState.open}
        autoHideDuration={6000}
        onClose={() => setAlertState({ ...alertState, open: false })}
      >
        <Alert
          onClose={() => setAlertState({ ...alertState, open: false })}
          severity={alertState.severity}
        >
          {alertState.message}
        </Alert>
      </Snackbar>

      </div> 

  </Grid>
  <Grid item xs={2}>
  </Grid>

  <Grid item xs={12}>

  <div className="center-image">
        <h3>
        3333 capybaras randomly generated from more than 87 traits, chilling on the solana network, free to mint(just pay the fees)!! 
        </h3>
  </div>       
  
  </Grid>

  <Grid item xs={12}>

  <div className="center-image">
  
              <h2>
                Road Map 1.0
              </h2>

<h3>{'\u2728'}We aim to create a great community, this roadmap is open to new ideas and changes</h3>

<h3>- Generate the art 3333 pixel capybaras{'\u2705'}</h3>

<h3>- Create the Web Page{'\u2705'}</h3>

<h3>- drop the capys{'\u2705'}</h3>

<h3>- giveaway at 50% claimed</h3>

<h3>- giveaway at 100% capys claimed</h3>

<h3>- release capys rarity</h3>

<h3>- publish capys collection on nft markets</h3>

<h3>- Generate token</h3>

  </div>
  
  </Grid>

  <Grid item xs={12}>

  <div className="center-image">

  <h2>types of capys  </h2>

  <h3>there are 10 unique surprise 1/1 capys{'\u2728'} and the rest are </h3>

  <div className="center-image">
          <img src={capy1} alt="capy1" width="200" height="200"/>
          <h4>zombie</h4>
          <br></br>
  </div> 

  <div className="center-image">
          <img src={capy2} alt="capy2" width="200" height="200"/>
          <h4>dmt</h4>
          <br></br>
  </div> 

  <div className="center-image">
          <img src={capy3} alt="capy3" width="200" height="200"/>
          <h4>blue</h4>
          <br></br>
  </div> 

  <div className="center-image">
          <img src={capy4} alt="capy4" width="200" height="200"/>
          <h4>green</h4>
          <br></br>
  </div> 

  <div className="center-image">
          <img src={capy5} alt="capy5" width="200" height="200"/>
          <h4>purple</h4>
          <br></br>
  </div> 

  <div className="center-image">
          <img src={capy6} alt="capy6" width="200" height="200"/>
          <h4>golden</h4>
          <br></br>
  </div> 

  <div className="center-image">
          <img src={capy7} alt="capy7" width="200" height="200"/>
          <h4>regular</h4>
          <br></br>
  </div> 
  </div>

  </Grid>

  <Grid item xs={4}>

  

  </Grid>
  <Grid item xs={4}>

  <div className="center-image">

  <SocialIcon url="https://twitter.com/solcapys" />

  <SocialIcon url="https://discord.com/invite/MbUQjbDTJ3"/>

  </div>

  </Grid>
  <Grid item xs={4}>

  </Grid>

</Grid>

    
    </main>
  );
};

interface AlertState {
  open: boolean;
  message: string;
  severity: "success" | "info" | "warning" | "error" | undefined;
}

const renderCounter = ({ days, hours, minutes, seconds, completed }: any) => {
  return (
    <CounterText>
      {hours + (days || 0) * 24} hours, {minutes} minutes, {seconds} seconds
    </CounterText>
  );
};

export default Home;
