import React, { useState } from 'react'
import Sidebar from './Sidebar';
import Header from './Header.jsx';

const AppLayout = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  }

  return (
    <div className="flex min-h-screen bg-slate-100 dark:bg-slate-950 text-neutral-900 dark:text-slate-100 md:pl-64">
      <Sidebar isSidebarOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
      <div className="flex flex-col flex-1 min-h-screen">
        <Header toggleSidebar={toggleSidebar} />
        <main className="flex flex-col flex-1 min-h-0 overflow-hidden bg-slate-50 dark:bg-slate-900 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}

export default AppLayout
