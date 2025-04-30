import React, { useState } from 'react';
import { router } from '@inertiajs/react';
import { AccountCircle, AdminPanelSettings, Work } from '@mui/icons-material';

const LandingPage = () => {
  const [clickCount, setClickCount] = useState(0);
  const [showButtons, setShowButtons] = useState(false);

  const handleLogoClick = () => {
    const newCount = clickCount + 1;
    setClickCount(newCount);
    if (newCount === 5) {
      setShowButtons(true);
    }
  };

  // The parent container sets up a "relative" position,
  // so we can place the background image behind (absolutely)
  // and the main content on top (relatively).
  return (
    <div className="relative flex items-center justify-center h-screen p-4 bg-black">
      {/* 
        Blurred, semi-transparent background image:
        - absolute & inset-0: makes the image fill the entire container
        - object-cover: keeps the image fully covered within the container
        - blur-sm, opacity-50: tailwind classes to blur and reduce opacity
      */}
      <img
        src="/imgs/bgphoto.jpg"
        alt="Background"
        className="absolute inset-0 w-full h-full object-cover blur-sm opacity-50"
      />

      {/*
        The content gets "relative" z-10 to sit above the background image.
      */}
      <div className="relative z-10 text-center">
        {/* Logo */}
        <div className="mb-6">
          <img
            src="/imgs/lg.png"
            alt="Logo"
            className="mx-auto w-100 sm:w-40 md:w-80"
            onClick={handleLogoClick}
          />
        </div>

        {/* Card */}
        <div className="bg-gray-800 text-white rounded-lg shadow-lg p-6 sm:p-8 md:p-10 w-full max-w-2xl">
          {/* Buttons are shown only if showButtons === true */}
          {showButtons && (
            <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-4">
              {/* Log in as Owner Button */}
              <button
                className="w-full sm:w-auto px-6 py-4 bg-white text-black text-lg sm:text-xl font-semibold rounded-lg flex items-center justify-center space-x-3 hover:bg-gray-200 transition duration-300"
                onClick={() => router.visit('/owner/login')}
              >
                <AccountCircle fontSize="large" />
                <span>Log in as Owner</span>
              </button>

              {/* Log in as Admin Button */}
              <button
                className="w-full sm:w-auto px-6 py-4 bg-white text-black text-lg sm:text-xl font-semibold rounded-lg flex items-center justify-center space-x-3 hover:bg-gray-200 transition duration-300"
                onClick={() => router.visit('/admin/login')}
              >
                <AdminPanelSettings fontSize="large" />
                <span>Log in as Manager</span>
              </button>

              {/* Log in as Staff Button */}
              <button
                className="w-full sm:w-auto px-6 py-4 bg-white text-black text-lg sm:text-xl font-semibold rounded-lg flex items-center justify-center space-x-3 hover:bg-gray-200 transition duration-300"
                onClick={() => router.visit('/staff/login')}
              >
                <Work fontSize="large" />
                <span>Log in as Staff</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
