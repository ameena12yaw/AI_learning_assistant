import React from 'react'

const Tabs = ({ tabs = [], activeTab, setActiveTab }) => {
  return (
    <div className="w-full border-b border-slate-200 dark:border-slate-700">
      <nav className="flex flex-wrap gap-6">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`relative pb-3 px-1 text-sm font-semibold transition-colors ${
                isActive
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <span>{tab.label}</span>
              {isActive && (
                <span className="absolute inset-x-0 -bottom-px h-0.5 bg-emerald-500" />
              )}
            </button>
          )
        })}
      </nav>
    </div>
  )
}

export default Tabs