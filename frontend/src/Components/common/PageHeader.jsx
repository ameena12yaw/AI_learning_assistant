import React from 'react'

const PageHeader = ({title,subtitle,children}) => {
  return (
    <div>
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{subtitle}</p>}
        <p className='text-slate-500 dark:text-slate-400'>
          {children}

        </p>
      </div>
    </div>
  )
}

export default PageHeader