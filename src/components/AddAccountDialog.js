import React, { useState } from 'react';
import DialogActions from '@material-ui/core/DialogActions';
import Button from '@material-ui/core/Button';
import DialogTitle from '@material-ui/core/DialogTitle';
import DialogContent from '@material-ui/core/DialogContent';
import TextField from '@material-ui/core/TextField';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import FormGroup from '@material-ui/core/FormGroup';
import Switch from '@material-ui/core/Switch';
import Typography from '@material-ui/core/Typography';
import { Account } from '@solana/web3.js';
import * as bs58 from 'bs58';
import DialogForm from './DialogForm';
import { useTkeyLogin, useTkeyPostboxKey } from '../utils/tkey/tkey';

function TkeyForm(props) {
  const tkeyLogin = useTkeyLogin();
  const loginFn = async () => {
    await tkeyLogin();
    props.onClose();
  };
  return (
    <>
      <div>
        <Button
          style={{ height: '50px' }}
          fullWidth
          onClick={loginFn}
          variant="outlined"
        >
          Sign in With Google
        </Button>
      </div>
      <Typography
        align="center"
        style={{ marginTop: '20px', marginBottom: '20px' }}
      >
        Or
      </Typography>
    </>
  );
}

export default function AddAccountDialog({ open, onAdd, onClose }) {
  const [name, setName] = useState('');
  const [isImport, setIsImport] = useState(false);
  const [importedPrivateKey, setPrivateKey] = useState('');

  const postboxKey = useTkeyPostboxKey();

  const importedAccount = isImport
    ? decodeAccount(importedPrivateKey)
    : undefined;
  const isAddEnabled = isImport ? name && importedAccount !== undefined : name;

  return (
    <DialogForm
      open={open}
      onClose={onClose}
      onSubmit={() => onAdd({ name, importedAccount })}
      fullWidth
    >
      <DialogTitle>Add account</DialogTitle>
      <DialogContent style={{ paddingTop: 16 }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {!postboxKey ? <TkeyForm onClose={onClose} /> : null}
          <TextField
            label="Name"
            fullWidth
            variant="outlined"
            margin="normal"
            value={name}
            onChange={(e) => setName(e.target.value.trim())}
          />
          <FormGroup>
            <FormControlLabel
              control={
                <Switch
                  checked={isImport}
                  onChange={() => setIsImport(!isImport)}
                />
              }
              label="Import private key"
            />
          </FormGroup>
          {isImport && (
            <TextField
              label="Paste your private key here"
              fullWidth
              type="password"
              value={importedPrivateKey}
              variant="outlined"
              margin="normal"
              onChange={(e) => setPrivateKey(e.target.value.trim())}
            />
          )}
        </div>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        <Button type="submit" color="primary" disabled={!isAddEnabled}>
          Add
        </Button>
      </DialogActions>
    </DialogForm>
  );
}

function decodeAccount(privateKey) {
  try {
    const a = new Account(bs58.decode(privateKey));
    return a;
  } catch (_) {
    return undefined;
  }
}
