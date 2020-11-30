import React, { useContext, useEffect, useState } from 'react';
import { Account } from '@solana/web3.js';
import nacl from 'tweetnacl';

import { useLocalStorageState } from '../utils';
import { ThresholdKeyController } from './ThresholdKeyController';
import { useWalletSelector } from '../wallet';

const TkeyContext = React.createContext(null);

export function TkeyProvider({ children }) {
  // postboxKey is the google login key. If it's available, use it. Else, we need to log the user in
  const [postboxKey, setPostboxKey] = useLocalStorageState('postboxKey', '');
  const [mnemonicShare, setMnemonicShare] = useLocalStorageState(
    'mnemonicShare',
    '',
  );
  const [thresholdKeyInstance, setThresholdKeyInstance] = useState({});

  useEffect(() => {
    const init = async () => {
      if (Object.keys(thresholdKeyInstance).length === 0) {
        const instance = new ThresholdKeyController();
        await instance._init(postboxKey, mnemonicShare);
        setThresholdKeyInstance(instance);
      }
    };
    console.log('calling effect');
    init();
  }, [mnemonicShare, postboxKey, thresholdKeyInstance]);

  return (
    <TkeyContext.Provider
      value={{
        thresholdKeyInstance,
        postboxKey,
        setPostboxKey,
        mnemonicShare,
        setMnemonicShare,
      }}
    >
      {children}
    </TkeyContext.Provider>
  );
}

export function useTkeyPostboxKey() {
  return useContext(TkeyContext).postboxKey;
}

export function useTkeyLogin() {
  const { thresholdKeyInstance, setPostboxKey } = useContext(TkeyContext);
  const { addAccount, setWalletSelector } = useWalletSelector();
  console.log('using tkey login', thresholdKeyInstance);
  const loginFn = async () => {
    await thresholdKeyInstance.login();
    const { privKey, postboxKey } = thresholdKeyInstance;
    setPostboxKey(postboxKey);
    console.log('adding account', privKey);
    if (!privKey) return;
    const tkeyAccount = new Account(
      nacl.sign.keyPair.fromSeed(
        fromHexString(privKey.padStart(64, 0)),
      ).secretKey,
    );
    addAccount({
      name: 'TKey',
      importedAccount: tkeyAccount,
      isTkey: true,
    });
    setWalletSelector({
      walletIndex: undefined,
      importedPubkey: tkeyAccount.publicKey.toString(),
    });
  };
  return loginFn;
}

export function useTkeyShareInput() {
  const { thresholdKeyInstance, setMnemonicShare } = useContext(TkeyContext);
  const { addAccount, setWalletSelector } = useWalletSelector();
  const fn = async (share) => {
    await thresholdKeyInstance.inputExternalShare(share);
    await thresholdKeyInstance.finalizeTKey();
    setMnemonicShare(share);
    const { privKey } = thresholdKeyInstance;
    console.log('adding account', privKey);
    if (!privKey) return;
    const tkeyAccount = new Account(
      nacl.sign.keyPair.fromSeed(
        fromHexString(privKey.padStart(64, 0)),
      ).secretKey,
    );
    addAccount({
      name: 'TKey',
      importedAccount: tkeyAccount,
      isTkey: true,
    });
    setWalletSelector({
      walletIndex: undefined,
      importedPubkey: tkeyAccount.publicKey.toString(),
    });
  };
  return {
    flag: thresholdKeyInstance.isShareInputRequired || false,
    action: fn,
  };
}

export function useTkeyRecoveryEmailInput() {
  const { thresholdKeyInstance } = useContext(TkeyContext);
  const { addAccount, setWalletSelector } = useWalletSelector();

  const fn = async (email) => {
    thresholdKeyInstance.recoveryEmail = email;
    await thresholdKeyInstance.finalizeTKey();
    const { privKey } = thresholdKeyInstance;
    console.log('adding account', privKey);
    if (!privKey) return;
    const tkeyAccount = new Account(
      nacl.sign.keyPair.fromSeed(
        fromHexString(privKey.padStart(64, 0)),
      ).secretKey,
    );
    addAccount({
      name: 'TKey',
      importedAccount: tkeyAccount,
      isTkey: true,
    });
    setWalletSelector({
      walletIndex: undefined,
      importedPubkey: tkeyAccount.publicKey.toString(),
    });
  };
  return {
    flag: thresholdKeyInstance.isRecoveryMailRequired || false,
    action: fn,
  };
}

const fromHexString = (hexString) =>
  new Uint8Array(hexString.match(/.{1,2}/g).map((byte) => parseInt(byte, 16)));
