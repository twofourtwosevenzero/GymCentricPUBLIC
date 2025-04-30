import React, { useState, useEffect } from 'react';
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
import { Email, Lock, Visibility, VisibilityOff } from '@mui/icons-material';

const BRANDING = {
  logo: (
    <img
      src="/imgs/lg.png"
      alt="Logo"
      style={{ maxWidth: '100%', height: 'auto' }}
    />
  ),
  // title: 'Member Login',
};

const SLIDES = [
  '/imgs/slide1.jpg',
  '/imgs/slide2.jpg',
  '/imgs/slide3.jpg',
  '/imgs/slide4.jpg',
  '/imgs/slide5.jpg',
];

export default function MemberLogin() {
  const theme = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  // track current + previous slide indices
  const [currentSlide, setCurrentSlide] = useState(0);
  const [prevSlide, setPrevSlide] = useState(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const fadeDuration = 800; // ms

  // advance slides every 3s
  useEffect(() => {
    const timer = setInterval(() => {
      setPrevSlide(currentSlide);
      setCurrentSlide((currentSlide + 1) % SLIDES.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [currentSlide]);

  // trigger cross‑fade whenever prevSlide is set
  useEffect(() => {
    if (prevSlide === null) return;

    setIsTransitioning(false);
    // next tick: start fade
    const fadeIn = setTimeout(() => setIsTransitioning(true), 0);
    // cleanup after fadeDuration
    const cleanup = setTimeout(() => setPrevSlide(null), fadeDuration);

    return () => {
      clearTimeout(fadeIn);
      clearTimeout(cleanup);
    };
  }, [prevSlide]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await axios.post('/member/login', { email, password });
      if (res.data.success) {
        window.location.href = res.data.redirect;
      }
    } catch (err) {
      if (err.response?.status === 422) {
        setError(err.response.data.errors.general);
      } else {
        setError('Something went wrong. Please try again.');
      }
    }
  };

  const togglePasswordVisibility = () => setShowPassword((v) => !v);

  // compute layer opacities
  const prevOpacity = isTransitioning ? 0 : 1;
  const currOpacity = prevSlide !== null ? (isTransitioning ? 1 : 0) : 1;

  return (
    <AppProvider branding={BRANDING} theme={theme}>
      <Box
        sx={{
          position: 'relative',
          minHeight: '100vh',
          overflow: 'hidden',
        }}
      >
        {/* previous slide */}
        {prevSlide !== null && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              backgroundImage: `url(${SLIDES[prevSlide]})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              opacity: prevOpacity,
              transition: `opacity ${fadeDuration}ms ease-in-out`,
              zIndex: 1,
            }}
          />
        )}

        {/* current slide */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url(${SLIDES[currentSlide]})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: currOpacity,
            transition: `opacity ${fadeDuration}ms ease-in-out`,
            zIndex: 0,
          }}
        />

        {/* login form */}
        <Box
          component="form"
          onSubmit={handleSubmit}
          sx={{
            position: 'absolute',
            bottom: { xs: '10%', sm: '15%' },
            left: '50%',
            transform: 'translateX(-50%)',
            width: { xs: '90%', sm: 400 },
            p: 3,
            borderRadius: 2,
            boxShadow: theme.shadows[5],
            background: 'rgba(255,255,255,0.85)',
            backdropFilter: 'blur(6px)',
            zIndex: 2,
          }}
        >
          {BRANDING.title && (
            <Typography variant="h5" sx={{ textAlign: 'center', mb: 2 }}>
              {BRANDING.title}
            </Typography>
          )}

          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            fullWidth
            margin="normal"
            error={!!error}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Email />
                </InputAdornment>
              ),
            }}
          />

          <TextField
            label="Password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            fullWidth
            margin="normal"
            error={!!error}
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
          />

          {error && (
            <Alert severity="error" sx={{ mt: 2, mb: 1 }}>
              {error}
            </Alert>
          )}

          <Button
            type="submit"
            variant="contained"
            fullWidth
            sx={{
              mt: error ? 1 : 2,
              backgroundColor: 'black',
              color: 'white',
              '&:hover': { backgroundColor: '#333' },
            }}
          >
            LOGIN
          </Button>
        </Box>
      </Box>
    </AppProvider>
  );
}
