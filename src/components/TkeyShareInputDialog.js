import React, { useState } from 'react';
import {
  DialogActions,
  Button,
  DialogTitle,
  DialogContent,
  TextField,
} from '@material-ui/core';
import DialogForm from './DialogForm';

export default function TkeyShareInputDialog({ open, onAdd }) {
  const [importedShare, setImportedShare] = useState('');

  return (
    <DialogForm open={open} onSubmit={() => onAdd(importedShare)} fullWidth>
      <DialogTitle>Enter Share Mnemonic</DialogTitle>
      <DialogContent style={{ paddingTop: 16 }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <TextField
            label="Paste your share mnemonic"
            fullWidth
            type="password"
            value={importedShare}
            variant="outlined"
            margin="normal"
            onChange={(e) => setImportedShare(e.target.value.trim())}
          />
        </div>
      </DialogContent>
      <DialogActions>
        <Button type="submit" color="primary">
          Add
        </Button>
      </DialogActions>
    </DialogForm>
  );
}
