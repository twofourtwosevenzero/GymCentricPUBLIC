import React from 'react';
import { useTheme } from '@mui/material/styles';
import PropTypes from 'prop-types';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { createTheme } from '@mui/material/styles';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import PaymentsIcon from '@mui/icons-material/Payments';
import HistoryIcon from '@mui/icons-material/History';
import EventNoteIcon from '@mui/icons-material/CalendarMonth';
import LockIcon from '@mui/icons-material/Lock';
import NotificationsIcon from '@mui/icons-material/NotificationsActive';
import BuildIcon from '@mui/icons-material/FitnessCenter';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import BarChartIcon from '@mui/icons-material/BarChart';
import Diversity3Icon from '@mui/icons-material/Diversity3';
import LogoutIcon from '@mui/icons-material/Logout';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import { AppProvider } from '@toolpad/core/AppProvider';
import { DashboardLayout } from '@toolpad/core/DashboardLayout';
import ApartmentIcon from '@mui/icons-material/Apartment';
import axios from 'axios';
import { Inertia } from '@inertiajs/inertia';


import DashboardContent from './DashboardContent';
import MembershipManagement from './MembershipManagement';
import StaffManagement from './StaffManagement';
import BranchManagement from './BranchManagement';
import Payments from './Payments';
import BookingsSessions from './BookingsSessions';
import LockerManagement from './LockerManagement';
import Notifications from './Notifications';
import MaintenanceEquip from './MaintenanceEquip';
import Promotions from './Promotions';
import SystemLogs from './SystemLogs';
import Reports from './Reports';
import EditAccount from './EditAccount';

// Navigation items
const NAVIGATION = [
  { segment: 'dashboard', title: 'Dashboard', icon: <DashboardIcon /> },
  { segment: 'notifications', title: 'Notifications', icon: <NotificationsIcon /> },
  { segment: 'membership-management', title: 'Membership Management', icon: <PeopleIcon /> },
  { segment: 'staff-management', title: 'Staff Management', icon: <Diversity3Icon /> },
  { segment: 'payments', title: 'Payments & Invoices', icon: <PaymentsIcon /> },
  { segment: 'bookingsessions', title: 'Bookings & Sessions', icon: <EventNoteIcon /> },
  { segment: 'lockermanagement', title: 'Locker Management', icon: <LockIcon /> },
  { segment: 'maintequip', title: 'Maintenance & Equipment', icon: <BuildIcon /> },
  { segment: 'branch-management', title: 'Branch Management', icon: <ApartmentIcon /> },
  { segment: 'reports', title: 'Reports & Analytics', icon: <BarChartIcon /> },
  { segment: 'system-logs', title: 'System Logs', icon: <HistoryIcon /> },
  { segment: 'editaccount', title: 'Edit Account', icon: <ManageAccountsIcon /> },
];



const demoTheme = createTheme({
  cssVariables: {
    colorSchemeSelector: 'data-toolpad-color-scheme',
  },
  colorSchemes: { light: true, dark: true },
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 600,
      lg: 1200,
      xl: 1536,
    },
  },
});

function DemoPageContent({ pathname }) {
  const renderContent = () => {
    switch (pathname) {
      case '/membership-management':
        return <MembershipManagement />;
      case '/staff-management':
        return <StaffManagement />;
      case '/branch-management':
        return <BranchManagement />;
      case '/payments':
        return <Payments />;
      case '/bookingsessions':
        return <BookingsSessions />;
      case '/lockermanagement':
        return <LockerManagement />;
      case '/notifications':
        return <Notifications />;
      case '/maintequip':
        return <MaintenanceEquip />;
      case '/promo':
        return <Promotions />;
      case '/system-logs':
        return <SystemLogs />;
      case '/reports':
        return <Reports />;
      case '/editaccount':
        return <EditAccount />;
      default:
        return <DashboardContent />;
    }
  };

  return (
    <Box
      sx={{
        py: 4,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {renderContent()}
    </Box>
  );
}

DemoPageContent.propTypes = {
  pathname: PropTypes.string.isRequired,
};

function CustomAppTitle() {
  const theme = useTheme();
  const logoSrc = theme.palette.mode === 'light' 
    ? '/imgs/lg.png' // For light mode
    : '/imgs/lg.png'; // For dark mode

  return (
    <Stack direction="row" alignItems="center" spacing={2}>
      <img
        src={logoSrc}
        alt="Logo"
        style={{ height: '40px', width: 'auto' }}
      />
      <Typography variant="h6">GymCentric</Typography>
    </Stack>
  );
}
function SidebarFooter({ onLogout }) {
  return (
    <Box
      sx={{
        mt: 'auto', // Push to the bottom of the sidebar
        px: 2,
        pb: 2,
      }}
    >
      <Box
        onClick={onLogout}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'transparent',
          color: 'inherit',
          cursor: 'pointer',
          borderRadius: '4px',
          width: '100%',
          padding: '8px',
          textAlign: 'center',
          transition: 'background-color 0.3s, color 0.3s',
          '&:hover': {
            backgroundColor: 'transparent',
            color: '#f94449', // Red on hover
          },
          overflow: 'hidden',
        }}
      >
        <LogoutIcon sx={{ mr: 1 }} />
        <Typography variant="body2" noWrap>
          Logout
        </Typography>
      </Box>
    </Box>
  );
}

SidebarFooter.propTypes = {
  onLogout: PropTypes.func.isRequired,
};
function DashboardLayoutSlots(props) {
  const { window } = props;

  const [pathname, setPathname] = React.useState('/dashboard');
  const router = React.useMemo(
    () => ({
      pathname,
      searchParams: new URLSearchParams(), // Explicitly define searchParams
      navigate: (path) => setPathname(String(path)),
    }),
    [pathname]
  );

  const handleLogout = async () => {
    try {
      await axios.post('/owner/logout', {}, { withCredentials: true });
      globalThis.location.href = '/';
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };
  
  

  return (
    <AppProvider
      navigation={NAVIGATION}
      router={router}
      theme={demoTheme}
      window={window}
    >
      <DashboardLayout
        slots={{
          appTitle: CustomAppTitle,
          sidebarFooter: () => <SidebarFooter onLogout={handleLogout} />,
        }}
      >
        <DemoPageContent pathname={router.pathname} />
      </DashboardLayout>
    </AppProvider>
  );
}


DashboardLayoutSlots.propTypes = {
  window: PropTypes.func,
};

export default DashboardLayoutSlots;
