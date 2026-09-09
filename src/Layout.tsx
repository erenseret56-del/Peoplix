import React, { useState } from 'react'
import Navbar from './components/Navbar'
import Sidebar from './components/Sidebar'

interface LayoutProps {
  children: React.ReactNode;
}

function Layout({ children }: LayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-[#FCFAF5] overflow-x-hidden">
      {/* Sidebar - handles its own mobile visibility via props */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {/* Main Content */}
      <div className={`flex-1 flex flex-col transition-all duration-300 min-w-0 ${isSidebarOpen ? '' : 'lg:ml-64 ml-0'}`}>
        <Navbar onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
        <main className="flex-1 overflow-y-auto w-full">
          {children}
        </main>
      </div>

      {/* Persistent margin spacer for desktop when sidebar is fixed */}
      <div className="hidden lg:block w-64 shrink-0"
      style={{display: "none"}}
      />
    </div>
  )
}

export default Layout