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
  const [thresholdKeyInstance, setThresholdKeyInstance] = useState({});

  useEffect(() => {
    const init = async () => {
      const instance = new ThresholdKeyController();
      await instance._init(postboxKey);
      setThresholdKeyInstance(instance);
    };
    console.log('calling effect');
    init();
  }, [postboxKey]);

  return (
    <TkeyContext.Provider
      value={{ thresholdKeyInstance, postboxKey, setPostboxKey }}
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
  const { thresholdKeyInstance } = useContext(TkeyContext);
  const { addAccount, setWalletSelector } = useWalletSelector();
  const fn = async (share) => {
    await thresholdKeyInstance.addDeviceShare(share);
    const { privKey } = thresholdKeyInstance;
    console.log('adding account', privKey);
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
  return { flag: thresholdKeyInstance.isPasswordInputRequired, action: fn };
}

const fromHexString = (hexString) =>
  new Uint8Array(hexString.match(/.{1,2}/g).map((byte) => parseInt(byte, 16)));
