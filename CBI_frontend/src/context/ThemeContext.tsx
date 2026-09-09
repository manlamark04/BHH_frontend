import React, { createContext, useContext, useEffect, useState } from 'react'

export type Theme = 'light' | 'dark'

export interface ThemeContextType {
  theme: Theme
  isDarkMode: boolean
  toggleDarkMode: () => void
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export const THEME_STORAGE_KEY = 'cbi_theme'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY)
      if (saved === 'dark' || saved === 'light') return saved
    } catch {
      // fallback
    }
    return 'light'
  })

  const isDarkMode = theme === 'dark'

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
      root.style.colorScheme = 'dark'
    } else {
      root.classList.remove('dark')
      root.style.colorScheme = 'light'
    }

    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme)
    } catch (e) {
      console.warn('Unable to persist theme to localStorage:', e)
    }

    return () => {
      // When leaving the authenticated portal, ensure the public document root returns to fixed light mode
      root.classList.remove('dark')
      root.style.colorScheme = 'light'
    }
  }, [theme])

  const toggleDarkMode = () => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
  }

  return (
    <ThemeContext.Provider value={{ theme, isDarkMode, toggleDarkMode, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

const defaultThemeContext: ThemeContextType = {
  theme: 'light',
  isDarkMode: false,
  toggleDarkMode: () => {},
  setTheme: () => {},
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext)
  return context || defaultThemeContext
}
