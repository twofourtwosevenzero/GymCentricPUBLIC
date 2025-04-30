function OwnerLayout({ children }) {
    return (
      <div>
        <nav>Owner Nav, e.g. links to staff management</nav>
        <main>{children}</main>
      </div>
    );
  }
  
  // Then inside Owner/Dashboard.jsx:
  import OwnerLayout from '@/Layouts/OwnerLayout';
  
  export default function Dashboard() {
    return (
      <OwnerLayout>
        <h1>Owner Dashboard</h1>
        ...
      </OwnerLayout>
    );
  }
  