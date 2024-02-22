import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import PropTypes from 'prop-types'

import './App.css'
import ListEntities from './components/ListEntities'
import { entities } from './entities'
import { AddEntity } from './components/AddEntity'
import React from 'react'

function App() {
  const queryClient = new QueryClient()
  return (
    <QueryClientProvider client={queryClient}>
      <Layout>
        <Router />
      </Layout>
    </QueryClientProvider>
  )
}

Layout.propTypes = {
  children: PropTypes.object,
}

function Layout({ children }) {
  return <div className="text-slate-700">
    <div>navbar</div>
    <div>{children}</div>
    </div>
}

function Router() {
  return (
    <BrowserRouter>
      <Routes>
        {Object.keys(entities).map((k) => {
          return <React.Fragment key={k}>
            <Route path={`/${k.toLocaleLowerCase()}`} element={<ListEntities name={k} properties={entities[k]} />} />
            <Route path={`/${k.toLocaleLowerCase()}/new`} element={<AddEntity name={k} properties={entities[k]} />} />
          </React.Fragment>
        })}
      </Routes>
    </BrowserRouter>
  )
}

export default App
