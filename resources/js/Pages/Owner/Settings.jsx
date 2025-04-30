import React from 'react';
import { Box, Typography, TextField, Button, Paper } from '@mui/material';

export default function Settings() {
  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" gutterBottom>
        Settings
      </Typography>
      <Paper elevation={2} sx={{ mt: 3, p: 2 }}>
        <Typography variant="h6">Global Settings</Typography>
        <TextField
          label="Club Name"
          fullWidth
          sx={{ mt: 2 }}
        />
        <TextField
          label="Contact Email"
          fullWidth
          sx={{ mt: 2 }}
        />
        <Button variant="contained" sx={{ mt: 2, backgroundColor: 'black', color: 'white' }}>
          Save Changes
        </Button>
      </Paper>
    </Box>
  );
}
