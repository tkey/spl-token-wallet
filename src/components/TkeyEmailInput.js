import React, { useState } from 'react';
import {
  DialogActions,
  Button,
  DialogTitle,
  DialogContent,
  TextField,
  Typography,
} from '@material-ui/core';
import DialogForm from './DialogForm';

export default function TkeyEmailInputDialog({ open, onAdd, recoveryShare }) {
  const [recoveryEmail, setRecoveryEmail] = useState('');

  return (
    <DialogForm open={open} onSubmit={() => onAdd(recoveryEmail)} fullWidth>
      <DialogTitle>Enter Recovery Email</DialogTitle>
      <DialogContent style={{ paddingTop: 16 }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Typography>Here is your recovery mnemonic share</Typography>
          <br />
          <code>{recoveryShare}</code>
          <br />
          <TextField
            label="Please enter a recovery email"
            fullWidth
            value={recoveryEmail}
            variant="outlined"
            margin="normal"
            type="email"
            onChange={(e) => setRecoveryEmail(e.target.value.trim())}
          />
        </div>
      </DialogContent>
      <DialogActions>
        <Button type="submit" color="primary">
          Confirm
        </Button>
      </DialogActions>
    </DialogForm>
  );
}
