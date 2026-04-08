import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Sidebar } from '@/components/sidebar'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'MMG Homebase',
  description: 'MMG Studio Financial Dashboard',
  appleWebApp: {
    capable: true,
    title: 'MMG Homebase',
    statusBarStyle: 'black-translucent',
  },
  icons: {
    icon: '/MMG-icon.png',
    apple: '/MMG-icon.png',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased`}>
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-y-auto bg-[var(--background)]">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
