import Sidebar from './Sidebar';
import BottomNav from './BottomNav';

export default function Layout({ children }) {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="page-content">
        {children}
      </div>
      <BottomNav />
    </div>
  );
}
