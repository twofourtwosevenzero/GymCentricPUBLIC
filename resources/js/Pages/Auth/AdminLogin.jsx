import React, { useState } from 'react';
import axios from 'axios';
import { AppProvider } from '@toolpad/core/AppProvider';

import { useTheme } from '@mui/material/styles';
import {
  TextField,
  Button,
  Box,
  Typography,
  IconButton,
  InputAdornment,
  Alert,
} from '@mui/material';
import { Email, Lock, Visibility, VisibilityOff, ArrowBack } from '@mui/icons-material';

const BRANDING = {
  logo: (
    <img
      src="/imgs/lg.png"
      alt="Logo"
      style={{ maxWidth: '100%', height: 'auto' }}
    />
  ),
  title: 'Admin Login',
};

export default function AdminLogin() {
  const theme = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(''); // General error message

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); // Clear previous errors on submission

    try {
      const response = await axios.post('/admin/login', {
        email,
        password,
      });

      if (response.data.success) {
        window.location.href = response.data.redirect;
      }
    } catch (error) {
      if (error.response?.status === 422) {
        setError(error.response.data.errors.general); // Set general error message
      } else {
        setError('Something went wrong. Please try again.');
      }
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword((prev) => !prev);
  };

  return (
    <AppProvider branding={BRANDING} theme={theme}>
      {/* Enhanced Back Button on the Top Left */}
      <Button
        variant="contained"
        onClick={() => (window.location.href = '/')}
        startIcon={<ArrowBack />}
        sx={{
          position: 'fixed',
          top: 16,
          left: 16,
          zIndex: 1000,
          borderRadius: '50px',
          background: 'black',
          boxShadow: '0px 4px 6px rgba(0,0,0,0.1)',
          color: 'white',
          textTransform: 'none',
          px: 2,
          py: 1,
          transition: 'transform 0.2s, box-shadow 0.2s',
          '&:hover': {
            transform: 'scale(1.05)',
            boxShadow: '0px 6px 8px rgba(0,0,0,0.15)',
          
          },
        }}
      >
        Back to Landing Page
      </Button>

      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          backgroundColor: 'black',
        }}
      >
        {/* Left Column - Login Form */}
           <Box
              sx={{
               flex: 1,
               display: 'flex',
               alignItems: 'center',
               justifyContent: 'center',
               background: 'linear-gradient(to bottom, black, #43464d, gray, white)',
               p: { xs: 3, md: 0 },
             }}  
        >
          <Box
            component="form"
            onSubmit={handleSubmit}
            sx={{
              maxWidth: 400,
              width: '100%',
              p: 3,
              borderRadius: 2,
              boxShadow: theme.shadows[5],
              backgroundColor: 'white',
            }}
          >
            <Typography variant="h5" sx={{ textAlign: 'center', mb: 3 }}>
              {BRANDING.title}
            </Typography>

            {/* Email Field */}
            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              fullWidth
              margin="normal"
              error={!!error} // Highlight if there's a general error
              helperText={!!error ? '' : null} // Do not display field-specific error
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Email />
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '&.Mui-focused fieldset': {
                    borderColor: error ? 'red' : 'black',
                  },
                  '& fieldset': {
                    borderColor: error ? 'red' : undefined,
                  },
                },
                '& .MuiInputLabel-root': {
                  color: error ? 'red' : 'gray',
                },
                '& .MuiInputLabel-root.Mui-focused': {
                  color: error ? 'red' : 'black',
                },
              }}
            />

            {/* Password Field */}
            <TextField
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              fullWidth
              margin="normal"
              error={!!error} // Highlight if there's a general error
              helperText={!!error ? '' : null} // Do not display field-specific error
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Lock />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={togglePasswordVisibility} edge="end">
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '&.Mui-focused fieldset': {
                    borderColor: error ? 'red' : 'black',
                  },
                  '& fieldset': {
                    borderColor: error ? 'red' : undefined,
                  },
                },
                '& .MuiInputLabel-root': {
                  color: error ? 'red' : 'gray',
                },
                '& .MuiInputLabel-root.Mui-focused': {
                  color: error ? 'red' : 'black',
                },
              }}
            />

            {/* General Error Alert */}
            {error && (
              <Alert severity="error" sx={{ mt: 2, mb: 2 }}>
                {error}
              </Alert>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              variant="contained"
              fullWidth
              sx={{
                mt: error ? 1 : 2,
                backgroundColor: 'black',
                color: 'white',
                '&:hover': {
                  backgroundColor: '#333',
                },
              }}
            >
              Login
            </Button>
          </Box>
        </Box>

        {/* Right Column - Logo */}
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'black',
            p: { xs: 3, md: 0 },
          }}
        >
          <Box
            sx={{
              maxWidth: { xs: '60%', md: '80%' },
              textAlign: 'center',
            }}
          >
            {BRANDING.logo}
          </Box>
        </Box>
      </Box>
    </AppProvider>
  );
}